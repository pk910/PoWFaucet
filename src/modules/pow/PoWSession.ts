import { FaucetSession } from "../../session/FaucetSession";
import { PoWClient } from "./PoWClient";

export class PoWSession {
  private session: FaucetSession;

  public constructor(session: FaucetSession) {
    this.session = session;
  }

  public getFaucetSession(): FaucetSession {
    return this.session;
  }

  public get activeClient(): PoWClient {
    return this.session.getSessionModuleRef("pow.client");
  }

  public set activeClient(value: PoWClient) {
    this.session.setSessionModuleRef("pow.client", value);
  }

  public get lastNonce(): number {
    return this.session.getSessionData("pow.lastNonce") || 0;
  }

  public set lastNonce(value: number) {
    this.session.setSessionData("pow.lastNonce", value);
  }

  public get missedVerifications(): number {
    return this.session.getSessionModuleRef("pow.missedVfy") || 0;
  }

  public set missedVerifications(value: number) {
    this.session.setSessionModuleRef("pow.missedVfy", value);
  }

  public get pendingVerifications(): number {
    return this.session.getSessionModuleRef("pow.pendingVfy") || 0;
  }

  public set pendingVerifications(value: number) {
    this.session.setSessionModuleRef("pow.pendingVfy", value);
  }

  public get reportedHashrate(): number[] {
    return this.session.getSessionData("pow.hashrates") || [];
  }

  public set reportedHashrate(value: number[]) {
    let avgCount = 0;
    let avgSum = 0;
    value.forEach((val) => {
      avgCount++;
      avgSum += val;
    });
    this.session.setSessionData("pow.hashrates", value);
    this.session.setSessionData("pow.hashrate", avgSum / avgCount);
  }

  public get preImage(): string {
    return this.session.getSessionData("pow.preimage") || [];
  }

  public set preImage(value: string) {
    this.session.setSessionData("pow.preimage", value);
  }

  public slashSession(reason: string) {
    this.getFaucetSession().setDropAmount(0n);
    this.getFaucetSession().setSessionFailed("SLASHED", reason);
  }

}
