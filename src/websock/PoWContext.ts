
import { faucetConfig } from '../common/FaucetConfig';
import { getNewGuid } from '../utils/GuidUtils';
import { PoWValidator } from '../validator/PoWValidator';
import { IPoWSessionSlashReason, PoWSession } from './PoWSession';
import { ServiceManager } from '../common/ServiceManager';

export interface IPowShare {
  shareId: string;
  sessionId: string;
  nonces: number[];
  verifyLocal: boolean;
  verifyMinerCount: number;
  verifyMinerSessions: string[];
  verifyMinerResults: {[sessionId: string]: boolean};
  verifyMinerTimer: NodeJS.Timeout;
  isInvalid: boolean;
}

export class PoWContext {
  private static verifyingShares: {[id: string]: IPowShare} = {};

  public static getPoWParamsStr(): string {
    return faucetConfig.powScryptParams.cpuAndMemory +
      "|" + faucetConfig.powScryptParams.blockSize +
      "|" + faucetConfig.powScryptParams.paralellization +
      "|" + faucetConfig.powScryptParams.keyLength +
      "|" + faucetConfig.powScryptParams.difficulty;
  }

  public static processUnverifiedShare(session: PoWSession, nonces: number[]) {
    let share: IPowShare = {
      shareId: getNewGuid(),
      sessionId: session.getSessionId(),
      nonces: nonces,
      verifyLocal: false,
      verifyMinerCount: 0,
      verifyMinerSessions: [],
      verifyMinerResults: {},
      verifyMinerTimer: null,
      isInvalid: false,
    };
    this.verifyingShares[share.shareId] = share;

    // verify share
    let validatorSessions = PoWSession.getVerifierSessions(session.getSessionId());
    let verifyLocalPercent = faucetConfig.verifyLocalPercent;
    if(validatorSessions.length < faucetConfig.verifyMinerPeerCount && faucetConfig.verifyLocalLowPeerPercent > verifyLocalPercent)
      verifyLocalPercent = faucetConfig.verifyLocalLowPeerPercent;

    share.verifyLocal = (Math.round(Math.random() * 100) < verifyLocalPercent);
    if(share.verifyLocal && ServiceManager.GetService(PoWValidator).getValidationQueueLength() >= faucetConfig.verifyLocalMaxQueue)
      share.verifyLocal = false;

    if(share.verifyLocal) {
      // verify locally
      console.log("share " + share.shareId + ": validate locally");
      ServiceManager.GetService(PoWValidator).validateShare(share, session.getPreImage()).then((isValid) => {
        if(!isValid)
          share.isInvalid = true;
        this.processShareVerification(share);
      });
    }
    else if(faucetConfig.verifyMinerPercent > 0 && validatorSessions.length >= faucetConfig.verifyMinerPeerCount && (Math.round(Math.random() * 100) < faucetConfig.verifyMinerPercent)) {
      // redistribute to validators for verification
      share.verifyMinerCount = faucetConfig.verifyMinerIndividuals;
      console.log("share " + share.shareId + ": validate via miners");
      for(let i = 0; i < share.verifyMinerCount; i++) {
        let randSessIdx = Math.floor(Math.random() * validatorSessions.length);
        let validatorSession = validatorSessions.splice(randSessIdx, 1)[0];
        share.verifyMinerSessions.push(validatorSession.getSessionId());

        validatorSession.getActiveClient().sendMessage("verify", {
          shareId: share.shareId,
          preimage: session.getPreImage(),
          nonces: share.nonces,
        });
      }
      share.verifyMinerTimer = setTimeout(() => {
        share.verifyMinerTimer = null;
        this.processShareVerification(share);
      }, 15 * 1000);
    }
    else {
      // no verification - just accept
      console.log("share " + share.shareId + ": no validation");
      this.processShareVerification(share);
    }
  }

  public static processrShareVerificationResult(shareId: string, verifier: string, isValid: boolean) {
    if(!this.verifyingShares[shareId])
      return;
    let share = this.verifyingShares[shareId];
    
    let validatorIdx = share.verifyMinerSessions.indexOf(verifier);
    if(validatorIdx === -1)
      return;
    
    share.verifyMinerSessions.splice(validatorIdx, 1);
    share.verifyMinerResults[verifier] = isValid;
    
    if(share.verifyMinerSessions.length === 0)
      this.processShareVerification(share);
  }

  private static processShareVerification(share: IPowShare) {
    if(share.verifyMinerTimer) {
      clearTimeout(share.verifyMinerTimer);
    }
    let session = PoWSession.getSession(share.sessionId);
    if(!session) {
      delete this.verifyingShares[share.shareId];
      return;
    }

    if(share.isInvalid && !share.verifyLocal) {
      // always verify invalid shares locally
      share.verifyLocal = true;
      ServiceManager.GetService(PoWValidator).validateShare(share, session.getPreImage()).then((isValid) => {
        if(isValid)
          share.isInvalid = false;
        this.processShareVerification(share);
      });
      return;
    }

    delete this.verifyingShares[share.shareId];

    if(share.verifyMinerSessions.length > 0 && faucetConfig.verifyMinerMissPenalty > 0) {
      // penalty for missed verification requests
      share.verifyMinerSessions.forEach((verifierId) => {
        let session = PoWSession.getSession(verifierId);
        if(session)
          session.slashBadSession(IPoWSessionSlashReason.MISSED_VERIFICATION);
      });
    }
    
    Object.keys(share.verifyMinerResults).forEach((verifierId) => {
      let session = PoWSession.getSession(verifierId);
      if(share.verifyMinerResults[verifierId] !== !share.isInvalid && session)
        session.slashBadSession(IPoWSessionSlashReason.INVALID_VERIFICATION);
    });

    if(share.isInvalid)
      session.slashBadSession(IPoWSessionSlashReason.INVALID_SHARE);
    else {
      // valid share - add rewards
      session.addBalance(faucetConfig.powShareReward);
      if(session.getActiveClient()) {
        session.getActiveClient().sendMessage("updateBalance", {
          balance: session.getBalance(),
          recovery: session.getSignedSession(),
          reason: "valid share"
        });
      }
    }
  }
  

}
