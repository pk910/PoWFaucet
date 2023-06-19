import { ServiceManager } from "../../common/ServiceManager";
import { getNewGuid } from "../../utils/GuidUtils";
import { PromiseDfd } from "../../utils/PromiseDfd";
import { PoWSession } from "./PoWSession";
import { PoWModule } from "./PoWModule";
import { SessionManager } from "../../session/SessionManager";
import { FaucetSessionStatus } from "../../session/FaucetSession";
import { PoWClient } from "./PoWClient";

export interface IPoWShareVerificationResult {
  isValid: boolean;
  reward: bigint;
}

export class PoWShareVerification {
  private static verifyingShares: {[id: string]: PoWShareVerification} = {};

  public static processVerificationResult(shareId: string, verifier: string, isValid: boolean): boolean {
    if(!this.verifyingShares[shareId])
      return false;
    return this.verifyingShares[shareId].processVerificationResult(verifier, isValid);
  }

  private shareId: string;
  private module: PoWModule;
  private session: PoWSession;
  private nonces: number[];
  private verifyLocal = false;
  private verifyMinerCount = 0;
  private verifyMinerSessions: string[] = [];
  private verifyMinerResults: {[sessionId: string]: boolean} = {};
  private verifyMinerTimer: NodeJS.Timeout;
  private isInvalid = false;
  private resultDfd: PromiseDfd<IPoWShareVerificationResult>;

  public constructor(module: PoWModule, session: PoWSession, nonces: number[]) {
    this.shareId = getNewGuid();
    this.module = module;
    this.session = session;
    this.nonces = nonces;
    PoWShareVerification.verifyingShares[this.shareId] = this;
  }

  public getMinerVerifyCount(): number {
    return this.verifyMinerCount;
  }

  public getMinerVerifyMisses(): number {
    return this.verifyMinerCount - Object.keys(this.verifyMinerResults).length;
  }

  public startVerification(): Promise<IPoWShareVerificationResult> {
    if(this.resultDfd)
      return this.resultDfd.promise;

    this.resultDfd = new PromiseDfd<IPoWShareVerificationResult>();
    let powConfig = this.module.getModuleConfig();

    let validatorSessions = this.getVerifierSessions();
    let verifyLocalPercent = powConfig.verifyLocalPercent;
    if(validatorSessions.length < powConfig.verifyMinerPeerCount && powConfig.verifyLocalLowPeerPercent > verifyLocalPercent)
      verifyLocalPercent = powConfig.verifyLocalLowPeerPercent;

    this.verifyLocal = (Math.floor(Math.random() * 100) < verifyLocalPercent);
    if(this.verifyLocal && this.module.getValidator().getValidationQueueLength() >= powConfig.verifyLocalMaxQueue)
      this.verifyLocal = false;

    if(this.verifyLocal) {
      // verify locally
      this.module.getValidator().validateShare(this.shareId, this.nonces, this.session.preImage).then((isValid) => {
        if(!isValid)
          this.isInvalid = true;
        this.completeVerification();
      });
    }
    else if(powConfig.verifyMinerPercent > 0 && validatorSessions.length >= powConfig.verifyMinerPeerCount && (Math.floor(Math.random() * 100) < powConfig.verifyMinerPercent)) {
      // redistribute to validators for verification
      this.verifyMinerCount = powConfig.verifyMinerIndividuals;
      for(let i = 0; i < this.verifyMinerCount; i++) {
        let randSessIdx = Math.floor(Math.random() * validatorSessions.length);
        let validatorSession = validatorSessions.splice(randSessIdx, 1)[0];
        this.verifyMinerSessions.push(validatorSession.getFaucetSession().getSessionId());

        validatorSession.pendingVerifications++;

        validatorSession.activeClient.sendMessage("verify", {
          shareId: this.shareId,
          preimage: this.session.preImage,
          nonces: this.nonces,
        });
      }
      this.verifyMinerTimer = setTimeout(() => {
        this.verifyMinerTimer = null;
        this.completeVerification();
      }, powConfig.verifyMinerTimeout * 1000);
    }
    else {
      // no verification - just accept
      this.completeVerification();
    }

    return this.resultDfd.promise;
  }

