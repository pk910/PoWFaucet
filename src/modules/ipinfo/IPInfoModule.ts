import * as fs from 'fs';
import YAML from 'yaml'
import { ServiceManager } from "../../common/ServiceManager";
import { FaucetSession } from "../../session/FaucetSession";
import { BaseModule } from "../BaseModule";
import { ModuleHookAction } from "../ModuleManager";
import { FaucetError } from '../../common/FaucetError';
import { defaultConfig, IIPInfoConfig, IIPInfoRestrictionConfig } from "./IPInfoConfig";
import { IIPInfo, IPInfoResolver } from "./IPInfoResolver";
import { resolveRelativePath } from "../../config/FaucetConfig";
import { ISessionRewardFactor } from '../../session/SessionRewardFactor';
import { IPInfoDB } from './IPInfoDB';
import { FaucetDatabase } from '../../db/FaucetDatabase';
import { FaucetLogLevel, FaucetProcess } from '../../common/FaucetProcess';

export interface IIPInfoRestriction {
  reward: number;
  messages: {
    key: string;
    text: string;
    notify: boolean|string;
  }[];
  blocked: false|"close"|"kill";
}

export class IPInfoModule extends BaseModule<IIPInfoConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  private ipInfoDb: IPInfoDB;
  private ipInfoResolver: IPInfoResolver;
  private ipInfoMatchRestrictions: [pattern: string, restriction: number | IIPInfoRestrictionConfig][];
  private ipInfoMatchRestrictionsRefresh: number;

  protected override async startModule(): Promise<void> {
    this.ipInfoDb = await ServiceManager.GetService(FaucetDatabase).createModuleDb(IPInfoDB, this);
    this.ipInfoResolver = new IPInfoResolver(this.ipInfoDb, this.moduleConfig.apiUrl);
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionStart, 6, "IP Info check", 
      (session: FaucetSession) => this.processSessionStart(session)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionIpChange, 6, "IP Info check", 
      (session: FaucetSession) => this.processSessionStart(session)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionRewardFactor, 6, "IP restrictions", 
      (session: FaucetSession, rewardFactors: ISessionRewardFactor[]) => this.processSessionRewardFactor(session, rewardFactors)
    );
  }

  protected override stopModule(): Promise<void> {
    this.ipInfoDb.dispose();
    return Promise.resolve();
  }

  protected override onConfigReload(): void {
    this.ipInfoResolver.setApi(this.moduleConfig.apiUrl);
    this.ipInfoMatchRestrictionsRefresh = 0;
  }

  private async processSessionStart(session: FaucetSession): Promise<void> {
    let remoteIp = session.getRemoteIP();
    let ipInfo: IIPInfo;
    try {
      ipInfo = await this.ipInfoResolver.getIpInfo(remoteIp);
      if(ipInfo.status !== "success" && this.moduleConfig.required)
        throw new FaucetError("INVALID_IPINFO", "Error while checking your IP: " + ipInfo.status);
    } catch(ex) {
      if(this.moduleConfig.required)
        throw new FaucetError("INVALID_IPINFO", "Error while checking your IP: " + ex.toString());
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Error while fetching IP-Info for " + remoteIp + ": " + ex.toString());
    }
    session.setSessionData("ipinfo.data", ipInfo);

    let sessionRestriction = this.getSessionRestriction(session);
    if(sessionRestriction.blocked) {
      throw new FaucetError("IPINFO_RESTRICTION", "IP Blocked: " + sessionRestriction.messages.map((msg) => msg.text).join(", "));
    }
    session.setSessionModuleRef("ipinfo.restriction.time", Math.floor((new Date()).getTime() / 1000));
    session.setSessionModuleRef("ipinfo.restriction.data", sessionRestriction);
  }

  private async processSessionRewardFactor(session: FaucetSession, rewardFactors: ISessionRewardFactor[]) {
    let refreshTime = session.getSessionModuleRef("ipinfo.restriction.time") || 0;
    let now = Math.floor((new Date()).getTime() / 1000);
    let sessionRestriction: IIPInfoRestriction;
    if(now - refreshTime > 30) {
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

  private getSessionRestriction(session: FaucetSession): IIPInfoRestriction {
    let restriction: IIPInfoRestriction = {
      reward: 100,
      messages: [],
      blocked: false,
    };
    let msgKeyDict = {};
    let sessionIpInfo: IIPInfo = session.getSessionData("ipinfo.data");

    let applyRestriction = (restr: number | IIPInfoRestrictionConfig) => {
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

    if(sessionIpInfo && this.moduleConfig.restrictions) {
      if(sessionIpInfo.hosting && this.moduleConfig.restrictions.hosting)
        applyRestriction(this.moduleConfig.restrictions.hosting);
      if(sessionIpInfo.proxy && this.moduleConfig.restrictions.proxy)
        applyRestriction(this.moduleConfig.restrictions.proxy);
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
    
    return restriction;
  }


}
