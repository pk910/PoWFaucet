import * as fs from 'fs';
import YAML from 'yaml'
import { ServiceManager } from "../../common/ServiceManager";
import { FaucetSession } from "../../session/FaucetSession";
import { BaseModule } from "../BaseModule";
import { ModuleHookAction } from "../ModuleManager";
import { FaucetError } from '../../common/FaucetError';
import { IIPInfoConfig, IIPInfoRestrictionConfig } from "./IPInfoConfig";
import { IIPInfo, IPInfoResolver } from "./IPInfoResolver";
import { resolveRelativePath } from "../../config/FaucetConfig";
import { ISessionRewardFactor } from '../../session/SessionRewardFactor';
import { IPInfoDB } from './IPInfoDB';
import { FaucetDatabase } from '../../db/FaucetDatabase';

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
  private ipInfoDb: IPInfoDB;
  private ipInfoResolver: IPInfoResolver;
  private ipInfoMatchRestrictions: [pattern: string, restriction: number | IIPInfoRestrictionConfig][];
  private ipInfoMatchRestrictionsRefresh: number;

  protected override startModule(): void {
    this.ipInfoDb = ServiceManager.GetService(FaucetDatabase).createModuleDb(IPInfoDB, this);
    this.ipInfoResolver = new IPInfoResolver(this.ipInfoDb, this.moduleConfig.ipInfoApi);
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

  protected override stopModule(): void {
    this.ipInfoDb.dispose();
  }

  protected override onConfigReload(): void {
    this.ipInfoResolver.setApi(this.moduleConfig.ipInfoApi);
    this.ipInfoMatchRestrictionsRefresh = 0;
  }

  private async processSessionStart(session: FaucetSession): Promise<void> {
    let remoteIp = session.getRemoteIP();
    let ipInfo: IIPInfo;
    try {
      ipInfo = await this.ipInfoResolver.getIpInfo(remoteIp);
      if(ipInfo.status !== "success" && this.moduleConfig.ipInfoRequired)
        throw new FaucetError("INVALID_IPINFO", "Error while checking your IP: " + ipInfo.status);
    } catch(ex) {
      if(this.moduleConfig.ipInfoRequired)
        throw new FaucetError("INVALID_IPINFO", "Error while checking your IP: " + ex.toString());
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
    let refresh = this.moduleConfig.ipInfoMatchRestrictedRewardFile ? this.moduleConfig.ipInfoMatchRestrictedRewardFile.refresh : 30;
    if(this.ipInfoMatchRestrictionsRefresh > now - refresh && !force)
      return;
    
    this.ipInfoMatchRestrictionsRefresh = now;
    this.ipInfoMatchRestrictions = [];
    Object.keys(this.moduleConfig.ipInfoMatchRestrictedReward).forEach((pattern) => {
      this.ipInfoMatchRestrictions.push([pattern, this.moduleConfig.ipInfoMatchRestrictedReward[pattern]]);
    });
    
    if(this.moduleConfig.ipInfoMatchRestrictedRewardFile && this.moduleConfig.ipInfoMatchRestrictedRewardFile.file && fs.existsSync(resolveRelativePath(this.moduleConfig.ipInfoMatchRestrictedRewardFile.file))) {
      // load restrictions list
      fs.readFileSync(this.moduleConfig.ipInfoMatchRestrictedRewardFile.file, "utf8").split(/\r?\n/).forEach((line) => {
        let match = /^([0-9]{1,2}): (.*)$/.exec(line);
        if(!match)
          return;
        this.ipInfoMatchRestrictions.push([match[2], parseInt(match[1])]);
      });
    }
    if(this.moduleConfig.ipInfoMatchRestrictedRewardFile && this.moduleConfig.ipInfoMatchRestrictedRewardFile.yaml) {
      // load yaml file
      if(Array.isArray(this.moduleConfig.ipInfoMatchRestrictedRewardFile.yaml))
      this.moduleConfig.ipInfoMatchRestrictedRewardFile.yaml.forEach((file) => this.refreshIpInfoMatchRestrictionsFromYaml(resolveRelativePath(file)));
      else
        this.refreshIpInfoMatchRestrictionsFromYaml(resolveRelativePath(this.moduleConfig.ipInfoMatchRestrictedRewardFile.yaml));
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

  public getSessionRestriction(session: FaucetSession): IIPInfoRestriction {
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

    if(sessionIpInfo && this.moduleConfig.ipRestrictedRewardShare) {
      if(sessionIpInfo.hosting && this.moduleConfig.ipRestrictedRewardShare.hosting)
        applyRestriction(this.moduleConfig.ipRestrictedRewardShare.hosting);
      if(sessionIpInfo.proxy && this.moduleConfig.ipRestrictedRewardShare.proxy)
        applyRestriction(this.moduleConfig.ipRestrictedRewardShare.proxy);
      if(sessionIpInfo.countryCode && typeof this.moduleConfig.ipRestrictedRewardShare[sessionIpInfo.countryCode] !== "undefined")
        applyRestriction(this.moduleConfig.ipRestrictedRewardShare[sessionIpInfo.countryCode]);
    }

    if(this.moduleConfig.ipInfoMatchRestrictedReward || this.moduleConfig.ipInfoMatchRestrictedRewardFile) {
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
