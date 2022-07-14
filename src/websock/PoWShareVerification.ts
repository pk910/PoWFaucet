import { faucetConfig } from "../common/FaucetConfig";
import { ServiceManager } from "../common/ServiceManager";
import { IIPInfo, IPInfoResolver } from "../services/IPInfoResolver";
import { getNewGuid } from "../utils/GuidUtils";
import { PromiseDfd } from "../utils/PromiseDfd";
import { PoWValidator } from "../validator/PoWValidator";
import { PoWSessionSlashReason, PoWSession } from "./PoWSession";
import * as fs from 'fs';
import * as path from 'path';
import { EthWeb3Manager } from "../services/EthWeb3Manager";

export interface IPoWShareVerificationResult {
  isValid: boolean;
  reward: number;
}

export class PoWShareVerification {
  private static verifyingShares: {[id: string]: PoWShareVerification} = {};
  private static ipInfoMatchRestrictions: {}
  private static ipInfoMatchRestrictionsRefresh: number;

  public static processVerificationResult(shareId: string, verifier: string, isValid: boolean) {
    if(!this.verifyingShares[shareId])
      return;
    this.verifyingShares[shareId].processVerificationResult(verifier, isValid);
  }

  private static refreshIpInfoMatchRestrictions() {
    let now = Math.floor((new Date()).getTime() / 1000);
    let refresh = faucetConfig.ipInfoMatchRestrictedRewardFile ? faucetConfig.ipInfoMatchRestrictedRewardFile.refresh : 30;
    if(this.ipInfoMatchRestrictionsRefresh > now - refresh)
      return;
    
    this.ipInfoMatchRestrictionsRefresh = now;
    this.ipInfoMatchRestrictions = Object.assign({}, faucetConfig.ipInfoMatchRestrictedReward);
    
    if(faucetConfig.ipInfoMatchRestrictedRewardFile && faucetConfig.ipInfoMatchRestrictedRewardFile.file && fs.existsSync(faucetConfig.ipInfoMatchRestrictedRewardFile.file)) {
      fs.readFileSync(faucetConfig.ipInfoMatchRestrictedRewardFile.file, "utf8").split(/\r?\n/).forEach((line) => {
        let match = /^([0-9]{1,2}): (.*)$/.exec(line);
        if(!match)
          return;
        this.ipInfoMatchRestrictions[match[2]] = parseInt(match[1]);
      });
    }
  }

  private static getIPInfoString(ipaddr: string, ipinfo: IIPInfo, ethaddr: string) {
    let infoStr = [
      "ETH: " + ethaddr,
      "IP: " + ipaddr,
      "Country: " + ipinfo.countryCode,
      "Region: " + ipinfo.regionCode,
      "City: " + ipinfo.city,
      "ISP: " + ipinfo.isp,
      "Org: " + ipinfo.org,
      "AS: " + ipinfo.as,
      "Proxy: " + (ipinfo.proxy ? "true" : "false"),
      "Hosting: " + (ipinfo.hosting ? "true" : "false")
    ].join("\n");
    return infoStr;
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

  public processVerificationResult(verifier: string, isValid: boolean) {
    let validatorIdx = this.verifyMinerSessions.indexOf(verifier);
    if(validatorIdx === -1)
      return;
    
    this.verifyMinerSessions.splice(validatorIdx, 1);
    this.verifyMinerResults[verifier] = isValid;
    
    if(this.verifyMinerSessions.length === 0)
      this.completeVerification();
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

    let shareReward: number;
    if(this.isInvalid) {
      session.slashBadSession(PoWSessionSlashReason.INVALID_SHARE);
      shareReward = 0;
    }
    else {
      // valid share - add rewards
      shareReward = faucetConfig.powShareReward;

      if(faucetConfig.faucetBalanceRestrictedReward) {
        // apply balance restriction if faucet wallet is low on funds
        let restrictedReward = 100;

        let minbalances = Object.keys(faucetConfig.faucetBalanceRestrictedReward).map((v) => parseInt(v)).sort();
        let faucetBalance = ServiceManager.GetService(EthWeb3Manager).getFaucetBalance();
        if(faucetBalance <= minbalances[minbalances.length - 1]) {
          for(let i = 0; i < minbalances.length; i++) {
            if(faucetBalance > minbalances[i])
              break;
            if(faucetConfig.faucetBalanceRestrictedReward[minbalances[i]] < restrictedReward)
              restrictedReward = faucetConfig.faucetBalanceRestrictedReward[minbalances[i]];
          }
        }

        if(restrictedReward < 100)
          shareReward = Math.floor(shareReward / 100 * restrictedReward);
      }

      let sessionIpInfo: IIPInfo;
      if((sessionIpInfo = session.getLastIpInfo())) {
        let restrictedReward = 100;

        if(faucetConfig.ipRestrictedRewardShare) {
          if(sessionIpInfo.hosting && typeof faucetConfig.ipRestrictedRewardShare.hosting === "number" && faucetConfig.ipRestrictedRewardShare.hosting < restrictedReward)
            restrictedReward = faucetConfig.ipRestrictedRewardShare.hosting;
          if(sessionIpInfo.proxy && typeof faucetConfig.ipRestrictedRewardShare.proxy === "number" && faucetConfig.ipRestrictedRewardShare.proxy < restrictedReward)
            restrictedReward = faucetConfig.ipRestrictedRewardShare.proxy;
          if(sessionIpInfo.countryCode && typeof faucetConfig.ipRestrictedRewardShare[sessionIpInfo.countryCode] === "number" && faucetConfig.ipRestrictedRewardShare[sessionIpInfo.countryCode] < restrictedReward)
            restrictedReward = faucetConfig.ipRestrictedRewardShare[sessionIpInfo.countryCode];
        }
        if(faucetConfig.ipInfoMatchRestrictedReward || faucetConfig.ipInfoMatchRestrictedRewardFile) {
          PoWShareVerification.refreshIpInfoMatchRestrictions();
          let infoStr = PoWShareVerification.getIPInfoString(session.getLastRemoteIp(), sessionIpInfo, session.getTargetAddr());
          Object.keys(PoWShareVerification.ipInfoMatchRestrictions).forEach((pattern) => {
            if(infoStr.match(new RegExp(pattern, "mi")) && PoWShareVerification.ipInfoMatchRestrictions[pattern] < restrictedReward)
              restrictedReward = PoWShareVerification.ipInfoMatchRestrictions[pattern];
          });
        }
        
        if(restrictedReward < 100)
          shareReward = Math.floor(shareReward / 100 * restrictedReward);
      }

      session.addBalance(shareReward);
      if(session.getActiveClient()) {
        session.getActiveClient().sendMessage("updateBalance", {
          balance: session.getBalance(),
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
