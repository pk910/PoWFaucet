import fs from 'fs';
import path from 'path';

import { PassportVerifier as PassportVerifierSDK } from "@gitcoinco/passport-sdk-verifier";
import { Passport } from '@gitcoinco/passport-sdk-types';
import { faucetConfig } from '../common/FaucetConfig';
import { PoWStatusLog, PoWStatusLogLevel } from "../common/PoWStatusLog";
import { ServiceManager } from '../common/ServiceManager';
import { FaucetStore } from './FaucetStore';

export interface IPassportInfo {
  found: boolean;
  parsed: number;
  newest: number;
  stamps?: {
    provider: string;
    expiration: number;
  }[];
  _score?: IPassportScore;
}

export interface IPassportScore {
  nonce: number;
  score: number;
  factor: number;
}

export interface IPassportVerification {
  valid: boolean;
  errors: string[];
  newest?: number;
  info?: IPassportInfo;
}

export class PassportVerifier {
  private readyPromise: Promise<void>;
  private passportVerifier: PassportVerifierSDK;
  private passportCache: {[ip: string]: Promise<IPassportInfo>} = {};
  private passportScoreNonce = 1;

  public constructor() {
    this.passportVerifier = new PassportVerifierSDK();
    this.readyPromise = this.passportVerifier.init();
    
    ServiceManager.GetService(PoWStatusLog).addListener("reload", () => {
      this.passportScoreNonce++; // refresh cached scores on config reload
    });
  }

