import * as fs from 'fs'
import * as path from 'path';
import * as crypto from "crypto";
import { faucetConfig } from '../common/FaucetConfig';
import { PoWClient } from "../websock/PoWClient";
import { PoWSession } from '../websock/PoWSession';

export enum FaucetStatusLevel {
  INFO    = "info",
  WARNING = "warn",
  ERROR   = "error",
}

export interface IFaucetStatus {
  level: FaucetStatusLevel;
  text: string;
  ishtml?: boolean;
}

export interface IFaucetStatusEntry extends IFaucetStatus {
  key?: string;
  prio?: number;
  filter?: {
    session?: boolean;
    country?: string | string[];
    hosting?: boolean;
    proxy?: boolean;
  };
}

export class FaucetStatus {
  private localStatusJson: string;
  private localStatusEntries: IFaucetStatusEntry[] = [];
  private currentStatus: {[key: string]: IFaucetStatusEntry} = {};

  public constructor() {
    setInterval(() => this.updateLocalStatus(), 10000);
  }

  private updateLocalStatus() {
    let faucetStatusFile = path.join(faucetConfig.appBasePath, "faucet-status.json");
    let faucetStatusStr = "";
    if(!fs.existsSync(faucetStatusFile))
      this.localStatusEntries = [];
    else {
      try {
        faucetStatusStr = fs.readFileSync(faucetStatusFile, "utf8");
        let faucetStatusJson = JSON.parse(faucetStatusStr);

        if(typeof faucetStatusJson === "string")
          this.localStatusEntries = [{ level: FaucetStatusLevel.INFO, text: faucetStatusJson }];
        else if(typeof faucetStatusJson === "object" && faucetStatusJson && faucetStatusJson.text)
          this.localStatusEntries = [ faucetStatusJson ];
        else if(typeof faucetStatusJson === "object" && Array.isArray(faucetStatusJson))
          this.localStatusEntries = faucetStatusJson;
        else
          this.localStatusEntries = [];
      } catch(ex) {
        console.error("cannot read local faucet status: ", ex);
        this.localStatusEntries = [];
      }
    }
    if(faucetStatusStr !== this.localStatusJson) {

      this.updateFaucetStatus();
    }
  }

  public setFaucetStatus(key: string, statusText: string, statusLevel: FaucetStatusLevel) {
    if(statusText) {
      if(this.currentStatus[key] && this.currentStatus[key].text === statusText)
        return;
      this.currentStatus[key] = {key: key, text: statusText, level: statusLevel};
    }
    else {
      if(!this.currentStatus[key])
        return;
      delete this.currentStatus[key];
    }
    this.updateFaucetStatus();
  }

  private updateFaucetStatus() {
    // update faucet status for each client
    let noSessionStatus: {status: IFaucetStatus[], hash: string} = null;
    PoWClient.getAllClients().forEach((client) => {
      let session = client.getSession();
      let status = (!session && noSessionStatus) ? noSessionStatus : this.getFaucetStatus(session);
      if(!session && !noSessionStatus)
        noSessionStatus = status;
      client.sendFaucetStatus(status.status, status.hash);
    });
  }

  public getFaucetStatus(session?: PoWSession): {status: IFaucetStatus[], hash: string} {
    let statusList: IFaucetStatus[] = [];
    let statusHash = crypto.createHash("sha256");

    let addStatus = (status: IFaucetStatusEntry) => {
      statusHash.update((status.key || "*") + ":" + status.text + "\n");
      statusList.push({
        level: status.level,
        text: status.text,
        ishtml: status.ishtml
      });
    };
    let checkStatusFilter = (status: IFaucetStatusEntry) => {
      if(!status.filter)
        return true;
      if(status.filter.session !== undefined && status.filter.session !== !!session)
        return false;
      
      let ipinfo = session ? session.getLastIpInfo() : null;
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

    return {
      status: statusList,
      hash: statusHash.digest("hex"),
    }
  }

}
