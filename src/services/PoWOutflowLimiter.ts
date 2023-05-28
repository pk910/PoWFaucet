
import { clearInterval } from "timers";
import { faucetConfig } from "../common/FaucetConfig";
import { FaucetProcess } from "../common/FaucetProcess";
import { ServiceManager } from "../common/ServiceManager";
import { FaucetStoreDB } from "./FaucetStoreDB";

interface OutflowState {
  trackTime: number;
  dustAmount: bigint;
}

export class PoWOutflowLimiter {
  private outflowState: OutflowState;
  private saveTimer: NodeJS.Timer;
  
  public constructor() {
    ServiceManager.GetService(FaucetProcess).addListener("reload", () => this.reloadService());
    this.reloadService();
  }

  private now(): number {
    return Math.floor((new Date()).getTime() / 1000);
  }
  
  private reloadService() {
    if(!faucetConfig.faucetOutflowRestriction || !faucetConfig.faucetOutflowRestriction.enabled) {
      this.outflowState = null;
    }
    else if(!this.outflowState)
      this.loadOutflowState();
    this.updateState(0n);
    this.saveOutflowState();

    if(this.outflowState && !this.saveTimer)
      this.saveTimer = setInterval(() => this.saveOutflowState(), 60 * 1000);
    else if(!this.outflowState && this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  private loadOutflowState() {
    let stateJson = ServiceManager.GetService(FaucetStoreDB).getKeyValueEntry("PoWOutflowLimiter.state");
    if(stateJson) {
      let stateObj = JSON.parse(stateJson);
      this.outflowState = {
        trackTime: stateObj.trackTime,
        dustAmount: BigInt(stateObj.dustAmount),
      };
    }
    else {
      this.outflowState = {
        trackTime: this.now(),
        dustAmount: 0n,
      };
    }
  }

  public saveOutflowState() {
    if(this.outflowState) {
      ServiceManager.GetService(FaucetStoreDB).setKeyValueEntry("PoWOutflowLimiter.state", JSON.stringify({
        trackTime: this.outflowState.trackTime,
        dustAmount: this.outflowState.dustAmount.toString(),
      }));
    }
    else
      ServiceManager.GetService(FaucetStoreDB).deleteKeyValueEntry("PoWOutflowLimiter.state");
  }

  private updateState(minedAmount: bigint) {
    if(!this.outflowState)
      return;
    let now = this.now();

    // check upperLimit
    if(this.getOutflowBalance() > faucetConfig.faucetOutflowRestriction.upperLimit) {
      let upperTimeLimit = BigInt(faucetConfig.faucetOutflowRestriction.upperLimit) * BigInt(faucetConfig.faucetOutflowRestriction.duration) / BigInt(faucetConfig.faucetOutflowRestriction.amount);
      this.outflowState.trackTime = now - Number(upperTimeLimit);
      this.outflowState.dustAmount = 0n;
    }
    
    // add minedAmount
    if(minedAmount <= this.outflowState.dustAmount) {
      this.outflowState.dustAmount -= minedAmount;
    }
    else {
      minedAmount -= this.outflowState.dustAmount;

      let minedTime = minedAmount * BigInt(faucetConfig.faucetOutflowRestriction.duration) / BigInt(faucetConfig.faucetOutflowRestriction.amount);
      if(minedTime * BigInt(faucetConfig.faucetOutflowRestriction.amount) / BigInt(faucetConfig.faucetOutflowRestriction.duration) < minedAmount) {
        minedTime++;
        this.outflowState.dustAmount = (minedTime * BigInt(faucetConfig.faucetOutflowRestriction.amount) / BigInt(faucetConfig.faucetOutflowRestriction.duration)) - minedAmount;
      }
      else {
        this.outflowState.dustAmount = 0n;
      }
      this.outflowState.trackTime += parseInt(minedTime.toString());
    }
  }

  public getOutflowBalance(): bigint {
    if(!this.outflowState)
      return 0n;
    let timeDiff = this.now() - this.outflowState.trackTime;
    let balance = BigInt(timeDiff) * BigInt(faucetConfig.faucetOutflowRestriction.amount) / BigInt(faucetConfig.faucetOutflowRestriction.duration);
    balance += this.outflowState.dustAmount;
    return balance;
  }

  public addMinedAmount(amount: bigint) {
    this.updateState(amount);
  }

  public getOutflowRestriction(): number {
    if(!this.outflowState)
      return 100;

    let now = this.now();
    let outflowBalance: bigint;
    if(this.outflowState.trackTime <= now || (outflowBalance = this.getOutflowBalance()) >= 0)
      return 100;

    let lowerLimit = BigInt(faucetConfig.faucetOutflowRestriction.lowerLimit);
    let remainingAmount = lowerLimit - outflowBalance;

    return Number(10000n * remainingAmount / lowerLimit) / 100;
  }

  public getOutflowDebugState(): {now: number, trackTime: number, dustAmount: string, balance: string, restriction: number, amount: number, duration: number, lowerLimit: number, upperLimit: number} {
    if(!this.outflowState)
      return null;
    return {
      now: this.now(),
      trackTime: this.outflowState.trackTime,
      dustAmount: this.outflowState.dustAmount.toString(),
      balance: this.getOutflowBalance().toString(),
      restriction: this.getOutflowRestriction(),
      amount: faucetConfig.faucetOutflowRestriction.amount,
      duration: faucetConfig.faucetOutflowRestriction.duration,
      lowerLimit: faucetConfig.faucetOutflowRestriction.lowerLimit,
      upperLimit: faucetConfig.faucetOutflowRestriction.upperLimit,
    };
  }

}
