import { FaucetSession } from "../../session/FaucetSession.js";
import { PromiseDfd } from "../../utils/PromiseDfd.js";
import { PoWClient } from "./PoWClient.js";
import { PoWServerWorker } from "./PoWServerWorker.js";

interface IPoWSessionPropValue {
  value: any;
  dirty: boolean;
}

export class PoWSession {
  private sessionId: string;
  private worker: PoWServerWorker;
  private sessionData: {[key: string]: IPoWSessionPropValue} = {};
  private currentActiveClient: PoWClient;
  private verifyStats: {missed: number, pending: number} = {missed: 0, pending: 0};
  private balance: bigint = BigInt(0);
  private rewardCounter = 0;
  private rewardDfds: {[key: string]: PromiseDfd<[bigint, bigint]>} = {};
  private sessionCloseDfd: PromiseDfd<any>;

  public constructor(sessionId: string, worker: PoWServerWorker) {
    this.sessionId = sessionId;
    this.worker = worker;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getWorker(): PoWServerWorker {
    return this.worker;
  }

  public loadSessionData(data: any) {
    for(let key in data) {
      if(key === "_balance")
        this.balance = BigInt(data[key]);
      else
        this.sessionData[key] = {
          value: data[key],
          dirty: false
        };
    }
  }

  public getSessionProp(key: string): any {
    return this.sessionData[key]?.value;
  }

  private setSessionProp(key: string, value: any) {
    if(this.sessionData[key] && this.sessionData[key].value === value)
      return;
    this.sessionData[key] = {
      value: value,
      dirty: true
    };
  }

  public getDropAmount(): bigint {
    return this.balance;
  }

  public async subPenalty(amount: bigint, type: string) {
    return this.addReward(amount * -1n, type);
  }

  public async addReward(amount: bigint, type: string) {
    let dirtyProps = this.getDirtyProps(true);

    let reqId = this.rewardCounter++;
    this.worker.sendSessionReward(this.sessionId, reqId, amount, type, dirtyProps);

    this.rewardDfds[reqId] = new PromiseDfd<[bigint, bigint]>();
    return this.rewardDfds[reqId].promise.then((res) => {
      let amount = res[0];
      let balance = res[1];
      this.balance = balance;
      return amount;
    });
  }

  public processReward(reqId: number, amount: bigint, balance: bigint) {
    let dfd = this.rewardDfds[reqId];
    if(dfd) {
      dfd.resolve([amount, balance]);
      delete this.rewardDfds[reqId];
    }
  }

  public get startTime(): number {
    return this.getSessionProp("_startTime");
  }

  public get activeClient(): PoWClient {
    return this.currentActiveClient;
  }

  public set activeClient(value: PoWClient) {
    this.currentActiveClient = value;
    if(value)
      this.setSessionProp("pow.idleTime", null);
    else
      this.setSessionProp("pow.idleTime", Math.floor(new Date().getTime() / 1000));
  }

  public get idleTime(): number {
    return this.getSessionProp("pow.idleTime");
  }

  public get idleTimer(): NodeJS.Timeout {
    return this.getSessionProp("pow.idleTimer");
  }

  public set idleTimer(value: NodeJS.Timeout) {
    this.setSessionProp("pow.idleTimer", value);
  }

  public get lastNonce(): number {
    return this.getSessionProp("pow.lastNonce") || 0;
  }

  public set lastNonce(value: number) {
    this.setSessionProp("pow.lastNonce", value);
  }

  public get shareCount(): number {
    return this.getSessionProp("pow.shareCount") || 0;
  }

  public set shareCount(value: number) {
    this.setSessionProp("pow.shareCount", value);
  }

  public get missedVerifications(): number {
    return this.verifyStats.missed;
  }

  public set missedVerifications(value: number) {
    this.verifyStats.missed = value;
  }

  public get pendingVerifications(): number {
    return this.verifyStats.pending;
  }

  public set pendingVerifications(value: number) {
    this.verifyStats.pending = value;
  }

  public get reportedHashrate(): number[] {
    return this.getSessionProp("pow.hashrates") || [];
  }

  public set reportedHashrate(value: number[]) {
    let avgCount = 0;
    let avgSum = 0;
    value.forEach((val) => {
      avgCount++;
      avgSum += val;
    });
    this.setSessionProp("pow.hashrates", value);
    this.setSessionProp("pow.hashrate", avgSum / avgCount);
  }

  public get preImage(): string {
    return this.getSessionProp("pow.preimage") || null;
  }

  public set preImage(value: string) {
    this.setSessionProp("pow.preimage", value);
  }

  public getDirtyProps(reset: boolean = true): {[key: string]: any} {
    let dirtyProps: {[key: string]: any} = {};
    for(let key in this.sessionData) {
      if(this.sessionData[key].dirty) {
        dirtyProps[key] = this.sessionData[key].value;
        if(reset)
          this.sessionData[key].dirty = false;
      }
    }
    return dirtyProps;
  }

  public slashSession(reason: string) {
    return this.closeSession("slashed", reason);
  }

  public async closeSession(type?: string, reason?: string): Promise<any> {
    if(this.sessionCloseDfd)
      return this.sessionCloseDfd.promise;

    this.sessionCloseDfd = new PromiseDfd<any>();
    let dirtyProps = this.getDirtyProps(true);
    this.worker.sendSessionAbort(this.sessionId, type || "closed", reason || "", dirtyProps);

    return this.sessionCloseDfd.promise;
  }

  public processSessionClose(info: any) {
    if(this.sessionCloseDfd) {
      this.sessionCloseDfd.resolve(info);
    }
  }
}
