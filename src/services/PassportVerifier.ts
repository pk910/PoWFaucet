import { PassportVerifier as PassportVerifierSDK } from "@gitcoinco/passport-sdk-verifier";
import { Passport } from '@gitcoinco/passport-sdk-types';
import { faucetConfig } from '../common/FaucetConfig';
import { PoWStatusLog } from "../common/PoWStatusLog";
import { ServiceManager } from '../common/ServiceManager';
import { FaucetStore } from './FaucetStore';

export interface IPassportInfo {
  found: boolean;
  time: number;
  stamps?: string[];
  _score?: IPassportScore;
}

export interface IPassportScore {
  nonce: number;
  score: number;
  factor: number;
}

export class PassportVerifier {
  private passportVerifier: PassportVerifierSDK;
  private passportCache: {[ip: string]: Promise<IPassportInfo>} = {};
  private passportScoreNonce = 1;

  public constructor() {
    this.passportVerifier = new PassportVerifierSDK();
    
    ServiceManager.GetService(PoWStatusLog).addListener("reload", () => {
      this.passportScoreNonce++; // refresh cached scores on config reload
    });
  }

  public getPassport(addr: string, refresh?: boolean): Promise<IPassportInfo> {
    if(!faucetConfig.passportBoost)
      return null;
    if(this.passportCache.hasOwnProperty(addr))
      return this.passportCache[addr];
    
    let now = Math.floor((new Date()).getTime() / 1000);
    let cachedPassportInfo = ServiceManager.GetService(FaucetStore).getPassportInfo(addr);
    let passportPromise: Promise<IPassportInfo>;

    if(cachedPassportInfo && !refresh && now - cachedPassportInfo.time < (faucetConfig.passportBoost.cacheTime || 60)) {
      passportPromise = Promise.resolve(cachedPassportInfo);
    }
    else {
      passportPromise = this.passportCache[addr] = this.passportVerifier.verifyPassport(addr).then((passport: Passport) => {
        if(!passport) {
          return {
            found: false,
            time: now,
          };
        }
        
        return {
          found: true,
          time: now,
          stamps: passport.stamps.map((stamp) => {
            return stamp.provider as string;
          }),
        };

      });
      passportPromise.finally(() => {
        delete this.passportCache[addr];
      });
    }

    passportPromise.then((passportInfo) => {
      if(!passportInfo.hasOwnProperty("_score")) {
        Object.defineProperty(passportInfo, "_score", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: null
        });
      }
    })

    return passportPromise;
  }

  public getPassportScore(passportInfo: IPassportInfo): IPassportScore {
    if(passportInfo._score && passportInfo._score.nonce == this.passportScoreNonce)
      return passportInfo._score;
    
    // calculate score
    let totalScore = 0;
    if(passportInfo.found && passportInfo.stamps) {
      passportInfo.stamps.forEach((stamp) => {
        let stampScore = faucetConfig.passportBoost.stampScoring[stamp];
        if(typeof stampScore === "number") {
          totalScore += stampScore;
        }
      });
    }

    // get highest boost factor for score
    let boostFactor = 1;
    Object.keys(faucetConfig.passportBoost.boostFactor).forEach((minScore) => {
      if(totalScore >= parseInt(minScore)) {
        let factor = faucetConfig.passportBoost.boostFactor[minScore];
        if(factor > boostFactor) {
          boostFactor = factor;
        }
      }
    });

    return passportInfo._score = {
      nonce: this.passportScoreNonce,
      score: totalScore,
      factor: boostFactor,
    };
  }

}
