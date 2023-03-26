import * as fs from 'fs'
import { faucetConfig } from '../common/FaucetConfig';
import { PoWStatusLog, PoWStatusLogLevel } from '../common/PoWStatusLog';
import { ServiceManager } from '../common/ServiceManager';
import { IPoWSessionStoreData } from '../websock/PoWSession';
import { FaucetStoreDB } from './FaucetStoreDB';

interface IFaucetRecoveryStore {
  sessionStore?: IPoWSessionStoreData[];
}

export class FaucetStore {
  private recoveryStore: IFaucetRecoveryStore;

  public constructor() {
    this.loadRecoveryStore();
    this.migrateLegacyStore();
  }

  private loadRecoveryStore() {
    if(fs.existsSync(faucetConfig.faucetStore))
      this.recoveryStore = JSON.parse(fs.readFileSync(faucetConfig.faucetStore, "utf8"));
    else {
      this.recoveryStore = {
        sessionStore: null,
      };
    }
  }

  private migrateLegacyStore() {
    let now = Math.floor((new Date()).getTime() / 1000);
    let db = ServiceManager.GetService(FaucetStoreDB);
    if((this.recoveryStore as any).sessionMarks) {
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Migrate legacy session mark store to sqlite db");
      Object.keys((this.recoveryStore as any).sessionMarks).forEach((key) => {
        let tobj = (this.recoveryStore as any).sessionMarks[key];
        let tout = faucetConfig.claimSessionTimeout - (now - tobj.t);
        if(tout > 1)
          db.setSessionMark(key, tobj.m, tout);
      });
      delete (this.recoveryStore as any).sessionMarks;
    }
    if((this.recoveryStore as any).addressMarks) {
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Migrate legacy address mark store to sqlite db");
      Object.keys((this.recoveryStore as any).addressMarks).forEach((key) => {
        let tobj = (this.recoveryStore as any).addressMarks[key];
        let tout = faucetConfig.claimAddrCooldown - (now - tobj.t);
        if(tout > 1)
          db.setAddressMark(key, tobj.m, tout);
      });
      delete (this.recoveryStore as any).addressMarks;
    }
    if((this.recoveryStore as any).ipInfoCache) {
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Migrate legacy IP info cache to sqlite db");
      Object.keys((this.recoveryStore as any).ipInfoCache).forEach((key) => {
        let tobj = (this.recoveryStore as any).ipInfoCache[key];
        let tout = faucetConfig.ipInfoCacheTime - (now - tobj.t);
        if(tout > 1)
          db.setIPInfo(key, tobj.m, tout);
      });
      delete (this.recoveryStore as any).ipInfoCache;
    }
    if((this.recoveryStore as any).passportCache) {
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Migrate legacy passport cache to sqlite db");
      Object.keys((this.recoveryStore as any).passportCache).forEach((key) => {
        let tobj = (this.recoveryStore as any).passportCache[key];
        let tout = (faucetConfig.passportBoost?.cacheTime || 3600) - (now - tobj.t);
        if(tout > 1)
          db.setPassportInfo(key, tobj.m, tout);
      });
      delete (this.recoveryStore as any).passportCache;
    }
  }

  public getSessionStore(): IPoWSessionStoreData[] {
    return this.recoveryStore.sessionStore;
  }

  public setSessionStore(sessionStore: IPoWSessionStoreData[]) {
    this.recoveryStore.sessionStore = sessionStore;
    fs.writeFileSync(faucetConfig.faucetStore, JSON.stringify(this.recoveryStore));
  }

}
