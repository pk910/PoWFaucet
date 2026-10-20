import * as fs from 'fs';
import YAML from 'yaml'
import { ServiceManager } from "../../common/ServiceManager.js";
import { FaucetSession } from "../../session/FaucetSession.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { FaucetError } from '../../common/FaucetError.js';
import { defaultConfig, IIPInfoConfig, IIPInfoRestrictionConfig } from "./IPInfoConfig.js";
import { IIPInfo, IPInfoResolver } from "./IPInfoResolver.js";
import { resolveRelativePath } from "../../config/FaucetConfig.js";
import { ISessionRewardFactor } from '../../session/SessionRewardFactor.js';
import { IPInfoDB } from './IPInfoDB.js';
import { FaucetDatabase } from '../../db/FaucetDatabase.js';
import { FaucetLogLevel, FaucetProcess } from '../../common/FaucetProcess.js';

export interface IIPInfoRestriction {
  reward: number;
  messages: {
    key: string;
    text: string;
    notify: boolean|string;
  }[];
  blocked: false|"close"|"kill";
  hostingBased: boolean;
  proxyBased: boolean;
}

/** what the session's first ip looked like, the reference for the ip change rules */
interface IIPInfoRef {
  ip: string;
  countryCode: string;
  as: string;
}

type IPChangeKind = "ip" | "asn" | "country";

