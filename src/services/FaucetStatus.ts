import * as fs from 'fs'
import * as crypto from "crypto";
import YAML from 'yaml';
import { faucetConfig, resolveRelativePath } from '../config/FaucetConfig.js';
import { isVersionLower } from '../utils/VersionCompare.js';
import { FaucetSession } from '../session/FaucetSession.js';
import { ServiceManager } from '../common/ServiceManager.js';
import { FaucetLogLevel, FaucetProcess } from '../common/FaucetProcess.js';
import { SessionManager } from '../session/SessionManager.js';

export enum FaucetStatusLevel {
  INFO    = "info",
  WARNING = "warn",
  ERROR   = "error",
}

export interface IFaucetStatus {
  level: FaucetStatusLevel;
  prio: number;
  text: string;
  ishtml?: boolean;
}

export interface IFaucetStatusEntry extends IFaucetStatus {
  key?: string;
  filter?: {
    session?: boolean;
    country?: string | string[];
    hosting?: boolean;
    proxy?: boolean;
    lt_version?: string; // lower than version
    gt_hashrate?: number; // higher than total hashrate

  };
}

interface IFaucetStatusCachedValue {
  time: number;
  value: any;
}

export interface IFaucetStatusConfig {
  json?: string;
  yaml?: string;
  refresh?: number;
}

export class FaucetStatus {
  private initialized: boolean;
  private updateTimer: NodeJS.Timeout;
  private localStatusJson: string;
  private localStatusEntries: IFaucetStatusEntry[] = [];
  private currentStatus: {[key: string]: IFaucetStatusEntry} = {};
  private statusValueCache: {[key: string]: IFaucetStatusCachedValue} = {};

  public initialize() {
    if(this.initialized)
      return;
    this.initialized = true;

    this.updateLocalStatus();
    this.resetUpdateTimer();

    ServiceManager.GetService(FaucetProcess).addListener("reload", () => this.resetUpdateTimer());
  }

  public dispose() {
    this.initialized = false;
    if(this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private resetUpdateTimer() {
    if(this.updateTimer)
      clearInterval(this.updateTimer);
    this.updateTimer = setInterval(() => this.updateLocalStatus(), (faucetConfig.faucetStatus?.refresh || 10) * 1000);
  }

  private updateLocalStatus() {
    this.localStatusEntries = [];

    let faucetStatusJsonFile = faucetConfig.faucetStatus?.json ? resolveRelativePath(faucetConfig.faucetStatus.json) : null;
    let faucetStatusYamlFile = faucetConfig.faucetStatus?.yaml ? resolveRelativePath(faucetConfig.faucetStatus.yaml) : null;
    let faucetStatusStr = "";

    if(faucetStatusJsonFile && fs.existsSync(faucetStatusJsonFile)) {
      try {
        let faucetStatusJsonStr = fs.readFileSync(faucetStatusJsonFile, "utf8");
        let faucetStatusJson = JSON.parse(faucetStatusJsonStr);
        faucetStatusStr += faucetStatusJsonStr;

        if(typeof faucetStatusJson === "string")
          this.localStatusEntries.push({ level: FaucetStatusLevel.INFO, text: faucetStatusJson, prio: 10 });
        else if(typeof faucetStatusJson === "object" && faucetStatusJson && faucetStatusJson.text)
          this.localStatusEntries.push(faucetStatusJson);
        else if(typeof faucetStatusJson === "object" && Array.isArray(faucetStatusJson))
          Array.prototype.push.apply(this.localStatusEntries, faucetStatusJson);
      } catch(ex) {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "cannot read local faucet statu from json: " + ex.toString());
      }
    }

    if(faucetStatusYamlFile && fs.existsSync(faucetStatusYamlFile)) {
      try {
        let faucetStatusYamlStr = fs.readFileSync(faucetStatusYamlFile, "utf8");
        let faucetStatusYaml = YAML.parse(faucetStatusYamlStr);
        faucetStatusStr += faucetStatusYamlStr;

        if(typeof faucetStatusYaml === "string")
          this.localStatusEntries.push({ level: FaucetStatusLevel.INFO, text: faucetStatusYaml, prio: 10 });
        else if(typeof faucetStatusYaml === "object" && faucetStatusYaml && faucetStatusYaml.text)
          this.localStatusEntries.push(faucetStatusYaml);
        else if(typeof faucetStatusYaml === "object" && Array.isArray(faucetStatusYaml))
          Array.prototype.push.apply(this.localStatusEntries, faucetStatusYaml);
      } catch(ex) {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "cannot read local faucet statu from yaml: " + ex.toString());
      }
    }

    if(faucetStatusStr !== this.localStatusJson) {
      this.updateFaucetStatus();
    }
  }

