
import { clearInterval } from "timers";
import { ServiceManager } from "../../common/ServiceManager";
import { FaucetDatabase } from "../../db/FaucetDatabase";
import { BaseModule } from "../BaseModule";
import { IFaucetOutflowConfig } from "./FaucetOutflowConfig";
import { ModuleHookAction } from "../ModuleManager";
import { FaucetSession } from "../../session/FaucetSession";
import { ISessionRewardFactor } from "../../session/SessionRewardFactor";

interface OutflowState {
  trackTime: number;
  dustAmount: bigint;
}

export class FaucetOutflowModule extends BaseModule<IFaucetOutflowConfig> {
  private outflowState: OutflowState;
  private saveTimer: NodeJS.Timer;
  

  protected override startModule(): void {
    this.saveTimer = setInterval(() => this.saveOutflowState(), 60 * 1000);
    this.loadOutflowState();
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionRewardFactor, 5, "faucet outflow",
      (session: FaucetSession, rewardFactors: ISessionRewardFactor[]) => this.processSessionRewardFactor(session, rewardFactors)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionRewarded, 5, "faucet outflow",
      (session: FaucetSession, amount: bigint) => this.updateState(amount)
    );
  }

  protected override stopModule(): void {
    clearInterval(this.saveTimer);
    this.saveTimer = null;
  }

  private async processSessionRewardFactor(session: FaucetSession, rewardFactors: ISessionRewardFactor[]): Promise<void> {
    let outflowRestriction = this.getOutflowRestriction();
    if(outflowRestriction < 100) {
      rewardFactors.push({
        factor: outflowRestriction / 100,
        module: this.moduleName,
      });
    }
  }

  private now(): number {
    return Math.floor((new Date()).getTime() / 1000);
  }

  private loadOutflowState() {
    let stateJson = ServiceManager.GetService(FaucetDatabase).getKeyValueEntry("PoWOutflowLimiter.state");
    if(stateJson) {
      let stateObj = JSON.parse(stateJson);
      this.outflowState = {
        trackTime: stateObj.trackTime,
        dustAmount: 0n,
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
      ServiceManager.GetService(FaucetDatabase).setKeyValueEntry("PoWOutflowLimiter.state", JSON.stringify({
        trackTime: this.outflowState.trackTime,
        dustAmount: this.outflowState.dustAmount.toString(),
      }));
    }
    else
      ServiceManager.GetService(FaucetDatabase).deleteKeyValueEntry("PoWOutflowLimiter.state");
  }

  private updateState(minedAmount: bigint) {
    if(minedAmount < 0)
      return;
    let now = this.now();

    // check upperLimit
    if(this.getOutflowBalance() > this.moduleConfig.upperLimit) {
      let upperTimeLimit = BigInt(this.moduleConfig.upperLimit) * BigInt(this.moduleConfig.duration) / BigInt(this.moduleConfig.amount);
      this.outflowState.trackTime = now - Number(upperTimeLimit);
      this.outflowState.dustAmount = 0n;
    }
    
    // add minedAmount
    if(minedAmount <= this.outflowState.dustAmount) {
      this.outflowState.dustAmount -= minedAmount;
    }
    else {
      minedAmount -= this.outflowState.dustAmount;

      let minedTime = minedAmount * BigInt(this.moduleConfig.duration) / BigInt(this.moduleConfig.amount);
      if(minedTime * BigInt(this.moduleConfig.amount) / BigInt(this.moduleConfig.duration) < minedAmount) {
        minedTime++;
        this.outflowState.dustAmount = (minedTime * BigInt(this.moduleConfig.amount) / BigInt(this.moduleConfig.duration)) - minedAmount;
      }
      else {
        this.outflowState.dustAmount = 0n;
      }
      this.outflowState.trackTime += parseInt(minedTime.toString());
    }
  }

  private getOutflowBalance(): bigint {
    let timeDiff = this.now() - this.outflowState.trackTime;
    let balance = BigInt(timeDiff) * BigInt(this.moduleConfig.amount) / BigInt(this.moduleConfig.duration);
    balance += this.outflowState.dustAmount;
    return balance;
  }

  private getOutflowRestriction(): number {
    let now = this.now();
    let outflowBalance: bigint;
    if(this.outflowState.trackTime <= now || (outflowBalance = this.getOutflowBalance()) >= 0)
      return 100;

    let lowerLimit = BigInt(this.moduleConfig.lowerLimit);
    let remainingAmount = outflowBalance < lowerLimit ? 0n : lowerLimit - outflowBalance;

    return Number(10000n * remainingAmount / lowerLimit) / 100;
  }

  public getOutflowDebugState(): {now: number, trackTime: number, dustAmount: string, balance: string, restriction: number, amount: number, duration: number, lowerLimit: number, upperLimit: number} {
    return {
      now: this.now(),
      trackTime: this.outflowState.trackTime,
      dustAmount: this.outflowState.dustAmount.toString(),
      balance: this.getOutflowBalance().toString(),
      restriction: this.getOutflowRestriction(),
      amount: this.moduleConfig.amount,
      duration: this.moduleConfig.duration,
      lowerLimit: this.moduleConfig.lowerLimit,
      upperLimit: this.moduleConfig.upperLimit,
    };
  }

}
