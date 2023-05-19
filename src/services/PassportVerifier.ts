import fs from 'fs';
import path from 'path';

import { faucetConfig } from '../common/FaucetConfig';
import { FaucetProcess, FaucetLogLevel } from "../common/FaucetProcess";
import { ServiceManager } from '../common/ServiceManager';
import { FaucetStoreDB } from './FaucetStoreDB';

type DIDKitLib = {
  verifyCredential: (vc: string, proofOptions: string) => Promise<string>;
  issueCredential: (credential: string, proofOptions: string, key: string) => Promise<string>;
  keyToDID: (method_pattern: string, jwk: string) => string;
  keyToVerificationMethod: (method_pattern: string, jwk: string) => Promise<string>;
} & { [key: string]: any };

export interface IPassport {
  issuanceDate: string;
  expiryDate: string;
  stamps: {
    provider: string;
    credential: IPassportCredential;
  }[];
}

export interface IPassportCredential {
  type: string[],
  proof: object,
  issuer: string;
  issuanceDate: string;
  expirationDate: string;
  credentialSubject: {
    id: string;
    hash: string;
    provider: string;
  };
}

export interface IPassportInfo {
  found: boolean;
  parsed: number;
  newest: number;
  stamps?: IPassportStampInfo[];
  _score?: IPassportScore;
}

export interface IPassportStampInfo {
  provider: string;
  expiration: number;
  duplicate?: string;
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
  passport?: IPassport;
}

export interface IPassportVerificationResult extends IPassportVerification {
  passportInfo?: IPassportInfo;
}

export class PassportVerifier {
  private didkitPromise: Promise<DIDKitLib>;
  private passportCache: {[addr: string]: Promise<IPassportInfo>} = {};
  private passportScoreNonce = 1;

  public constructor() {
    this.didkitPromise = import("@spruceid/didkit-wasm");
    ServiceManager.GetService(FaucetProcess).addListener("reload", () => {
      this.passportScoreNonce++; // refresh cached scores on config reload
    });
  }


  public async getPassport(addr: string, refresh?: boolean): Promise<IPassportInfo> {
    if(!faucetConfig.passportBoost)
      return null;
    if(this.passportCache.hasOwnProperty(addr))
      return this.passportCache[addr];
    
    let now = Math.floor((new Date()).getTime() / 1000);
    let faucetStore = ServiceManager.GetService(FaucetStoreDB);
    let cachedPassportInfo = faucetStore.getPassportInfo(addr);
    let passportInfoPromise: Promise<IPassportInfo>;

    if(cachedPassportInfo && !refresh && cachedPassportInfo.parsed > now - (faucetConfig.passportBoost.cacheTime || 60)) {
      passportInfoPromise = Promise.resolve(cachedPassportInfo);
    }
    else {
      passportInfoPromise = this.passportCache[addr] = this.refreshPassport(addr).then((passport) => {
        return this.buildPassportInfo(addr, passport);
      });
      passportInfoPromise.finally(() => {
        delete this.passportCache[addr];
      });
    }

    passportInfoPromise.then((passportInfo) => {
      if(!passportInfo.hasOwnProperty("_score")) {
        Object.defineProperty(passportInfo, "_score", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: null
        });
      }
    })

