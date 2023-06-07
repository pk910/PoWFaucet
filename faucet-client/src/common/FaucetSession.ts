import { IFaucetContext } from "./FaucetContext";

export interface IFaucetSessionStatus {
  session: string;
  status: string;
  start: number;
  tasks: {
    module: string;
    name: string;
    timeout: number;
  }[];
  balance: string;
  target: string;
  claimIdx?: number;
  claimStatus?: string;
  claimBlock?: number;
  claimHash?: string;
  claimMessage?: string;
  failedCode?: string;
  failedReason?: string;
  details?: {
    data: any;
    claim: any;
  };
}

export interface IFaucetSessionInfo {
  session: string;
  status: string;
  start: number;
  tasks?: {
    module: string;
    name: string;
    timeout: number;
  }[];
  balance: string;
  target: string;
  modules?: {[module: string]: any};
  failedCode?: string;
  failedReason?: string;
}

export interface IFaucetSessionRecoveryInfo {
  id: string;
  time: number;
  addr: string;
  value: string;
}

export class FaucetSession {
  public static persistSessionInfo(session: FaucetSession) {
    if(!session) {
      localStorage.removeItem("powSessionStatus");
    }
    else {
      localStorage.setItem("powSessionStatus", JSON.stringify({
        v: 2,
        id: session.getSessionId(),
        time: session.getStartTime(),
        addr: session.getTargetAddr(),
        value: session.getDropAmount().toString(),
      }));
    }
  }

  public static recoverSessionInfo(): IFaucetSessionRecoveryInfo {
    let statusJson = localStorage.getItem("powSessionStatus");
    if(!statusJson)
      return null;
    let recoveryInfo = JSON.parse(statusJson);
    if(!recoveryInfo || recoveryInfo.v !== 2)
      return null;
    return recoveryInfo;
  }


  private faucetContext: IFaucetContext;
  private sessionId: string;
  private sessionInfo: IFaucetSessionInfo;
  private sessionInfoPromise: Promise<IFaucetSessionInfo>;

  public constructor(faucetContext: IFaucetContext, sessionId: string, sessionInfo?: IFaucetSessionInfo) {
    this.faucetContext = faucetContext;
    this.sessionId = sessionId;
    this.sessionInfo = sessionInfo;
  }

  public loadSessionInfo(): Promise<IFaucetSessionInfo> {
    if(this.sessionInfo)
      return Promise.resolve(this.sessionInfo);
    return this.refreshSessionInfo();
  }

  public refreshSessionInfo(): Promise<IFaucetSessionInfo> {
    if(this.sessionInfoPromise)
      return this.sessionInfoPromise;
    return this.sessionInfoPromise = this.faucetContext.faucetApi.getSession(this.sessionId).then((sessionInfo) => {
      if((sessionInfo as any).error)
        throw sessionInfo;
      this.sessionInfo = sessionInfo;
      this.sessionInfoPromise = null;
      return sessionInfo;
    });
  }

  public setSessionInfo(sessionInfo: IFaucetSessionInfo) {
    this.sessionInfo = sessionInfo;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getModuleState(module: string): any {
    return this.sessionInfo?.modules ? this.sessionInfo?.modules[module] : undefined;
  }

  public setModuleState(module: string, state: any): any {
    this.sessionInfo.modules[module] = state;
  }

  public getStatus(): string {
    return this.sessionInfo?.status;
  }

  public setStatus(status: string): void {
    if(!this.sessionInfo)
      return;
    this.sessionInfo.status = status;
  }

  public getTargetAddr(): string {
    return this.sessionInfo?.target;
  }

  public getDropAmount(): bigint {
    return BigInt(this.sessionInfo?.balance || "0");
  }

  public getStartTime(): number {
    return this.sessionInfo?.start;
  }

}