  public async getPassport(addr: string, refresh?: boolean): Promise<IPassportInfo> {
    if(!faucetConfig.passportBoost)
      return null;
    if(this.passportCache.hasOwnProperty(addr))
      return this.passportCache[addr];
    
    let now = Math.floor((new Date()).getTime() / 1000);
    let faucetStore = ServiceManager.GetService(FaucetStore);
    let cachedPassportInfo = faucetStore.getPassportInfo(addr);
    let passportPromise: Promise<IPassportInfo>;

    if(cachedPassportInfo && !refresh && cachedPassportInfo.parsed > now - (faucetConfig.passportBoost.cacheTime || 60)) {
      passportPromise = Promise.resolve(cachedPassportInfo);
    }
    else {
      passportPromise = this.passportCache[addr] = this.refreshPassport(addr);
      passportPromise.then((passportInfo) => {
        faucetStore.setPassportInfo(addr, passportInfo);
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

  private async refreshPassport(addr: string): Promise<IPassportInfo> {
    let cacheFile = this.getPassportCacheFile(addr);
    let cachedPassportInfo: IPassportInfo = null;
    if(cacheFile && fs.existsSync(cacheFile)) {
      let cachedPassport = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      cachedPassportInfo = this.parsePassportInfo(cachedPassport);
    }

    let passportInfo: IPassportInfo = null;
    try {
      let passport = await this.passportVerifier.verifyPassport(addr);
      if(passport) {
        passportInfo = this.parsePassportInfo(passport);

        if(cachedPassportInfo && (!passportInfo.found || cachedPassportInfo.newest > passportInfo.newest)) {
          // passport from cache is newer.. so use the cached one
          return cachedPassportInfo
        }
        if(cacheFile) {
          // save to cache
          this.savePassportToCache(passport, cacheFile);
        }
      }
    } catch(ex) {
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.WARNING, "Exception while fetching passport: " + ex.toString() + `\r\n   Stack Trace: ${ex && ex.stack ? ex.stack : null}`);
    }

    return passportInfo || cachedPassportInfo || { 
      found: false,
      parsed: Math.floor((new Date()).getTime() / 1000),
      newest: 0,
    };
  }

  private getPassportCacheFile(addr: string): string {
    if(!faucetConfig.passportBoost || !faucetConfig.passportBoost.passportCachePath)
      return null;
    
    let cacheFile: string;
    if(faucetConfig.passportBoost.passportCachePath.match(/^\//))
      cacheFile = faucetConfig.passportBoost.passportCachePath;
    else
      cacheFile = path.join(faucetConfig.appBasePath, faucetConfig.passportBoost.passportCachePath);
    cacheFile = path.join(cacheFile, "passport-" + addr.replace(/[^a-f0-9x]+/gi, "").toLowerCase() + ".json");
    return cacheFile;
  }

  private parsePassportInfo(passport: Passport): IPassportInfo {
    let now = Math.floor((new Date()).getTime() / 1000);
    let newestStamp = 0;
    let stamps = passport.stamps.map((stamp) => {
      let issuanceTime = Math.floor((new Date(stamp.credential.issuanceDate)).getTime() / 1000);
      if(issuanceTime > newestStamp)
      newestStamp = issuanceTime;

      let expirationTime = Math.floor((new Date(stamp.credential.expirationDate)).getTime() / 1000);
      return {
        provider: stamp.provider as string,
        expiration: expirationTime,
      };
    })

    return {
      found: true,
      parsed: now,
      newest: newestStamp,
      stamps: stamps,
    };
  }

  public async verifyUserPassport(addr: string, passport: Passport): Promise<IPassportVerification> {
    if(!faucetConfig.passportBoost)
      return {valid: false, errors: ["Passport Boost disabled"]};
    if(!faucetConfig.passportBoost.trustedIssuers || faucetConfig.passportBoost.trustedIssuers.length == 0)
      return {valid: false, errors: ["Manual passport verification disabled"]};
    
    await this.readyPromise;

    let verifyResult: IPassportVerification = {
      valid: null,
      errors: [],
      newest: 0,
    }
    var DIDKit = this.passportVerifier._DIDKit;
    var providerMap = {};
    
    // verify passport
    let now = Math.floor((new Date()).getTime() / 1000);
    await Promise.all(passport.stamps.map(async (stamp) => {
      let issuanceTime = Math.floor((new Date(stamp.credential.issuanceDate)).getTime() / 1000);
      if(issuanceTime > verifyResult.newest) {
        verifyResult.newest = issuanceTime;
      }

      // verify stamp provider
      if(stamp.provider !== stamp.credential.credentialSubject.provider) {
        verifyResult.errors.push("Stamp '" + stamp.provider + "' invalid: credentialSubject.provider missmatch");
        return;
      }

      // verify provider uniqueness
      if(providerMap.hasOwnProperty(stamp.provider.toLowerCase())) {
        verifyResult.errors.push("Stamp '" + stamp.provider + "' invalid: duplicate provider");
        return;
      }
      providerMap[stamp.provider.toLowerCase()] = true;

      // verify the stamp subject address
      let stampAddress = stamp.credential.credentialSubject.id.replace("did:pkh:eip155:1:", "").toLowerCase();
      if(stampAddress !== addr.toLowerCase()) {
        verifyResult.errors.push("Stamp '" + stamp.provider + "' invalid: credentialSubject.id missmatch");
        return;
      }

      // verify stamp issuer
      if(faucetConfig.passportBoost.trustedIssuers.indexOf(stamp.credential.issuer) === -1) {
        verifyResult.errors.push("Stamp '" + stamp.provider + "' invalid: issuer not trusted")
        return;
      }

      // verify expiration date
      let expirationTime = Math.floor((new Date(stamp.credential.expirationDate)).getTime() / 1000);
      if(expirationTime < now) {
        verifyResult.errors.push("Stamp '" + stamp.provider + "' invalid: stamp expired")
        return;
      }
      
      // verify cryptographic stamp integrity
      let verifyResJson = await DIDKit.verifyCredential(JSON.stringify(stamp.credential), JSON.stringify({
        proofPurpose: stamp.credential.proof.proofPurpose
      }));
      let verifyRes = JSON.parse(verifyResJson);
      if(!verifyRes.checks || verifyRes.checks.indexOf("proof") === -1) {
        verifyResult.errors.push("Stamp '" + stamp.provider + "' invalid: proof check failed");
        return;
      }

      if(verifyRes.errors && verifyRes.errors.length > 0) {
        verifyResult.errors.push("Stamp '" + stamp.provider + "' invalid: integrity check failed (" + verifyRes.errors.join(", ") + ")");
        return;
      }
    }));

    verifyResult.valid = (verifyResult.errors.length === 0);
    verifyResult.info = this.parsePassportInfo(passport);
    //console.log("[PassportVerifier] verify info ", verifyResult.info);

    if(verifyResult.valid) {
      // save to cache
      let cacheFile = this.getPassportCacheFile(addr);
      let haveNewer = false;
      if(cacheFile && fs.existsSync(cacheFile)) {
        let cachedPassport = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
        let cachedPassportInfo = this.parsePassportInfo(cachedPassport);
        haveNewer = cachedPassportInfo.found && (cachedPassportInfo.newest > verifyResult.info.newest);
      }
      if(haveNewer) {
        // prevent reverting to an older passport!
        verifyResult.valid = false;
        verifyResult.errors.push("Cannot update to an older passport");
      } else if(cacheFile) {
        this.savePassportToCache(passport, cacheFile);
      }
    }
    
    return verifyResult;
  }

  private savePassportToCache(passport: Passport, cacheFile: string) {
    let trimmedPassport: Passport = {
      issuanceDate: passport.issuanceDate,
      expiryDate: passport.expiryDate,
      stamps: passport.stamps.map((stamp) => {
        return {
          provider: stamp.provider,
          credential: stamp.credential
        }
      })
    };
    fs.writeFileSync(cacheFile, JSON.stringify(trimmedPassport));
  }

  public getPassportScore(passportInfo: IPassportInfo): IPassportScore {
    if(!passportInfo)
      return null;
    if(passportInfo._score && passportInfo._score.nonce == this.passportScoreNonce)
      return passportInfo._score;
    
    // calculate score
    let now = Math.floor((new Date()).getTime() / 1000);
    let totalScore = 0;
    if(passportInfo.found && passportInfo.stamps) {
      passportInfo.stamps.forEach((stamp) => {
        if(stamp.expiration < now)
          return;
        
        let stampScore = faucetConfig.passportBoost.stampScoring[stamp.provider];
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
