import fs from 'fs';
import path from 'path';
import { FetchUtil } from '../../utils/FetchUtil.js';
import { resolveRelativePath } from '../../config/FaucetConfig.js';
import { FaucetProcess, FaucetLogLevel } from "../../common/FaucetProcess.js";
import { ServiceManager } from '../../common/ServiceManager.js';
import { PassportModule } from './PassportModule.js';
import { defaultConfig } from './PassportConfig.js';

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
    hash?: string;
    nullifiers?: string[];
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

export class PassportResolver {
  private static readonly API_PAGE_SIZE = 1000;
  private static readonly API_MAX_PAGES = 10;
  private static readonly API_TIMEOUT = 20000;
  private static readonly API_ERROR_RETRY_TIME = 300; // retry a failed lookup after 5 minutes instead of caching "no passport" for a day

  private module: PassportModule;
  private didkitPromise: Promise<DIDKitLib>;
  private passportCache: {[addr: string]: Promise<IPassportInfo>} = {};
  private passportScoreNonce = 1;

  public constructor(module: PassportModule) {
    this.module = module;
    this.didkitPromise = import("../../../libs/didkit_wasm.cjs");
  }

  private getVerifyTime(): number {
    return Math.floor((new Date()).getTime() / 1000);
  }

  private getStampHash(credentialSubject: IPassportCredential["credentialSubject"]): string {
    if(credentialSubject.hash)
      return credentialSubject.hash;
    if(credentialSubject.nullifiers && credentialSubject.nullifiers.length > 0)
      return credentialSubject.nullifiers[0];
    return "";
  }

  public increaseScoreNonce() {
    this.passportScoreNonce++;
  }

  public getCachedPassport(addr: string): Promise<IPassportInfo> {
    if(this.passportCache.hasOwnProperty(addr))
      return this.passportCache[addr];

    return this.module.getPassportDb().getPassportInfo(addr);
  }

  public getPassport(addr: string, refresh?: boolean): Promise<IPassportInfo> {
    if(this.passportCache.hasOwnProperty(addr))
      return this.passportCache[addr];

    let passportInfoPromise = this.passportCache[addr] = this.module.getPassportDb().getPassportInfo(addr).then(async (cachedPassportInfo) => {
      let now = Math.floor((new Date()).getTime() / 1000);
      if(cachedPassportInfo && !refresh && cachedPassportInfo.parsed > now - (this.module.getModuleConfig().cacheTime || 60)) {
        return cachedPassportInfo;
      }

      let passport: IPassport;
      try {
        passport = await this.refreshPassport(addr);
      } catch(ex) {
        // passport api unavailable: keep the last known passport instead of replacing it with "no passport"
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "API Error while fetching passport for " + addr + ": " + ex.toString() + `\r\n   Stack Trace: ${ex && ex.stack ? ex.stack : null}`);
        if(cachedPassportInfo)
          return cachedPassportInfo;
        return this.buildPassportInfo(addr, null, PassportResolver.API_ERROR_RETRY_TIME);
      }
      return this.buildPassportInfo(addr, passport);
    });
    passportInfoPromise.finally(() => {
      delete this.passportCache[addr];
    });

