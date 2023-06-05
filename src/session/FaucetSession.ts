import { FaucetError } from "../common/FaucetError";
import { ServiceManager } from "../common/ServiceManager";
import { faucetConfig } from "../config/FaucetConfig";
import { ModuleHookAction, ModuleManager } from "../modules/ModuleManager";
import { ClaimTx, ClaimTxStatus, EthClaimManager } from "../services/EthClaimManager";
import { FaucetStoreDB } from "../services/FaucetStoreDB";
import { getNewGuid } from "../utils/GuidUtils";
import { SessionManager } from "./SessionManager";
import { ISessionRewardFactor } from "./SessionRewardFactor";

export enum FaucetSessionStatus {
  UNKNOWN = "unknown",
  STARTING = "starting",
  RUNNING = "running",
  CLAIMABLE = "claimable",
  CLAIMING = "claiming",
  FINISHED = "finished",
  FAILED = "failed",
}

export interface FaucetSessionTask {
  module: string;
  name: string;
  timeout: number;
}

export interface FaucetSessionStoreData {
  sessionId: string;
  status: FaucetSessionStatus;
  startTime: number;
  targetAddr: string;
  dropAmount: string;
  remoteIP: string;
  tasks: any;
  data: any;
}

export class FaucetSession {
  private manager: SessionManager;
  private status: FaucetSessionStatus;
  private sessionId: string;
  private startTime: number;
  private targetAddr: string;
  private dropAmount: bigint;
  private remoteIP: string;
  private blockingTasks: FaucetSessionTask[] = [];
  private sessionDataDict: {[key: string]: any} = {};
  private sessionModuleRefs: {[key: string]: any} = {};
  private sessionTimer: NodeJS.Timeout;
  private isDirty: boolean;
  private saveTimer: NodeJS.Timeout;

  public constructor(manager: SessionManager) {
    this.manager = manager;
    this.status = FaucetSessionStatus.UNKNOWN;
    this.isDirty = false;
  }

  public async startSession(remoteIP: string, userInput: any, responseData: any): Promise<void> {
    if(this.status !== FaucetSessionStatus.UNKNOWN)
      throw new FaucetError("INVALID_STATE", "cannot start session: session already in '" + this.status + "' state");
    this.status = FaucetSessionStatus.STARTING;
    this.sessionId = getNewGuid();
    this.startTime = Math.floor((new Date()).getTime() / 1000);
    if(remoteIP.match(/^::ffff:/))
      remoteIP = remoteIP.substring(7);
    this.remoteIP = remoteIP;
    this.dropAmount = -1n;

    try {
      await ServiceManager.GetService(ModuleManager).processActionHooks([
        {prio: 5, hook: () => { // prio 5: get target address from userInput if not set provided by a module
          let targetAddr = this.targetAddr || userInput.addr;
          if(typeof targetAddr !== "string")
            throw new FaucetError("INVALID_ADDR", "Missing target address.");
          if(!targetAddr.match(/^0x[0-9a-f]{40}$/i) || targetAddr.match(/^0x0{40}$/i))
            throw new FaucetError("INVALID_ADDR", "Invalid target address: " + targetAddr);
          if(!this.targetAddr)
            this.setTargetAddr(targetAddr);
        }},
      ], ModuleHookAction.SessionStart, [this, userInput, responseData]);
    } catch(ex) {
      if(ex instanceof FaucetError)
        this.setSessionFailed(ex.getCode(), ex.message);
      else
        this.setSessionFailed("INTERNAL_ERROR", "sessionStart failed: " + ex.toString());
      throw ex;
    }

    this.status = FaucetSessionStatus.RUNNING;
    this.isDirty = true;
    this.manager.notifySessionUpdate(this);
    await this.tryProceedSession();
    if(this.status === FaucetSessionStatus.RUNNING)
      this.saveSession();
  }

  public async restoreSession(sessionData: FaucetSessionStoreData): Promise<void> {
    this.sessionId = sessionData.sessionId;
    this.status = sessionData.status;
    this.startTime = sessionData.startTime;
    this.targetAddr = sessionData.targetAddr;
    this.dropAmount = BigInt(sessionData.dropAmount);
    this.remoteIP = sessionData.remoteIP;
    this.blockingTasks = sessionData.tasks;
    this.sessionDataDict = sessionData.data;

    await ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionRestore, [this]);
    
