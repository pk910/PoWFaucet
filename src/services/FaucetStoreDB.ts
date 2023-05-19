import * as SQLite3 from 'better-sqlite3';

import { faucetConfig } from '../common/FaucetConfig';
import { PoWStatusLog, PoWStatusLogLevel } from '../common/PoWStatusLog';
import { ServiceManager } from '../common/ServiceManager';
import { IQueuedClaimTx } from './EthWeb3Manager';
import { IIPInfo } from './IPInfoResolver';
import { IPassportInfo } from './PassportVerifier';

export enum SessionMark {
  KILLED = "killed",
  CLOSED = "closed",
  CLAIMED = "claimed",
}

export enum AddressMark {
  USED = "used",
}

export class FaucetStoreDB {
  private db: SQLite3.Database;

  public constructor() {
    this.initDatabase();
    setInterval(() => {
      this.cleanStore();
    }, (1000 * 60 * 60 * 2));
  }

  private initDatabase() {
    this.db = new SQLite3.default(faucetConfig.faucetDBFile, {
      //verbose: console.log
    });
    this.db.pragma('journal_mode = WAL');
    this.upgradeSchema();
  }

  public closeDatabase() {
    this.db.close();
  }

  private upgradeSchema() {
    let schemaVersion: number = 0;
    this.db.prepare("CREATE TABLE IF NOT EXISTS SchemaVersion (SchemaVersion	INTEGER)").run();
    let res = this.db.prepare("SELECT SchemaVersion FROM SchemaVersion").get() as {SchemaVersion: number};
    console.log("Schema Version: ", res);
    if(res)
      schemaVersion = res.SchemaVersion;
    else
      this.db.prepare("INSERT INTO SchemaVersion (SchemaVersion) VALUES (?)").run(0);
    
    let oldVersion = schemaVersion;
    switch(schemaVersion) {
      case 0: // upgrade to version 1
        schemaVersion = 1;
        ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Upgrade FaucetStore schema to version " + schemaVersion);
        this.db.exec(`
          CREATE TABLE "SessionMarks" (
            "SessionId"	TEXT NOT NULL UNIQUE,
            "Marks"	TEXT NOT NULL,
            "Timeout"	INTEGER NOT NULL,
            PRIMARY KEY("SessionId")
          );
          CREATE TABLE "AddressMarks" (
            "Address"	TEXT NOT NULL UNIQUE,
            "Marks"	TEXT NOT NULL,
            "Timeout"	INTEGER NOT NULL,
            PRIMARY KEY("Address")
          );
          CREATE TABLE "IPInfoCache" (
            "IP" TEXT NOT NULL UNIQUE,
            "Json" TEXT NOT NULL,
            "Timeout" INTEGER NOT NULL,
            PRIMARY KEY("IP")
          );
          CREATE TABLE "PassportCache" (
            "Address" TEXT NOT NULL UNIQUE,
            "Json" TEXT NOT NULL,
            "Timeout" INTEGER NOT NULL,
            PRIMARY KEY("Address")
          );
          CREATE TABLE "ClaimTxQueue" (
            "SessionId" TEXT NOT NULL UNIQUE,
            "ClaimJson" TEXT NOT NULL,
            "Time" INTEGER NOT NULL,
            PRIMARY KEY("SessionId")
          );
        `);
      case 1: // upgrade to version 2
        schemaVersion = 2;
        ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Upgrade FaucetStore schema to version " + schemaVersion);
        this.db.exec(`
          CREATE TABLE "KeyValueStore" (
            "Key"	TEXT NOT NULL UNIQUE,
            "Value"	TEXT NOT NULL,
            PRIMARY KEY("Key")
          );
        `);
      case 2: // upgrade to version 3
        schemaVersion = 3;
        ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Upgrade FaucetStore schema to version " + schemaVersion);
        this.db.exec(`
          CREATE TABLE "PassportStamps" (
            "StampHash" TEXT NOT NULL UNIQUE,
            "Address" TEXT NOT NULL,
            "Timeout" INTEGER NOT NULL,
            PRIMARY KEY("StampHash")
          );
        `);
      case 3: // upgrade to version 4
        schemaVersion = 4;
        ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Upgrade FaucetStore schema to version " + schemaVersion);
        this.db.exec(`
          CREATE INDEX "SessionMarksTimeIdx" ON "SessionMarks" (
            "Timeout"	ASC
          );
          CREATE INDEX "AddressMarksTimeIdx" ON "AddressMarks" (
            "Timeout"	ASC
          );
          CREATE INDEX "IPInfoCacheTimeIdx" ON "IPInfoCache" (
            "Timeout"	ASC
          );
          CREATE INDEX "PassportCacheTimeIdx" ON "PassportCache" (
            "Timeout"	ASC
          );
          CREATE INDEX "PassportStampsTimeIdx" ON "PassportStamps" (
            "Timeout"	ASC
          );
        `);
    }
    if(schemaVersion !== oldVersion)
      this.db.prepare("UPDATE SchemaVersion SET SchemaVersion = ?").run(schemaVersion);
  }

