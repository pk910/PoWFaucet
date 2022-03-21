import * as fs from 'fs'
import { faucetConfig } from './FaucetConfig';

export enum SessionMark {
  KILLED = "killed",
  CLOSED = "closed",
  CLAIMED = "claimed",
}

export enum AddressMark {
  USED = "used",
}

interface IFaucetStore {
  sessionMarks: {[sessionId: string]: IFaucetStoreMarks<SessionMark>};
  addressMarks: {[sessionId: string]: IFaucetStoreMarks<AddressMark>};
}

interface IFaucetStoreMarks<T> {
  m: T[];
  t: number;
} 

export class FaucetStore {
  private store: IFaucetStore;
  private saveTimer: NodeJS.Timeout;
  private dirty: boolean;

  public constructor() {
    this.loadStore();
    setInterval(() => {
      this.cleanStore();
    }, (1000 * 60 * 10));
  }

  public loadStore() {
    if(fs.existsSync(faucetConfig.faucetStore))
      this.store = JSON.parse(fs.readFileSync(faucetConfig.faucetStore, "utf8"));
    else {
      this.store = {
        sessionMarks: {},
        addressMarks: {},
      };
    }
    this.dirty = false;
  }

  public saveStore(force?: boolean) {
    if(!this.dirty)
      return;
    if(this.saveTimer && !force)
      return;
    if(force) {
      if(this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
      }
      fs.writeFileSync(faucetConfig.faucetStore, JSON.stringify(this.store, null, 2));
    }
    else {
      this.saveTimer = setTimeout(() => {
        this.saveTimer = null;
        this.saveStore(true);
      }, 5000);
    }
  }

  private cleanStore() {
    let now = Math.floor((new Date()).getTime() / 1000);
    let cleared = false;

    let sessionTout = now - faucetConfig.claimSessionTimeout;
    let sessionIds = Object.keys(this.store.sessionMarks);
    for(let i = 0; i < sessionIds.length; i++) {
      if(this.store.sessionMarks[sessionIds[i]].t < sessionTout) {
        delete this.store.sessionMarks[sessionIds[i]];
        cleared = true;
      }
    }

    let addressTout = now - faucetConfig.claimAddrCooldown;
    let addresses = Object.keys(this.store.addressMarks);
    for(let i = 0; i < addresses.length; i++) {
      if(this.store.addressMarks[addresses[i]].t < addressTout) {
        delete this.store.addressMarks[addresses[i]];
        cleared = true;
      }
    }

    if(cleared) {
      this.dirty = true;
      this.saveStore();
    }
  }

  public getSessionMarks(sessionId: string, skipMarks?: SessionMark[]): SessionMark[] {
    let marks: SessionMark[];
    let marksEntry = this.store.sessionMarks[sessionId];
    
    if(!marksEntry)
      marks = [];
    else {
      marks = marksEntry.m;
      if(skipMarks) {
        marks = marks.filter((m) => {
          return (skipMarks.indexOf(m) === -1);
        });
      }
    }
    return marks;
  }

  public setSessionMark(sessionId: string, mark: SessionMark) {
    let now = Math.floor((new Date()).getTime() / 1000);
    let marksEntry = this.store.sessionMarks[sessionId];

    if(marksEntry) {
      if(marksEntry.m.indexOf(mark) === -1)
        marksEntry.m.push(mark);
      marksEntry.t = now;
    }
    else {
      marksEntry = this.store.sessionMarks[sessionId] = {
        m: [ mark ],
        t: now
      };
    }

    this.dirty = true;
    this.saveStore();
  }

  public getAddressMarks(address: string, skipMarks?: AddressMark[]): AddressMark[] {
    address = address.toLowerCase();
    let marks: AddressMark[];
    let marksEntry = this.store.addressMarks[address];
    
    if(!marksEntry)
      marks = [];
    else {
      marks = marksEntry.m;
      if(skipMarks) {
        marks = marks.filter((m) => {
          return (skipMarks.indexOf(m) === -1);
        });
      }
    }
    return marks;
  }

  public setAddressMark(address: string, mark: AddressMark) {
    address = address.toLowerCase();
    let now = Math.floor((new Date()).getTime() / 1000);
    let marksEntry = this.store.addressMarks[address];

    if(marksEntry) {
      if(marksEntry.m.indexOf(mark) === -1)
        marksEntry.m.push(mark);
      marksEntry.t = now;
    }
    else {
      marksEntry = this.store.addressMarks[address] = {
        m: [ mark ],
        t: now
      };
    }

    this.dirty = true;
    this.saveStore();
  }

}