export class IPInfoModule extends BaseModule<IIPInfoConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  private ipInfoDb: IPInfoDB;
  private ipInfoResolver: IPInfoResolver;
  private ipInfoMatchRestrictions: [pattern: string, restriction: number | IIPInfoRestrictionConfig][];
  private ipInfoMatchRestrictionsRefresh: number;
  private sessionRewardFactorCacheTimeout: number = 30;

  protected override async startModule(): Promise<void> {
    this.ipInfoDb = await ServiceManager.GetService(FaucetDatabase).createModuleDb(IPInfoDB, this);
    this.ipInfoResolver = new IPInfoResolver(this.ipInfoDb, this.moduleConfig.apiUrl);
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionStart, 7, "IP Info check", 
      (session: FaucetSession) => this.processSessionStart(session)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionIpChange, 6, "IP Info check", 
      (session: FaucetSession) => this.processSessionIpChange(session)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionRewardFactor, 6, "IP restrictions", 
      (session: FaucetSession, rewardFactors: ISessionRewardFactor[]) => this.processSessionRewardFactor(session, rewardFactors)
    );
  }

  protected override stopModule(): Promise<void> {
    this.ipInfoDb.dispose();
    this.ipInfoResolver.dispose();
    return Promise.resolve();
  }

  protected override onConfigReload(): void {
    this.ipInfoResolver.setApi(this.moduleConfig.apiUrl);
    this.ipInfoMatchRestrictionsRefresh = 0;
  }

  private async processSessionStart(session: FaucetSession): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    let ipInfo = await this.resolveSessionIpInfo(session);
    if(!session.getSessionData("ipinfo.first"))
      session.setSessionData("ipinfo.first", this.getIpInfoRef(session.getRemoteIP(), ipInfo));
    this.checkSessionRestriction(session);
  }

  /**
   * A mining client reconnected from another ip. The ip change rules compare the new ip with the one
   * the session started from and decide the session's fate (kill, close, or a reward factor the session
   * keeps); the ordinary rules then decide whether the new ip may connect at all.
   */
  private async processSessionIpChange(session: FaucetSession): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    let firstInfo = session.getSessionData<IIPInfoRef>("ipinfo.first");
    if(!firstInfo) {
      // the session started before its first ip was recorded; the previous lookup is the best reference left
      firstInfo = this.getIpInfoRef(null, session.getSessionData("ipinfo.data"));
      session.setSessionData("ipinfo.first", firstInfo);
    }
    let ipInfo = await this.resolveSessionIpInfo(session);
    this.trackIpChange(session, firstInfo, ipInfo);

    let changeRestriction = this.getIpChangeRestriction(session);
    if(changeRestriction.blocked) {
      let blockReason = "IP Blocked: " + changeRestriction.messages.map((msg) => msg.text).join(", ");
      if(changeRestriction.blocked === "kill")
        await session.setSessionFailed("IPINFO_RESTRICTION", blockReason);
      else
        await session.completeSession();
      throw new FaucetError("IPINFO_RESTRICTION", blockReason);
    }
    this.checkSessionRestriction(session);
  }

  private async resolveSessionIpInfo(session: FaucetSession): Promise<IIPInfo> {
    let remoteIp = session.getRemoteIP();
    let ipInfo: IIPInfo;
    try {
      ipInfo = await this.ipInfoResolver.getIpInfo(remoteIp);
      if(ipInfo.status !== "success" && this.moduleConfig.required)
        throw new FaucetError("INVALID_IPINFO", "Error while checking your IP: " + ipInfo.status);
    } catch(ex) {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Error while fetching IP-Info for " + remoteIp + ": " + ex.toString());
      if(this.moduleConfig.required)
        throw new FaucetError("INVALID_IPINFO", "Error while checking your IP: " + ex.toString());
    }

    let overrideHosting = session.getSessionData<boolean>("ipinfo.override_hosting", undefined);
    if(overrideHosting !== undefined) {
      ipInfo.hosting = overrideHosting;
    }

    let overrideProxy = session.getSessionData<boolean>("ipinfo.override_proxy", undefined);
    if(overrideProxy !== undefined) {
      ipInfo.proxy = overrideProxy;
    }

    session.setSessionData("ipinfo.data", ipInfo);
    return ipInfo;
  }

  private checkSessionRestriction(session: FaucetSession) {
    let sessionRestriction = this.getSessionRestriction(session);
    if(sessionRestriction.blocked) {
      let err = new FaucetError("IPINFO_RESTRICTION", "IP Blocked: " + sessionRestriction.messages.map((msg) => msg.text).join(", "));
      if(sessionRestriction.hostingBased || sessionRestriction.proxyBased) {
        err.data = { 
          "address": session.getTargetAddr(),
          "ipflags": [ sessionRestriction.hostingBased, sessionRestriction.proxyBased ],
        };
      }
      throw err;
    }
    session.setSessionModuleRef("ipinfo.restriction.time", Math.floor((new Date()).getTime() / 1000));
    session.setSessionModuleRef("ipinfo.restriction.data", sessionRestriction);
  }

  private getIpInfoRef(ip: string, ipInfo: IIPInfo): IIPInfoRef {
    return {
      ip: ip,
      countryCode: ipInfo?.countryCode || null,
      as: ipInfo?.as || null,
    };
  }

  private getAsNumber(as: string): string {
    // ip-api style "AS15169 Google LLC"
    return as ? as.split(" ")[0] : null;
  }

  private trackIpChange(session: FaucetSession, firstInfo: IIPInfoRef, ipInfo: IIPInfo) {
    let changed = session.getSessionData<IPChangeKind[]>("ipinfo.changed", []).slice();
    let markChanged = (kind: IPChangeKind) => {
      if(changed.indexOf(kind) === -1)
        changed.push(kind);
    };
    markChanged("ip");
    if(firstInfo.countryCode && ipInfo?.countryCode && ipInfo.countryCode !== firstInfo.countryCode)
      markChanged("country");
    if(firstInfo.as && ipInfo?.as && this.getAsNumber(ipInfo.as) !== this.getAsNumber(firstInfo.as))
      markChanged("asn");
    session.setSessionData("ipinfo.changed", changed);
    session.setSessionData("ipinfo.changes", session.getSessionData<number>("ipinfo.changes", 0) + 1);
  }

  private async processSessionRewardFactor(session: FaucetSession, rewardFactors: ISessionRewardFactor[]) {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    let refreshTime = session.getSessionModuleRef("ipinfo.restriction.time") || 0;
    let now = Math.floor((new Date()).getTime() / 1000);
    let sessionRestriction: IIPInfoRestriction;
    if(now - refreshTime > this.sessionRewardFactorCacheTimeout) {
      sessionRestriction = this.getSessionRestriction(session);
      session.setSessionModuleRef("ipinfo.restriction.time", Math.floor((new Date()).getTime() / 1000));
      session.setSessionModuleRef("ipinfo.restriction.data", sessionRestriction);
      if(sessionRestriction.blocked) {
        let blockReason = "IP Blocked: " + sessionRestriction.messages.map((msg) => msg.text).join(", ");
        if(sessionRestriction.blocked == "kill") {
          await session.setSessionFailed("RESTRICTION", blockReason);
        } else {
          await session.completeSession();
        }
        return;
      }
    }
    else
      sessionRestriction = session.getSessionModuleRef("ipinfo.restriction.data");
    
    if(sessionRestriction.reward !== 100) {
      rewardFactors.push({
        factor: sessionRestriction.reward / 100,
        module: this.moduleName,
      });
    }
  }

  private getIPInfoString(session: FaucetSession, ipinfo: IIPInfo) {
    let infoStr = [
      "ETH: " + session.getTargetAddr(),
      "IP: " + session.getRemoteIP(),
      "Ident: " + (session.getSessionData("captcha.ident") || ""),
      "IpChanges: " + session.getSessionData<number>("ipinfo.changes", 0),
      "IpChanged: " + session.getSessionData<IPChangeKind[]>("ipinfo.changed", []).join(" "),
      "FirstCountry: " + (session.getSessionData<IIPInfoRef>("ipinfo.first")?.countryCode || ""),
    ];
    if(ipinfo) {
      infoStr.push(
        "Country: " + ipinfo.countryCode,
        "Region: " + ipinfo.regionCode,
        "City: " + ipinfo.city,
        "ISP: " + ipinfo.isp,
        "Org: " + ipinfo.org,
        "AS: " + ipinfo.as,
        "Proxy: " + (ipinfo.proxy ? "true" : "false"),
        "Hosting: " + (ipinfo.hosting ? "true" : "false")
      );
    }
    return infoStr.join("\n");
  }

  public refreshIpInfoMatchRestrictions(force?: boolean) {
    let now = Math.floor((new Date()).getTime() / 1000);
    let refresh = this.moduleConfig.restrictionsFile ? this.moduleConfig.restrictionsFile.refresh : 30;
    if(this.ipInfoMatchRestrictionsRefresh > now - refresh && !force)
      return;
    
    this.ipInfoMatchRestrictionsRefresh = now;
    this.ipInfoMatchRestrictions = [];
    Object.keys(this.moduleConfig.restrictionsPattern).forEach((pattern) => {
      this.ipInfoMatchRestrictions.push([pattern, this.moduleConfig.restrictionsPattern[pattern]]);
    });
    
    if(this.moduleConfig.restrictionsFile && this.moduleConfig.restrictionsFile.file && fs.existsSync(resolveRelativePath(this.moduleConfig.restrictionsFile.file))) {
      // load restrictions list
      fs.readFileSync(this.moduleConfig.restrictionsFile.file, "utf8").split(/\r?\n/).forEach((line) => {
        let match = /^([0-9]{1,2}): (.*)$/.exec(line);
        if(!match)
          return;
        this.ipInfoMatchRestrictions.push([match[2], parseInt(match[1])]);
      });
    }
    if(this.moduleConfig.restrictionsFile && this.moduleConfig.restrictionsFile.yaml) {
      // load yaml file
      if(Array.isArray(this.moduleConfig.restrictionsFile.yaml))
      this.moduleConfig.restrictionsFile.yaml.forEach((file) => this.refreshIpInfoMatchRestrictionsFromYaml(resolveRelativePath(file)));
      else
        this.refreshIpInfoMatchRestrictionsFromYaml(resolveRelativePath(this.moduleConfig.restrictionsFile.yaml));
    }
  }

  private refreshIpInfoMatchRestrictionsFromYaml(yamlFile: string) {
    if(!fs.existsSync(yamlFile))
      return;
    
    let yamlSrc = fs.readFileSync(yamlFile, "utf8");
    let yamlObj = YAML.parse(yamlSrc);

    if(Array.isArray(yamlObj.restrictions)) {
      yamlObj.restrictions.forEach((entry) => {
        let pattern = entry.pattern;
        delete entry.pattern;
        this.ipInfoMatchRestrictions.push([pattern, entry]);
      })
    }
  }

  private wrapFactorRestriction(restriction: number | IIPInfoRestrictionConfig): IIPInfoRestrictionConfig {
    if(typeof restriction === "number") {
      return {
        reward: restriction,
      };
    }
    return restriction;
  }

  /** an empty restriction and the function that merges further restrictions into it (lowest reward, strongest block, messages once per key) */
  private createRestrictionCollector(): {restriction: IIPInfoRestriction, apply: (restr: number | IIPInfoRestrictionConfig) => void} {
    let restriction: IIPInfoRestriction = {
      reward: 100,
      messages: [],
      blocked: false,
      hostingBased: false,
      proxyBased: false,
    };
    let msgKeyDict = {};

    let apply = (restr: number | IIPInfoRestrictionConfig) => {
      restr = this.wrapFactorRestriction(restr);
      if(restr.reward < restriction.reward)
        restriction.reward = restr.reward;
      if(restr.blocked) {
        if(restr.blocked === "close" && !restriction.blocked)
          restriction.blocked = restr.blocked;
        else if(restr.blocked === "kill")
          restriction.blocked = restr.blocked;
        else if(restr.blocked === true && !restriction.blocked)
          restriction.blocked = "close";
      }
      if(restr.message && (!restr.msgkey || !msgKeyDict.hasOwnProperty(restr.msgkey))) {
        if(restr.msgkey)
          msgKeyDict[restr.msgkey] = true;
        restriction.messages.push({
          text: restr.message,
          notify: restr.notify,
          key: restr.msgkey,
        });
      }
    };

    return {restriction, apply};
  }

  /** the restrictions configured for the kinds of ip change the session has seen so far */
  private applyIpChangeRestrictions(session: FaucetSession, applyRestriction: (restr: number | IIPInfoRestrictionConfig) => void) {
    let changeRestrictions = this.moduleConfig.ipChangeRestrictions;
    if(!changeRestrictions)
      return;
    session.getSessionData<IPChangeKind[]>("ipinfo.changed", []).forEach((kind) => {
      if(typeof changeRestrictions[kind] !== "undefined" && changeRestrictions[kind] !== null)
        applyRestriction(changeRestrictions[kind]);
    });
  }

  private getIpChangeRestriction(session: FaucetSession): IIPInfoRestriction {
    let collector = this.createRestrictionCollector();
    this.applyIpChangeRestrictions(session, collector.apply);
    return collector.restriction;
  }

  private getSessionRestriction(session: FaucetSession): IIPInfoRestriction {
    let collector = this.createRestrictionCollector();
    let restriction = collector.restriction;
    let applyRestriction = collector.apply;
    let sessionIpInfo: IIPInfo = session.getSessionData("ipinfo.data");

    if(sessionIpInfo && this.moduleConfig.restrictions) {
      if(sessionIpInfo.hosting && this.moduleConfig.restrictions.hosting) {
        applyRestriction(this.moduleConfig.restrictions.hosting);
        restriction.hostingBased = true;
      }
      if(sessionIpInfo.proxy && this.moduleConfig.restrictions.proxy) {
        applyRestriction(this.moduleConfig.restrictions.proxy);
        restriction.proxyBased = true;
      }
      if(sessionIpInfo.countryCode && typeof this.moduleConfig.restrictions[sessionIpInfo.countryCode] !== "undefined")
        applyRestriction(this.moduleConfig.restrictions[sessionIpInfo.countryCode]);
    }

    if(this.moduleConfig.restrictionsPattern || this.moduleConfig.restrictionsFile) {
      this.refreshIpInfoMatchRestrictions();
      let infoStr = this.getIPInfoString(session, sessionIpInfo);
      this.ipInfoMatchRestrictions.forEach((entry) => {
        if(infoStr.match(new RegExp(entry[0], "mi"))) {
          applyRestriction(entry[1]);
        }
      });
    }
    
    this.applyIpChangeRestrictions(session, applyRestriction);

    return restriction;
  }


}