    return passportInfoPromise;
  }

  public async verifyUserPassport(addr: string, passportJson: string): Promise<IPassportVerificationResult> {
    if(!faucetConfig.passportBoost)
      return {valid: false, errors: ["Passport Boost disabled"]};
    if(!faucetConfig.passportBoost.trustedIssuers || faucetConfig.passportBoost.trustedIssuers.length == 0)
      return {valid: false, errors: ["Manual passport verification disabled"]};

    let passport: IPassport;
    try {
      passport = JSON.parse(passportJson);
    } catch(ex) {
      return {valid: false, errors: ["Invalid Passport JSON! Please copy your passport JSON from https://passport.gitcoin.co"]};
    }

    if(!passport || typeof passport !== "object" || !passport.stamps || !Array.isArray(passport.stamps))
      return {valid: false, errors: ["Invalid Passport JSON! Please copy your passport JSON from https://passport.gitcoin.co"]};

    // verify integrity
    let verifyResult = await this.verifyPassportIntegrity(addr, passport);
    if(!verifyResult.valid || !verifyResult.passport)
      return verifyResult;

    // refresh passport if neccesary
    passport = await this.refreshPassport(addr, verifyResult.passport);
    if(passport !== verifyResult.passport)
      return {valid: false, errors: ["Cannot update to an older passport"]};
    
    return {
      ...verifyResult,
      passportInfo: this.buildPassportInfo(addr, passport)
    };
  }

  private getNewestPassportStampTime(passport: IPassport): number {
    let newest = 0;
    if(passport.stamps) {
      for(let i = 0; i < passport.stamps.length; i++) {
        let issuanceTime = Math.floor((new Date(passport.stamps[i].credential.issuanceDate)).getTime() / 1000);
        if(issuanceTime > newest) {
          newest = issuanceTime;
        }
      }
    }
    return newest;
  }

  private async refreshPassport(addr: string, passport?: IPassport): Promise<IPassport> {
    let cacheFile = this.getPassportCacheFile(addr);
    let cachedPassport: IPassport = null;
    if(cacheFile && fs.existsSync(cacheFile)) {
      cachedPassport = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    }
    try {
      if(!passport) {
        // load passport from api
        let passportRsp = await fetch("https://api.scorer.gitcoin.co/registry/stamps/" + addr, {
          method: 'GET',
          headers: {'X-API-KEY': faucetConfig.passportBoost.scorerApiKey}
        }).then((rsp) => rsp.json());
        let gotPassport = passportRsp && passportRsp.items && passportRsp.items.length > 0;
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Requested gitcoin passport for " + addr + ": " + (gotPassport ? "got " + passportRsp.items.length + " stamps" : "no passport"));
        if(gotPassport) {
          passport = {
            issuanceDate: null,
            expiryDate: null,
            stamps: passportRsp.items.map((item) => {
              return {
                provider: item.credential.credentialSubject.provider,
                credential: item.credential,
              };
            }),
          };
        }
      }
      if(passport) {
        if(cachedPassport && this.getNewestPassportStampTime(cachedPassport) > this.getNewestPassportStampTime(passport)) {
          // passport from cache is newer.. so use the cached one
          return cachedPassport;
        }
        if(cacheFile) {
          // save to cache
          this.savePassportToCache(passport, cacheFile);
        }
      }
    } catch(ex) {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Exception while fetching passport: " + ex.toString() + `\r\n   Stack Trace: ${ex && ex.stack ? ex.stack : null}`);
    }
    return passport || cachedPassport || null;
  }

  private async verifyPassportIntegrity(addr: string, passport: IPassport): Promise<IPassportVerification> {
    let DIDKit = await this.didkitPromise;

    let verifyResult: IPassportVerification = {
      valid: null,
      errors: [],
      newest: 0,
    }
    let providerMap = {};
    
    // verify passport

    let now = Math.floor((new Date()).getTime() / 1000);
    await Promise.all(passport.stamps.map(async (stamp) => {
      let issuanceTime = Math.floor((new Date(stamp.credential.issuanceDate)).getTime() / 1000);
      if(issuanceTime > verifyResult.newest) {
        verifyResult.newest = issuanceTime;
      }

      // verify stamp provider
      if(stamp.provider !== stamp.credential.credentialSubject.provider) {
        verifyResult.errors.push("Stamp '" + stamp.provider + "' invalid: stamp provider doesn't match credentialSubject.provider (don't play around with the JSON!!!)");
        return;
      }

      // verify provider uniqueness
      if(providerMap.hasOwnProperty(stamp.provider.toLowerCase())) {
        verifyResult.errors.push("Stamp '" + stamp.provider + "' invalid: duplicate provider (don't play around with the JSON!!!)");
        return;
      }
      providerMap[stamp.provider.toLowerCase()] = true;

      // verify the stamp subject address
      let stampAddress = stamp.credential.credentialSubject.id.replace("did:pkh:eip155:1:", "").toLowerCase();
      if(stampAddress !== addr.toLowerCase()) {
        verifyResult.errors.push("Stamp '" + stamp.provider + "' invalid: not signed for expected wallet (signed for " + stampAddress + ")");
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
        proofPurpose: (stamp.credential.proof as any).proofPurpose
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
    verifyResult.passport = passport;
    //console.log("[PassportVerifier] verify info ", verifyResult.info);
    
    return verifyResult;
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

  private savePassportToCache(passport: IPassport, cacheFile: string) {
    let trimmedPassport: IPassport = {
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

  private buildPassportInfo(addr: string, passport: IPassport): IPassportInfo {
    let passportInfo: IPassportInfo;
    let faucetStore = ServiceManager.GetService(FaucetStoreDB);
    let now = Math.floor((new Date()).getTime() / 1000);

    if(passport) {
      let stampHashes = passport.stamps.map((stamp) => stamp.credential.credentialSubject.hash);
      let stampAssignments = faucetStore.getPassportStamps(stampHashes);
      
      let newestStamp = 0;
      let stamps: IPassportStampInfo[] = [];
      for(let i = 0; i < passport.stamps.length; i++) {
        let stamp = passport.stamps[i];
        let issuanceTime = Math.floor((new Date(stamp.credential.issuanceDate)).getTime() / 1000);
        if(issuanceTime > newestStamp)
          newestStamp = issuanceTime;
        
        let expirationTime = Math.floor((new Date(stamp.credential.expirationDate)).getTime() / 1000);
        let stampInfo: IPassportStampInfo = {
          provider: stamp.provider as string,
          expiration: expirationTime,
        };

        // check duplicate use
        let assignedAddr = stampAssignments[stamp.credential.credentialSubject.hash];
        if(assignedAddr && assignedAddr.toLowerCase() !== addr.toLowerCase())
          stampInfo.duplicate = assignedAddr;
        else
          stampAssignments[stamp.credential.credentialSubject.hash] = addr;

        stamps.push(stampInfo);
      }

      passportInfo = {
        found: true,
        parsed: now,
        newest: newestStamp,
        stamps: stamps,
      };
      faucetStore.updatePassportStamps(stampHashes.filter((stampHash) => {
        return stampAssignments[stampHash]?.toLowerCase() === addr.toLowerCase();
      }), addr, faucetConfig.passportBoost.stampDeduplicationTime || faucetConfig.passportBoost.cacheTime || 86400);
    }
    else {
      passportInfo = {
        found: false,
        parsed: now,
        newest: 0,
      };
    }
    
    faucetStore.setPassportInfo(addr, passportInfo);

    return passportInfo;
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
        if(stamp.duplicate)
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