    this.manager.notifySessionUpdate(this);
    this.resetSessionTimer();
  }

  public getStoreData(): FaucetSessionStoreData {
    return {
      sessionId: this.sessionId,
      status: this.status,
      startTime: this.startTime,
      targetAddr: this.targetAddr,
      dropAmount: this.dropAmount.toString(),
      remoteIP: this.remoteIP,
      tasks: this.blockingTasks,
      data: this.sessionDataDict,
    };
  }

  public saveSession() {
    if(this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if(!this.isDirty)
      return;
    this.isDirty = false;

    ServiceManager.GetService(FaucetStoreDB).updateSession(this.getStoreData());
  }

  private lazySaveSession() {
    if(this.saveTimer)
      return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveSession();
    }, 60 * 1000);
  }

  public setSessionFailed(code: string, reason: string, stack?: string) {
    let oldStatus = this.status;
    this.setSessionData("failed.code", code);
    this.setSessionData("failed.reason", reason);
    this.setSessionData("failed.stack", stack);
    this.status = FaucetSessionStatus.FAILED;
    this.manager.notifySessionUpdate(this);
    this.resetSessionTimer();
    this.saveSession();
    if(oldStatus === FaucetSessionStatus.RUNNING)
      ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionComplete, [this]);
  }

  private resetSessionTimer() {
    if(this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    let now = Math.floor((new Date()).getTime() / 1000);

    if(this.status === FaucetSessionStatus.RUNNING) {
      let minTaskTimeout = 0;
      this.blockingTasks.forEach((task) => {
        if(task.timeout > now && (minTaskTimeout === 0 || task.timeout < minTaskTimeout))
          minTaskTimeout = task.timeout;
      });
      let sessionTimeout = this.startTime + faucetConfig.sessionTimeout;
      let timerDelay = (Math.min(minTaskTimeout, sessionTimeout) - now) + 1;
      if(timerDelay < 1)
        timerDelay = 1;
      this.sessionTimer = setTimeout(() => this.tryProceedSession(), timerDelay * 1000);
    }
    else if(this.status === FaucetSessionStatus.CLAIMABLE) {
      let sessionTimeout = this.startTime + faucetConfig.sessionTimeout;
      let timerDelay = (sessionTimeout - now) + 1;
      if(timerDelay < 1)
        timerDelay = 1;
      this.sessionTimer = setTimeout(() => this.tryProceedSession(), timerDelay * 1000);
    }
  }

  public async tryProceedSession(): Promise<void> {
    let now = Math.floor((new Date()).getTime() / 1000);
    let sessionTimeout = this.startTime + faucetConfig.sessionTimeout;

    if(this.status === FaucetSessionStatus.CLAIMABLE) {
      if(now >= sessionTimeout) {
        this.setSessionFailed("SESSION_TIMEOUT", "session timeout");
      }
    }
    else if(this.status === FaucetSessionStatus.RUNNING) {
      for(let i = this.blockingTasks.length - 1; i >= 0; i--) {
        if(this.blockingTasks[i].timeout > 0 && this.blockingTasks[i].timeout < now) {
          this.blockingTasks.splice(i, 1);
        }
      }
      if(this.blockingTasks.length === 0) {
        await this.completeSession();
      }
      else {
        this.resetSessionTimer();
      }
    }
  }

  public async completeSession(): Promise<void> {
    if(this.dropAmount === -1n) {
      await this.addReward(BigInt(faucetConfig.maxDropAmount));
    }

    if(this.dropAmount < BigInt(faucetConfig.minDropAmount)) {
      return this.setSessionFailed("AMOUNT_TOO_LOW", "drop amount lower than minimum");
    }
    
    this.status = FaucetSessionStatus.CLAIMABLE;
    await ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionComplete, [this]);
    this.manager.notifySessionUpdate(this);
    this.saveSession();
  }

  public async claimSession(userInput: any): Promise<void> {
    if(this.status !== FaucetSessionStatus.CLAIMABLE)
      throw new FaucetError("NOT_CLAIMABLE", "cannot claim session: not claimable (state: " + this.status + ")");
    
    if(this.dropAmount < BigInt(faucetConfig.minDropAmount))
      return this.setSessionFailed("AMOUNT_TOO_LOW", "drop amount lower than minimum");
    if(this.dropAmount > BigInt(faucetConfig.maxDropAmount))
      this.dropAmount = BigInt(faucetConfig.maxDropAmount);

    try {
      await ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionClaim, [this, userInput]);
    } catch(ex) {
      if(ex instanceof FaucetError)
        this.setSessionFailed(ex.getCode(), ex.message);
      else
        this.setSessionFailed("INTERNAL_ERROR", "claimSession failed: " + ex.toString());
      throw ex;
    }

    if(this.status !== FaucetSessionStatus.CLAIMABLE) // check again to prevent double claiming during async operations
      throw new FaucetError("NOT_CLAIMABLE", "cannot claim session: not claimable (state: " + this.status + ")");
    this.status = FaucetSessionStatus.CLAIMING;
    this.isDirty = true;
    this.manager.notifySessionUpdate(this);

    ServiceManager.GetService(EthClaimManager).createSessionClaim(this);
    this.saveSession();
  }

  public async notifyClaimStatus(claimTx: ClaimTx): Promise<void> {
    this.isDirty = true;

    if(claimTx.claimStatus === ClaimTxStatus.CONFIRMED) {
      this.status = FaucetSessionStatus.FINISHED;
      ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionClaimed, [this, claimTx]);
      this.manager.notifySessionUpdate(this);
    }
    this.saveSession();
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getSessionStatus(): FaucetSessionStatus {
    return this.status;
  }

  public getStartTime(): number {
    return this.startTime;
  }

  public getRemoteIP(): string {
    return this.remoteIP;
  }

  public setRemoteIP(remoteIP: string): string {
    if(remoteIP.match(/^::ffff:/))
      remoteIP = remoteIP.substring(7);
    if(this.remoteIP === remoteIP)
      return;
    this.remoteIP = remoteIP;

    ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionIpChange, [this]);
    this.lazySaveSession();
  }

  public getTargetAddr(): string {
    return this.targetAddr;
  }

  public setTargetAddr(addr: string) {
    if(this.targetAddr && this.targetAddr !== addr)
      throw new FaucetError("INVALID_STATE", "cannot change target address: already set.");
    this.targetAddr = addr;
  }

  public getSessionData(key: string): any {
    return this.sessionDataDict[key];
  }

  public setSessionData(key: string, value: any) {
    this.sessionDataDict[key] = value;
    this.lazySaveSession();
  }

  public getSessionModuleRef(key: string): any {
    return this.sessionModuleRefs[key];
  }

  public setSessionModuleRef(key: string, value: any) {
    this.sessionModuleRefs[key] = value;
  }

  public getBlockingTasks(): FaucetSessionTask[] {
    return this.blockingTasks.slice();
  }

  public addBlockingTask(moduleName: string, taskName: string, timeLimit: number) {
    this.blockingTasks.push({
      module: moduleName,
      name: taskName,
      timeout: timeLimit ? Math.floor((new Date()).getTime() / 1000) + timeLimit : 0,
    });
    this.resetSessionTimer();
  }

  public resolveBlockingTask(moduleName: string, taskName: string) {
    for(let i = this.blockingTasks.length - 1; i >= 0; i--) {
      if(this.blockingTasks[i].module === moduleName && this.blockingTasks[i].name === taskName) {
        this.blockingTasks.splice(i, 1);
      }
    }
    this.resetSessionTimer();
    this.lazySaveSession();
  }

  public getDropAmount(): bigint {
    return this.dropAmount < 0n ? 0n : this.dropAmount;
  }

  public setDropAmount(amount: bigint) {
    if(this.dropAmount !== -1n)
      return;
    if(this.status === FaucetSessionStatus.CLAIMING || this.status === FaucetSessionStatus.FINISHED || this.status === FaucetSessionStatus.FAILED)
      return;
    this.dropAmount = 0n;
    if(amount > 0n)
      this.addReward(amount);
    else
      this.lazySaveSession();
  }

  public async addReward(amount: bigint): Promise<bigint> {
    if(this.status === FaucetSessionStatus.CLAIMING || this.status === FaucetSessionStatus.FINISHED || this.status === FaucetSessionStatus.FAILED)
      return;
    
    let rewardFactors: ISessionRewardFactor[] = [];
    await ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionRewardFactor, [this, rewardFactors]);

    let rewardFactor = 1;
    console.log(rewardFactors);
    rewardFactors.forEach((factor) => rewardFactor *= factor.factor);

    let rewardAmount = amount * BigInt(Math.floor(rewardFactor * 100000)) / 100000n;
    ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionRewarded, [this, rewardAmount, rewardFactors]);

    if(this.dropAmount === -1n)
      this.dropAmount = 0n;
    this.dropAmount += rewardAmount;

    this.lazySaveSession();
    return rewardAmount;
  }

  public async subPenalty(amount: bigint) {
    if(this.status === FaucetSessionStatus.CLAIMING || this.status === FaucetSessionStatus.FINISHED || this.status === FaucetSessionStatus.FAILED)
      return;
    
    if(this.dropAmount === -1n)
      this.dropAmount = 0n;
    this.dropAmount -= amount;
    if(this.dropAmount < 0n)
      this.dropAmount = 0n;
    this.lazySaveSession();
  }

}