  public setFaucetStatus(key: string, statusText: string, statusLevel: FaucetStatusLevel, prio?: number): IFaucetStatusEntry {
    if(statusText) {
      if(!this.currentStatus[key] || this.currentStatus[key].text !== statusText) {
        this.currentStatus[key] = {key: key, text: statusText, level: statusLevel, prio: prio || 10};
      }
    }
    else if(this.currentStatus[key]) {
      delete this.currentStatus[key];
    }
    setImmediate(() => this.updateFaucetStatus());
    return this.currentStatus[key];
  }

  private updateFaucetStatus() {
    // update faucet status for each client

  }

  private getCachedValue(key: string, timeout: number, getter: () => any): any {
    let cachedValue: IFaucetStatusCachedValue;
    let now = Math.floor((new Date()).getTime() / 1000);
    if((cachedValue = this.statusValueCache[key]) && cachedValue.time > now - timeout) {
      return cachedValue.value;
    }

    let value = getter();
    this.statusValueCache[key] = {
      time: now,
      value: value,
    };
    return value;
  }

  private getWellKnownValue(key: string): any {
    switch(key) {
      case "hashrate":
        return this.getCachedValue(key, 60, () => {
          let sessionManager = ServiceManager.GetService(SessionManager);
          let totalHashrate = 0;
          sessionManager.getActiveSessions().forEach((session) => {
            totalHashrate += session.getSessionData("pow.hashrate", 0);
          });
          return totalHashrate;
        });
      
    }
  }

  public getFaucetStatus(clientVersion?: string, session?: FaucetSession): {status: IFaucetStatus[], hash: string} {
    let statusList: IFaucetStatus[] = [];
    let statusHash = crypto.createHash("sha256");

    let addStatus = (status: IFaucetStatusEntry) => {
      let text = status.text.replaceAll(/\{([a-z]+)\}/g, (match, key) => {
        switch(key) {
          case "hashrate":
            let hashrate = this.getWellKnownValue("hashrate");
            if(hashrate > 2000) {
              return Math.floor(hashrate / 1000) + " kH/s";
            } else {
              return Math.floor(hashrate) + " H/s";
            }
        }
        return match;
      })

      statusHash.update((status.key || "*") + ":" + text + "\n");
      statusList.push({
        level: status.level,
        prio: status.prio,
        text: text,
        ishtml: status.ishtml
      });
    };
    let checkStatusFilter = (status: IFaucetStatusEntry) => {
      if(!status.filter)
        return true;
      if(status.filter.session !== undefined && status.filter.session !== !!session)
        return false;
      
      let ipinfo = session ? session.getSessionData("ipinfo.data") : null;
      if(status.filter.country !== undefined) {
        if(!ipinfo || !ipinfo.countryCode)
          return false;
        let countries = Array.isArray(status.filter.country) ? status.filter.country : [status.filter.country];
        if(countries.indexOf(ipinfo.countryCode) === -1)
          return false;
      }
      if(status.filter.hosting !== undefined && (!ipinfo || !!ipinfo.hosting !== status.filter.hosting))
        return false;
      if(status.filter.proxy !== undefined && (!ipinfo || !!ipinfo.proxy !== status.filter.proxy))
        return false;
      
      if(status.filter.lt_version !== undefined) {
        if(!clientVersion)
          return false;
        if(!isVersionLower(clientVersion, status.filter.lt_version))
          return false;
      }

      if(status.filter.gt_hashrate !== undefined) {
        let hashrate = this.getWellKnownValue("hashrate");
        if(hashrate < status.filter.gt_hashrate)
          return false;
      }

      return true;
    };

    let statusKeys = Object.keys(this.currentStatus);
    for(let i = 0; i < statusKeys.length; i++) {
      let status = this.currentStatus[statusKeys[i]];
      if(checkStatusFilter(status)) {
        addStatus(status);
      }
    }
    
    let localStatusDict: {[key: string]: IFaucetStatusEntry} = {};
    for(let i = 0; i < this.localStatusEntries.length; i++) {
      let status = this.localStatusEntries[i];
      if(!checkStatusFilter(status))
        continue;
      let statusKey = status.key || "*";
      if(!localStatusDict.hasOwnProperty(statusKey) || (status.prio || 0) > (localStatusDict[statusKey].prio || 0))
        localStatusDict[statusKey] = status;
    }
    Object.values(localStatusDict).sort((a, b) => ((a.prio || 0) - (b.prio || 0))).forEach((status) => {
      addStatus(status);
    });

    if(session) {
      let restriction = session.getSessionModuleRef("ipinfo.restriction.data");
      if(restriction) {
        restriction.messages.forEach((message) => {
          if(!message.notify)
            return;
          
          addStatus({
            level: (typeof message.notify === "string" ? message.notify as FaucetStatusLevel : FaucetStatusLevel.WARNING),
            prio: 20,
            text: message.text,
          });
        });
      }
    }

    return {
      status: statusList,
      hash: statusHash.digest("hex"),
    }
  }

}
