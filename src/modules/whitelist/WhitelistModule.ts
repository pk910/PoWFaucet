import * as fs from 'fs';
import YAML from 'yaml'
import { FaucetSession } from "../../session/FaucetSession.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { defaultConfig, IWhitelistConfig, IWhitelistEntryConfig } from "./WhitelistConfig.js";
import { resolveRelativePath } from "../../config/FaucetConfig.js";
import { ISessionRewardFactor } from '../../session/SessionRewardFactor.js';

export class WhitelistModule extends BaseModule<IWhitelistConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  private cachedWhitelistEntries: [pattern: string, restriction: IWhitelistEntryConfig][];
  private cachedWhitelistRefresh: number;

  protected override async startModule(): Promise<void> {
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionStart, 2, "Whitelist check", 
      (session: FaucetSession) => this.processSessionStart(session)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionIpChange, 2, "Whitelist check", 
      (session: FaucetSession) => this.processSessionStart(session)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionRewardFactor, 6, "whitelist factor", 
      (session: FaucetSession, rewardFactors: ISessionRewardFactor[]) => this.processSessionRewardFactor(session, rewardFactors)
    );
  }

  protected override stopModule(): Promise<void> {
    return Promise.resolve();
  }

  protected override onConfigReload(): void {
    this.cachedWhitelistRefresh = 0;
  }

  private async processSessionStart(session: FaucetSession): Promise<void> {
    let whitelistEntry = this.getSessionWhitelistEntry(session);
    if(whitelistEntry) {
      session.setSessionData("whitelist", true);
      if(whitelistEntry.skipModules)
        session.setSessionData("skip.modules", whitelistEntry.skipModules);
      if(typeof whitelistEntry.reward === "number")
        session.setSessionData("whitelist.factor", whitelistEntry.reward);
    }
  }

  private async processSessionRewardFactor(session: FaucetSession, rewardFactors: ISessionRewardFactor[]) {
    let rewardPerc = session.getSessionData("whitelist.factor", 100);
    if(rewardPerc !== 100) {
      rewardFactors.push({
        factor: rewardPerc / 100,
        module: this.moduleName,
      });
    }
  }

  public refreshCachedWhitelistEntries(force?: boolean) {
    let now = Math.floor((new Date()).getTime() / 1000);
    let refresh = this.moduleConfig.whitelistFile ? this.moduleConfig.whitelistFile.refresh : 30;
    if(this.cachedWhitelistRefresh > now - refresh && !force)
      return;
    
    this.cachedWhitelistRefresh = now;
    this.cachedWhitelistEntries = [];
    if(this.moduleConfig.whitelistPattern) {
      Object.keys(this.moduleConfig.whitelistPattern).forEach((pattern) => {
        let entry = this.moduleConfig.whitelistPattern[pattern];
        this.cachedWhitelistEntries.push([pattern, entry]);
      });
    }
    
    if(this.moduleConfig.whitelistFile && this.moduleConfig.whitelistFile.yaml) {
      // load yaml file
      if(Array.isArray(this.moduleConfig.whitelistFile.yaml))
      this.moduleConfig.whitelistFile.yaml.forEach((file) => this.refreshCachedWhitelistEntriesFromYaml(resolveRelativePath(file)));
      else
        this.refreshCachedWhitelistEntriesFromYaml(resolveRelativePath(this.moduleConfig.whitelistFile.yaml));
    }
  }

  private refreshCachedWhitelistEntriesFromYaml(yamlFile: string) {
    if(!fs.existsSync(yamlFile))
      return;
    
    let yamlSrc = fs.readFileSync(yamlFile, "utf8");
    let yamlObj = YAML.parse(yamlSrc);

    if(Array.isArray(yamlObj.restrictions)) {
      yamlObj.restrictions.forEach((entry) => {
        let pattern = entry.pattern;
        delete entry.pattern;
        this.cachedWhitelistEntries.push([pattern, entry]);
      })
    }
  }

  private getSessionWhitelistEntry(session: FaucetSession): IWhitelistEntryConfig|null {
    let remoteIp = session.getRemoteIP();
    this.refreshCachedWhitelistEntries();
    for(let i = 0; i < this.cachedWhitelistEntries.length; i++) {
      let entry = this.cachedWhitelistEntries[i];
      if(remoteIp.match(new RegExp(entry[0], "mi"))) {
        return entry[1];
      }
    }
    return null;
  }


}
