import * as fs from 'fs'
import * as crypto from "crypto";
import { faucetConfig, resolveRelativePath } from '../config/FaucetConfig';
import { isVersionLower } from '../utils/VersionCompare';
import { FaucetSession } from '../session/FaucetSession';
import { ServiceManager } from '../common/ServiceManager';
import { FaucetLogLevel, FaucetProcess } from '../common/FaucetProcess';

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
  };
}

export interface IFaucetStatusConfig {
  json?: string;
  refresh?: number;
}

export class FaucetStatus {
  private initialized: boolean;
  private updateTimer: NodeJS.Timer;
  private localStatusJson: string;
  private localStatusEntries: IFaucetStatusEntry[] = [];
  private currentStatus: {[key: string]: IFaucetStatusEntry} = {};

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
    let faucetStatusFile = faucetConfig.faucetStatus?.json ? resolveRelativePath(faucetConfig.faucetStatus.json) : null;
    let faucetStatusStr = "";
    if(!faucetStatusFile || !fs.existsSync(faucetStatusFile))
      this.localStatusEntries = [];
    else {
      try {
        faucetStatusStr = fs.readFileSync(faucetStatusFile, "utf8");
        let faucetStatusJson = JSON.parse(faucetStatusStr);

        if(typeof faucetStatusJson === "string")
          this.localStatusEntries = [{ level: FaucetStatusLevel.INFO, text: faucetStatusJson, prio: 10 }];
        else if(typeof faucetStatusJson === "object" && faucetStatusJson && faucetStatusJson.text)
          this.localStatusEntries = [ faucetStatusJson ];
        else if(typeof faucetStatusJson === "object" && Array.isArray(faucetStatusJson))
          this.localStatusEntries = faucetStatusJson;
        else
          this.localStatusEntries = [];
      } catch(ex) {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "cannot read local faucet status: " + ex.toString());
        this.localStatusEntries = [];
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

  public getFaucetStatus(clientVersion?: string, session?: FaucetSession): {status: IFaucetStatus[], hash: string} {
    let statusList: IFaucetStatus[] = [];
    let statusHash = crypto.createHash("sha256");

    let addStatus = (status: IFaucetStatusEntry) => {
      statusHash.update((status.key || "*") + ":" + status.text + "\n");
      statusList.push({
        level: status.level,
        prio: status.prio,
        text: status.text,
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