  private now(): number {
    return Math.floor((new Date()).getTime() / 1000);
  }

  public cleanStore() {
    let now = this.now();
    this.db.prepare("DELETE FROM SessionMarks WHERE Timeout < ?").run(now);
    this.db.prepare("DELETE FROM AddressMarks WHERE Timeout < ?").run(now);
    this.db.prepare("DELETE FROM IPInfoCache WHERE Timeout < ?").run(now);
    this.db.prepare("DELETE FROM PassportCache WHERE Timeout < ?").run(now);
    this.db.prepare("DELETE FROM PassportStamps WHERE Timeout < ?").run(now);
  }

  public getSessionMarks(sessionId: string, skipMarks?: SessionMark[]): SessionMark[] {
    let row = this.db.prepare("SELECT Marks FROM SessionMarks WHERE SessionId = ? AND Timeout > ?")
      .get(sessionId.toLowerCase(), this.now()) as {Marks: string};
    if(!row)
      return [];
    
    return row.Marks.split(",").filter((mark) => !skipMarks || skipMarks.indexOf(mark as SessionMark) === -1) as SessionMark[];
  }

  public setSessionMark(sessionId: string, mark: SessionMark | SessionMark[], duration?: number) {
    let now = this.now();
    let row = this.db.prepare("SELECT Marks, Timeout FROM SessionMarks WHERE SessionId = ?")
      .get(sessionId.toLowerCase()) as {Marks: string, Timeout: number};
    
    let marks: SessionMark[];
    if(row && row.Timeout > now)
      marks = row.Marks.split(",") as SessionMark[];
    else
      marks = [];
    
    let timeout = now + (typeof duration === "number" ? duration : faucetConfig.claimSessionTimeout);
    if(row && row.Timeout > timeout)
      timeout = row.Timeout;
    
    if(!Array.isArray(mark))
      mark = [ mark ];
    for(let i = 0; i < mark.length; i++) {
      if(!mark[i])
        continue;
      if(marks.indexOf(mark[i]) === -1)
        marks.push(mark[i]);
    }

    if(row) {
      this.db.prepare("UPDATE SessionMarks SET Marks = ?, Timeout = ? WHERE SessionId = ?")
        .run(marks.join(","), timeout, sessionId.toLowerCase());
    }
    else {
      this.db.prepare("INSERT INTO SessionMarks (SessionId, Marks, Timeout) VALUES (?, ?, ?)")
        .run(sessionId.toLowerCase(), marks.join(","), timeout);
    }
  }

  public getAddressMarks(address: string, skipMarks?: AddressMark[]): AddressMark[] {
    let row = this.db.prepare("SELECT Marks FROM AddressMarks WHERE Address = ? AND Timeout > ?")
      .get(address.toLowerCase(), this.now()) as {Marks: string};
    if(!row)
      return [];
    
    return row.Marks.split(",").filter((mark) => !skipMarks || skipMarks.indexOf(mark as AddressMark) === -1) as AddressMark[];
  }

  public setAddressMark(address: string, mark: AddressMark | AddressMark[], duration?: number) {
    let now = this.now();
    let row = this.db.prepare("SELECT Marks, Timeout FROM AddressMarks WHERE Address = ?")
      .get(address.toLowerCase()) as {Marks: string, Timeout: number};
    
    let marks: AddressMark[];
    if(row && row.Timeout > now)
      marks = row.Marks.split(",") as AddressMark[];
    else
      marks = [];
    
    let timeout = now + (typeof duration === "number" ? duration : faucetConfig.claimAddrCooldown);
    if(row && row.Timeout > timeout)
      timeout = row.Timeout;
    
    if(!Array.isArray(mark))
      mark = [ mark ];
    for(let i = 0; i < mark.length; i++) {
      if(!mark[i])
        continue;
      if(marks.indexOf(mark[i]) === -1)
        marks.push(mark[i]);
    }

    if(row) {
      this.db.prepare("UPDATE AddressMarks SET Marks = ?, Timeout = ? WHERE Address = ?")
        .run(marks.join(","), timeout, address.toLowerCase());
    }
    else {
      this.db.prepare("INSERT INTO AddressMarks (Address, Marks, Timeout) VALUES (?, ?, ?)")
        .run(address.toLowerCase(), marks.join(","), timeout);
    }
  }

  public getIPInfo(ip: string): IIPInfo {
    let row = this.db.prepare("SELECT Json FROM IPInfoCache WHERE IP = ? AND Timeout > ?")
      .get(ip.toLowerCase(), this.now()) as {Json: string};
    if(!row)
      return null;
    
    return JSON.parse(row.Json);
  }