    return passportInfoPromise;
  }

  public async verifyUserPassport(addr: string, passportJson: string): Promise<IPassportVerificationResult> {
    if(!this.module.getModuleConfig().trustedIssuers || this.module.getModuleConfig().trustedIssuers.length == 0)
      return {valid: false, errors: ["Manual passport verification disabled"]};

    let passport: IPassport;
    try {
      passport = JSON.parse(passportJson);
    } catch(ex) {
      return {valid: false, errors: ["Invalid Passport JSON! Please copy your passport JSON from https://app.passport.xyz"]};
    }

    if(!passport || typeof passport !== "object" || !passport.stamps || !Array.isArray(passport.stamps))
      return {valid: false, errors: ["Invalid Passport JSON! Please copy your passport JSON from https://app.passport.xyz"]};

    // verify integrity
    let verifyResult = await this.verifyPassportIntegrity(addr, passport);
    if(!verifyResult.valid || !verifyResult.passport)
      return verifyResult;

    // refresh passport if necessary
    passport = await this.refreshPassport(addr, verifyResult.passport);
    if(passport !== verifyResult.passport)
      return {valid: false, errors: ["Cannot update to an older passport"]};
    
    return {
      ...verifyResult,
      passportInfo: await this.buildPassportInfo(addr, passport)
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
      try {
        cachedPassport = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      } catch(ex) {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Cannot read cached passport " + cacheFile + ": " + ex.toString());
      }
    }

    if(!passport) {
      try {
        passport = await this.fetchPassport(addr);
      } catch(ex) {
        if(!cachedPassport)
          throw ex;
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "API Error while fetching passport for " + addr + ", using cached passport: " + ex.toString());
        return cachedPassport;
      }
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Requested passport for " + addr + ": " + (passport ? "got " + passport.stamps.length + " stamps" : "no passport"));
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
    return passport || cachedPassport || null;
  }

  // loads all stamps for an address from the passport api (GET /v2/stamps/{address}, paginated)
  // throws on api errors, resolves null if the address has no stamps
  private async fetchPassport(addr: string): Promise<IPassport> {
    let apiUrl = (this.module.getModuleConfig().apiUrl || defaultConfig.apiUrl).replace(/\/+$/, "");
    let url = apiUrl + "/v2/stamps/" + addr + "?limit=" + PassportResolver.API_PAGE_SIZE;
    let items: any[] = [];

    for(let page = 0; url && page < PassportResolver.API_MAX_PAGES; page++) {
      if(url.substring(0, apiUrl.length + 1) !== apiUrl + "/")
        throw new Error("Refusing to follow pagination link to foreign host: " + url);

      let rsp = await FetchUtil.fetchWithTimeout(url, {
        method: 'GET',
        headers: {'X-API-KEY': this.module.getModuleConfig().scorerApiKey}
      }, PassportResolver.API_TIMEOUT);
      if(rsp.ok === false)
        throw new Error("HTTP " + rsp.status + " " + (await rsp.text().catch(() => "")).substring(0, 200));

      let rspData = await rsp.json() as any;
      if(!rspData || !Array.isArray(rspData.items)) {
        if(rspData && rspData.error)
          throw new Error("API error: " + rspData.error);
        throw new Error("Unexpected API response");
      }

      items.push(...rspData.items);
      url = typeof rspData.next === "string" && rspData.next ? rspData.next : null;
    }

    let stamps: IPassport["stamps"] = items.filter((item) => item?.credential?.credentialSubject?.provider).map((item) => {
      return {
        provider: item.credential.credentialSubject.provider,
        credential: item.credential,
      };
    });
    if(stamps.length === 0)
      return null;

    return {
      issuanceDate: null,
      expiryDate: null,
      stamps: stamps,
    };
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
      if(this.module.getModuleConfig().trustedIssuers.indexOf(stamp.credential.issuer) === -1) {
        verifyResult.errors.push("Stamp '" + stamp.provider + "' invalid: issuer not trusted");
        return;
      }

      if((stamp.credential.proof as any).verificationMethod.substring(0, stamp.credential.issuer.length) !== stamp.credential.issuer) {
        verifyResult.errors.push("Stamp '" + stamp.provider + "' invalid: invalid proof verificationMethod");
        return;
      }

      // verify expiration date
      let expirationTime = Math.floor((new Date(stamp.credential.expirationDate)).getTime() / 1000);
      if(expirationTime < this.getVerifyTime()) {
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
    if(!this.module.getModuleConfig().cachePath)
      return null;
    return path.join(resolveRelativePath(this.module.getModuleConfig().cachePath), "passport-" + addr.replace(/[^a-f0-9x]+/gi, "").toLowerCase() + ".json");
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

  private async buildPassportInfo(addr: string, passport: IPassport, cacheDuration?: number): Promise<IPassportInfo> {
    let passportInfo: IPassportInfo;
    let now = Math.floor((new Date()).getTime() / 1000);
    let savePromises: Promise<void>[] = [];

    if(passport) {
      let stampHashes = passport.stamps.map((stamp) => this.getStampHash(stamp.credential.credentialSubject));
      let stampAssignments = await this.module.getPassportDb().getPassportStamps(stampHashes);
      
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
        let stampHash = this.getStampHash(stamp.credential.credentialSubject);
        let assignedAddr = stampAssignments[stampHash];
        if(assignedAddr && assignedAddr.toLowerCase() !== addr.toLowerCase())
          stampInfo.duplicate = assignedAddr;
        else
          stampAssignments[stampHash] = addr;

        stamps.push(stampInfo);
      }

      passportInfo = {
        found: true,
        parsed: now,
        newest: newestStamp,
        stamps: stamps,
      };
      savePromises.push(this.module.getPassportDb().updatePassportStamps(stampHashes.filter((stampHash) => {
        return stampHash && stampAssignments[stampHash]?.toLowerCase() === addr.toLowerCase();
      }), addr, this.module.getModuleConfig().stampDeduplicationTime || this.module.getModuleConfig().cacheTime || 86400));
    }
    else {
      passportInfo = {
        found: false,
        parsed: now,
        newest: 0,
      };
    }
    
    savePromises.push(this.module.getPassportDb().setPassportInfo(addr, passportInfo, cacheDuration));
    await Promise.all(savePromises);

    return passportInfo;
  }


  public getPassportScore(passportInfo: IPassportInfo): IPassportScore {
    if(!passportInfo)
      return null;
    let passportConfig = this.module.getModuleConfig();
    
    if(!passportInfo.hasOwnProperty("_score")) {
      Object.defineProperty(passportInfo, "_score", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: null
      });
    }
    if(passportInfo._score && passportInfo._score.nonce == this.passportScoreNonce)
      return passportInfo._score;
    
    // calculate score
    let now = this.getVerifyTime();
    let totalScore = 0;
    if(passportInfo.found && passportInfo.stamps) {
      passportInfo.stamps.forEach((stamp) => {
        if(stamp.expiration < now)
          return;
        if(stamp.duplicate)
          return;
        
        let stampScore = passportConfig.stampScoring[stamp.provider];
        if(typeof stampScore === "number") {
          totalScore += stampScore;
        }
      });
    }

    // get highest boost factor for score
    let boostFactor = 1;
    Object.keys(passportConfig.boostFactor).forEach((minScore) => {
      if(totalScore >= parseInt(minScore)) {
        let factor = passportConfig.boostFactor[minScore];
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
