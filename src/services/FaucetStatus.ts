import * as fs from 'fs'
import * as path from 'path';
import { faucetConfig } from '../common/FaucetConfig';
import { PoWClient } from "../websock/PoWClient";

export enum FaucetStatusLevel {
  INFO    = "info",
  WARNING = "warn",
  ERROR   = "error",
}

export class FaucetStatus {
  private currentStatus: {[key: string]: {text: string, level: FaucetStatusLevel}} = {};
  private currentStatusText: string = null;
  private currentStatusLevel: FaucetStatusLevel;

  public constructor() {
    setInterval(() => this.updateLocalStatus(), 10000);
  }

  private updateLocalStatus() {
    let faucetStatusFile = path.join(faucetConfig.appBasePath, "faucet-status.json");
    if(!fs.existsSync(faucetStatusFile))
      return this.setFaucetStatus("local", null, null);

    try {
      let faucetStatusStr = fs.readFileSync(faucetStatusFile, "utf8");
      let faucetStatusJson = JSON.parse(faucetStatusStr);

      if(typeof faucetStatusJson === "string")
        return this.setFaucetStatus("local", faucetStatusJson, FaucetStatusLevel.INFO);
      else if(typeof faucetStatusJson === "object" && faucetStatusJson && faucetStatusJson.text)
        return this.setFaucetStatus("local", faucetStatusJson.text, faucetStatusJson.level);
      else
        return this.setFaucetStatus("local", null, null);
    } catch(ex) {
      console.error("cannot read local faucet status: ", ex);
      return this.setFaucetStatus("local", null, null);
    }
  }

  public getFaucetStatus(): {text: string, level: FaucetStatusLevel} {
    return {
      text: this.currentStatusText,
      level: this.currentStatusLevel,
    };
  }

  public setFaucetStatus(key: string, statusText: string, statusLevel: FaucetStatusLevel) {
    if(statusText) {
      if(this.currentStatus[key] && this.currentStatus[key].text === statusText)
        return;
      this.currentStatus[key] = {text: statusText, level: statusLevel};
    }
    else {
      if(!this.currentStatus[key])
        return;
      delete this.currentStatus[key];
    }
    this.updateCurrentStatus();
  }

  private updateCurrentStatus() {
    let newStatus: {text: string, level: FaucetStatusLevel};
    let newStatusPrio: number = null;

    let statusKeys = Object.keys(this.currentStatus);
    for(let i = 0; i < statusKeys.length; i++) {
      let status = this.currentStatus[statusKeys[i]];
      let priority = this.getStatusLevelPriority(status.level);

      if(newStatusPrio === null || priority > newStatusPrio) {
        newStatusPrio = priority;
        newStatus = status;
      }
    }

    if(!newStatus && !this.currentStatusText)
      return;
    if(newStatus && newStatus.text === this.currentStatusText)
      return;
    
    this.currentStatusText = newStatus ? newStatus.text : null;
    this.currentStatusLevel = newStatus ? newStatus.level : null;
    PoWClient.sendToAll("faucetStatus", this.getFaucetStatus());
  }

  private getStatusLevelPriority(statusLevel: FaucetStatusLevel): number {
    switch(statusLevel) {
      case FaucetStatusLevel.INFO:
        return 1;
      case FaucetStatusLevel.WARNING:
        return 2;
      case FaucetStatusLevel.ERROR:
        return 3;
      default:
        return 0;
    }
  }
}