  public setIPInfo(ip: string, info: IIPInfo, duration?: number) {
    let now = this.now();
    let row = this.db.prepare("SELECT Timeout FROM IPInfoCache WHERE IP = ?")
      .get(ip.toLowerCase());
    
    let timeout = now + (typeof duration === "number" ? duration : faucetConfig.ipInfoCacheTime);
    let infoJson = JSON.stringify(info);

    if(row) {
      this.db.prepare("UPDATE IPInfoCache SET Json = ?, Timeout = ? WHERE IP = ?")
        .run(infoJson, timeout, ip.toLowerCase());
    }
    else {
      this.db.prepare("INSERT INTO IPInfoCache (IP, Json, Timeout) VALUES (?, ?, ?)")
        .run(ip.toLowerCase(), infoJson, timeout);
    }
  }

  public getPassportInfo(addr: string): IPassportInfo {
    let row = this.db.prepare("SELECT Json FROM PassportCache WHERE Address = ? AND Timeout > ?")
      .get(addr.toLowerCase(), this.now()) as {Json: string};
    if(!row)
      return null;
    
    return JSON.parse(row.Json);
  }

  public setPassportInfo(addr: string, info: IPassportInfo, duration?: number) {
    let now = this.now();
    let row = this.db.prepare("SELECT Timeout FROM PassportCache WHERE Address = ?")
      .get(addr.toLowerCase());
    
    let timeout = now + (typeof duration === "number" ? duration : faucetConfig.passportBoost?.cacheTime || 3600);
    let infoJson = JSON.stringify(info);

    if(row) {
      this.db.prepare("UPDATE PassportCache SET Json = ?, Timeout = ? WHERE Address = ?")
        .run(infoJson, timeout, addr.toLowerCase());
    }
    else {
      this.db.prepare("INSERT INTO PassportCache (Address, Json, Timeout) VALUES (?, ?, ?)")
        .run(addr.toLowerCase(), infoJson, timeout);
    }
  }

  public getClaimTxQueue(maxtime?: number): IQueuedClaimTx[] {
    return this.db.prepare("SELECT ClaimJson FROM ClaimTxQueue WHERE Time < ? ORDER BY Time ASC")
      .all((typeof maxtime === "number" ? maxtime : this.now() + 86400))
      .map((row: {ClaimJson: string}) => {
        return JSON.parse(row.ClaimJson);
      });
  }

  public addQueuedClaimTx(claimTx: IQueuedClaimTx) {
    this.db.prepare("INSERT INTO ClaimTxQueue (SessionId, ClaimJson, Time) VALUES (?, ?, ?)")
      .run(claimTx.session.toLowerCase(), JSON.stringify(claimTx), this.now());
  }

  public removeQueuedClaimTx(sessionId: string) {
    this.db.prepare("DELETE FROM ClaimTxQueue WHERE SessionId = ?")
      .run(sessionId.toLowerCase());
  }

  public getKeyValueEntry(key: string): string {
    let row = this.db.prepare("SELECT Value FROM KeyValueStore WHERE Key = ?")
      .get(key) as {Value: string};
    return row?.Value;
  }

  public setKeyValueEntry(key: string, value: string) {
    let row = this.db.prepare("SELECT Key FROM KeyValueStore WHERE Key = ?").get(key);
    if(row) {
      this.db.prepare("UPDATE KeyValueStore SET Value = ? WHERE Key = ?")
        .run(value, key);
    }
    else {
      this.db.prepare("INSERT INTO KeyValueStore (Key, Value) VALUES (?, ?)")
        .run(key, value);
    }
  }

  public deleteKeyValueEntry(key: string) {
    this.db.prepare("DELETE FROM KeyValueStore WHERE Key = ?").run(key);
  }

  public getPassportStamps(stampHashs: string[]): {[hash: string]: string} {
    let query = this.db.prepare("SELECT StampHash, Address FROM PassportStamps WHERE StampHash IN (" + stampHashs.map(() => "?").join(",") + ") AND Timeout > ?");
    let args: any[] = [];
    let stamps: {[hash: string]: string} = {};
    stampHashs.forEach((stampHash) => {
      args.push(stampHash);
      stamps[stampHash] = null;
    });
    args.push(this.now());

    (query.all.apply(query, args) as {StampHash: string, Address: string}[]).forEach((row) => {
      stamps[row.StampHash] = row.Address;
    });

    return stamps;
  }

  public updatePassportStamps(stampHashs: string[], address: string, duration?: number) {
    if(stampHashs.length === 0)
      return;

    let now = this.now();
    let timeout = now + (typeof duration === "number" ? duration : faucetConfig.passportBoost?.cacheTime || 3600);

    let queryArgs: any[] = [];
    let queryRows = stampHashs.map((stampHash) => {
      queryArgs.push(stampHash);
      queryArgs.push(address);
      queryArgs.push(timeout);
      return "(?,?,?)";
    }).join(",");
    
    let query = this.db.prepare("INSERT OR REPLACE INTO PassportStamps (StampHash, Address, Timeout) VALUES " + queryRows);
    query.run.apply(query, queryArgs);
  }

}
