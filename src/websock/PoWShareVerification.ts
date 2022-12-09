import { faucetConfig } from "../common/FaucetConfig";
import { ServiceManager } from "../common/ServiceManager";
import { getNewGuid } from "../utils/GuidUtils";
import { PromiseDfd } from "../utils/PromiseDfd";
import { PoWValidator } from "../validator/PoWValidator";
import { PoWSessionSlashReason, PoWSession } from "./PoWSession";
import { PoWRewardLimiter } from "../services/PoWRewardLimiter";

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
  private sessionId: string;
  private nonces: number[];
  private verifyLocal = false;
  private verifyMinerCount = 0;
  private verifyMinerSessions: string[] = [];
  private verifyMinerResults: {[sessionId: string]: boolean} = {};
  private verifyMinerTimer: NodeJS.Timeout;
  private isInvalid = false;
  private resultDfd: PromiseDfd<IPoWShareVerificationResult>;

  public constructor(session: PoWSession, nonces: number[]) {
    this.shareId = getNewGuid();
    this.sessionId = session.getSessionId();
    this.nonces = nonces;
    PoWShareVerification.verifyingShares[this.shareId] = this;
  }

  public getVerificationType(): string {
    let types: string[] = [];
    if(this.verifyLocal)
      types.push("local");
    if(this.verifyMinerCount > 0)
      types.push("miner[" + Object.keys(this.verifyMinerResults).length + "/" + this.verifyMinerCount + "]");
    return types.length ? types.join(",") : "none";
  }

  public getMinerVerifyCount(): number {
    return this.verifyMinerCount;
  }

  public getMinerVerifyMisses(): number {
    return this.verifyMinerCount - Object.keys(this.verifyMinerResults).length;
  }

  public startVerification(): Promise<IPoWShareVerificationResult> {
    let session = PoWSession.getSession(this.sessionId);
    if(!session)
      return Promise.reject("session not found");
    if(this.resultDfd)
      return this.resultDfd.promise;

    this.resultDfd = new PromiseDfd<IPoWShareVerificationResult>();

    let validatorSessions = PoWSession.getVerifierSessions(session.getSessionId());
    let verifyLocalPercent = faucetConfig.verifyLocalPercent;
    if(validatorSessions.length < faucetConfig.verifyMinerPeerCount && faucetConfig.verifyLocalLowPeerPercent > verifyLocalPercent)
      verifyLocalPercent = faucetConfig.verifyLocalLowPeerPercent;

    this.verifyLocal = (Math.floor(Math.random() * 100) < verifyLocalPercent);
    if(this.verifyLocal && ServiceManager.GetService(PoWValidator).getValidationQueueLength() >= faucetConfig.verifyLocalMaxQueue)
      this.verifyLocal = false;

    if(this.verifyLocal) {
      // verify locally
      ServiceManager.GetService(PoWValidator).validateShare(this.shareId, this.nonces, session.getPreImage()).then((isValid) => {
        if(!isValid)
          this.isInvalid = true;
        this.completeVerification();
      });
    }
    else if(faucetConfig.verifyMinerPercent > 0 && validatorSessions.length >= faucetConfig.verifyMinerPeerCount && (Math.floor(Math.random() * 100) < faucetConfig.verifyMinerPercent)) {
      // redistribute to validators for verification
      this.verifyMinerCount = faucetConfig.verifyMinerIndividuals;
      for(let i = 0; i < this.verifyMinerCount; i++) {
        let randSessIdx = Math.floor(Math.random() * validatorSessions.length);
        let validatorSession = validatorSessions.splice(randSessIdx, 1)[0];
        this.verifyMinerSessions.push(validatorSession.getSessionId());
        validatorSession.addPendingVerification();

        validatorSession.getActiveClient().sendMessage("verify", {
          shareId: this.shareId,
          preimage: session.getPreImage(),
          nonces: this.nonces,
        });
      }
      this.verifyMinerTimer = setTimeout(() => {
        this.verifyMinerTimer = null;
        this.completeVerification();
      }, faucetConfig.verifyMinerTimeout * 1000);
    }
    else {
      // no verification - just accept
      this.completeVerification();
    }

    return this.resultDfd.promise;
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
      this.completeVerification();
    
    return true;
  }

  private completeVerification() {
    if(this.verifyMinerTimer) {
      clearTimeout(this.verifyMinerTimer);
      this.verifyMinerTimer = null;
    }
    let session = PoWSession.getSession(this.sessionId);
    if(!session) {
      this.resultDfd.reject("session not found");
      delete PoWShareVerification.verifyingShares[this.shareId];
      return;
    }

    if(this.isInvalid && !this.verifyLocal) {
      // always verify invalid shares locally
      this.verifyLocal = true;
      ServiceManager.GetService(PoWValidator).validateShare(this.shareId, this.nonces, session.getPreImage()).then((isValid) => {
        if(isValid)
          this.isInvalid = false;
        this.completeVerification();
      });
      return;
    }

    delete PoWShareVerification.verifyingShares[this.shareId];

    if(this.verifyMinerSessions.length > 0 && faucetConfig.verifyMinerMissPenalty > 0) {
      // penalty for missed verification requests
      this.verifyMinerSessions.forEach((verifierId) => {
        let session = PoWSession.getSession(verifierId);
        if(session) {
          session.subPendingVerification();
          session.addMissedVerification();
          session.slashBadSession(PoWSessionSlashReason.MISSED_VERIFICATION);
        }
      });
    }
    
    Object.keys(this.verifyMinerResults).forEach((verifierId) => {
      let session = PoWSession.getSession(verifierId);
      if(session) {
        session.subPendingVerification();
        if(this.verifyMinerResults[verifierId] !== !this.isInvalid && session)
          session.slashBadSession(PoWSessionSlashReason.INVALID_VERIFICATION);
      }
    });

    let shareReward: bigint;
    if(this.isInvalid) {
      session.slashBadSession(PoWSessionSlashReason.INVALID_SHARE);
      shareReward = 0n;
    }
    else {
      // valid share - add rewards
      shareReward = ServiceManager.GetService(PoWRewardLimiter).getShareReward(session);
      session.addBalance(shareReward);
      
      if(session.getActiveClient()) {
        session.getActiveClient().sendMessage("updateBalance", {
          balance: session.getBalance().toString(),
          recovery: session.getSignedSession(),
          reason: "valid share"
        });
      }
    }
    this.resultDfd.resolve({
      isValid: !this.isInvalid,
      reward: shareReward
    });
  }

}