  private getVerifierSessions(): PoWSession[] {
    let powConfig = this.module.getModuleConfig();
    let minBalance = BigInt(powConfig.powShareReward) * BigInt(powConfig.verifyMinerMissPenaltyPerc * 100) / 10000n;
    return this.module.getActiveClients().map((client) => client.getPoWSession()).filter((session) => {
      return (
        session !== this.session && 
        session.getFaucetSession().getDropAmount() > minBalance &&
        session.missedVerifications < powConfig.verifyMinerMaxMissed &&
        session.pendingVerifications < powConfig.verifyMinerMaxPending
      );
    });
  }

  public processVerificationResult(verifier: string, isValid: boolean): boolean {
    let validatorIdx = this.verifyMinerSessions.indexOf(verifier);
    if(validatorIdx === -1)
      return false;
    
    this.verifyMinerSessions.splice(validatorIdx, 1);
    this.verifyMinerResults[verifier] = isValid;
    if(!isValid)
      this.isInvalid = true;
    
    if(this.verifyMinerSessions.length === 0)
      setTimeout(() => this.completeVerification(), 0);
    
    return true;
  }

  private completeVerification() {
    let powConfig = this.module.getModuleConfig();
    if(this.verifyMinerTimer) {
      clearTimeout(this.verifyMinerTimer);
      this.verifyMinerTimer = null;
    }

    if(this.isInvalid && !this.verifyLocal) {
      // always verify invalid shares locally
      this.verifyLocal = true;
      this.module.getValidator().validateShare(this.shareId, this.nonces, this.session.preImage).then((isValid) => {
        if(isValid)
          this.isInvalid = false;
        this.completeVerification();
      });
      return;
    }

    delete PoWShareVerification.verifyingShares[this.shareId];

    if(this.verifyMinerSessions.length > 0) {
      // penalty for missed verification requests
      this.verifyMinerSessions.forEach((verifierId) => {
        let verifierFaucetSession = ServiceManager.GetService(SessionManager).getSession(verifierId, [FaucetSessionStatus.RUNNING]);
        if(verifierFaucetSession) {
          let session = this.module.getPoWSession(verifierFaucetSession);
          session.pendingVerifications--;
          session.missedVerifications++;

          let missPenalty = BigInt(powConfig.powShareReward) * BigInt(powConfig.verifyMinerMissPenaltyPerc * 100) / 10000n;
          if(missPenalty > 0n) {
            verifierFaucetSession.subPenalty(missPenalty).then(() => {
              let client: PoWClient;
              if((client = session.activeClient)) {
                client.sendMessage("updateBalance", {
                  balance: verifierFaucetSession.getDropAmount().toString(),
                  reason: "verify miss (penalty: " + missPenalty.toString() + ")"
                });
              }
            });
          }
        }
      });
    }
    
    Object.keys(this.verifyMinerResults).forEach((verifierId) => {
      let verifierFaucetSession = ServiceManager.GetService(SessionManager).getSession(verifierId, [FaucetSessionStatus.RUNNING]);
      if(verifierFaucetSession) {
        let session = this.module.getPoWSession(verifierFaucetSession);
        session.pendingVerifications--;

        if(this.verifyMinerResults[verifierId] !== !this.isInvalid)
          session.slashSession("invalid PoW verification result");
      }
    });

    let shareReward: bigint;
    if(this.isInvalid) {
      this.session.slashSession("invalid PoW result hash");
      shareReward = 0n;
    }
    else {
      // valid share - add rewards
      shareReward = BigInt(powConfig.powShareReward);
      this.session.getFaucetSession().addReward(shareReward).then((amount) => {
        this.session.activeClient?.sendMessage("updateBalance", {
          balance: this.session.getFaucetSession().getDropAmount().toString(),
          reason: "valid share (reward: " + amount.toString() + ")"
        });
      });
    }
    this.resultDfd.resolve({
      isValid: !this.isInvalid,
      reward: shareReward
    });
  }

}
