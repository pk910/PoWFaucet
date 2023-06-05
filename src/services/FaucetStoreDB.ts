import * as SQLite3 from 'better-sqlite3';

import { faucetConfig } from '../config/FaucetConfig';
import { FaucetProcess, FaucetLogLevel } from '../common/FaucetProcess';
import { ServiceManager } from '../common/ServiceManager';
import { IQueuedClaimTx } from './EthClaimManager';
import { IIPInfo } from '../modules/ipinfo/IPInfoResolver';
import { IPassportInfo } from '../modules/passport/PassportResolver';
import { FaucetSessionStatus, FaucetSessionStoreData } from '../session/FaucetSession';

export enum SessionMark {
  KILLED = "killed",
  CLOSED = "closed",
  CLAIMED = "claimed",
}

export enum AddressMark {
  USED = "used",
}

export class FaucetStoreDB {
  private initialized: boolean;
  private db: SQLite3.Database;

  public initialize() {
    if(this.initialized)
      return;
    this.initialized = true;

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
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Current FaucetStore schema version: " + (res ? res.SchemaVersion : "uninitialized"));
    if(res)
      schemaVersion = res.SchemaVersion;
    else
      this.db.prepare("INSERT INTO SchemaVersion (SchemaVersion) VALUES (?)").run(0);
    
    let oldVersion = schemaVersion;
    switch(schemaVersion) {
      case 0: // upgrade to version 1
        schemaVersion = 1;
        this.db.exec(`
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
        this.db.exec(`
          CREATE TABLE "KeyValueStore" (
            "Key"	TEXT NOT NULL UNIQUE,
            "Value"	TEXT NOT NULL,
            PRIMARY KEY("Key")
          );
        `);
      case 2: // upgrade to version 3
        schemaVersion = 3;
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
        this.db.exec(`
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
      case 4: // upgrade to version 5
        schemaVersion = 5;
        this.db.exec(`
          CREATE TABLE "Sessions" (
            "SessionId" TEXT NOT NULL UNIQUE,
            "Status" TEXT NOT NULL,
            "StartTime" INTEGER NOT NULL,
            "TargetAddr" TEXT NOT NULL,
            "DropAmount" TEXT NOT NULL,
            "RemoteIP" TEXT NOT NULL,
            "Tasks" TEXT NOT NULL,
            "Data" TEXT NOT NULL,
            PRIMARY KEY("SessionId")
          );
          CREATE INDEX "SessionsTimeIdx" ON "Sessions" (
            "StartTime"	ASC
          );
          CREATE INDEX "SessionsStatusIdx" ON "Sessions" (
            "Status"	ASC
          );
        `);
    }
    if(schemaVersion !== oldVersion) {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Upgraded FaucetStore schema from version " + oldVersion + " to version " + schemaVersion);
      this.db.prepare("UPDATE SchemaVersion SET SchemaVersion = ?").run(schemaVersion);
    }
  }


  private now(): number {
    return Math.floor((new Date()).getTime() / 1000);
  }

  public cleanStore() {
    let now = this.now();
    this.db.prepare("DELETE FROM IPInfoCache WHERE Timeout < ?").run(now);
    this.db.prepare("DELETE FROM PassportCache WHERE Timeout < ?").run(now);
    this.db.prepare("DELETE FROM PassportStamps WHERE Timeout < ?").run(now);
    //TODO: clean Sessions
  }

  public getSessions(states: FaucetSessionStatus[]): FaucetSessionStoreData[] {
    let query = this.db.prepare("SELECT SessionId,Status,StartTime,TargetAddr,DropAmount,RemoteIP,Tasks,Data FROM Sessions WHERE Status IN (" + states.map(() => "?").join(",") + ")");
    let rows = query.all.apply(query, states) as {
      SessionId: string;
      Status: string;
      StartTime: number;
      TargetAddr: string;
      DropAmount: string;
      RemoteIP: string;
      Tasks: string;
      Data: string;
    }[];

    if(rows.length === 0)
      return [];
    
    return rows.map((row) => {
      return {
        sessionId: row.SessionId,
        status: row.Status as FaucetSessionStatus,
        startTime: row.StartTime,
        targetAddr: row.TargetAddr,
        dropAmount: row.DropAmount,
        remoteIP: row.RemoteIP,
        tasks: JSON.parse(row.Tasks),
        data: JSON.parse(row.Data),
      };
    });
  }

  public getSession(sessionId: string): FaucetSessionStoreData {
    let query = this.db.prepare("SELECT SessionId,Status,StartTime,TargetAddr,DropAmount,RemoteIP,Tasks,Data FROM Sessions WHERE SessionId = ?");
    let row = query.get(sessionId) as {
      SessionId: string;
      Status: string;
      StartTime: number;
      TargetAddr: string;
      DropAmount: string;
      RemoteIP: string;
      Tasks: string;
      Data: string;
    };

    if(!row)
      return null;
    
    return {
      sessionId: row.SessionId,
      status: row.Status as FaucetSessionStatus,
      startTime: row.StartTime,
      targetAddr: row.TargetAddr,
      dropAmount: row.DropAmount,
      remoteIP: row.RemoteIP,
      tasks: JSON.parse(row.Tasks),
      data: JSON.parse(row.Data),
    };
  }

  public updateSession(sessionData: FaucetSessionStoreData) {
    this.db.prepare("INSERT OR REPLACE INTO Sessions (SessionId,Status,StartTime,TargetAddr,DropAmount,RemoteIP,Tasks,Data) VALUES (?,?,?,?,?,?,?,?)").run(
      sessionData.sessionId,
      sessionData.status,
      sessionData.startTime,
      sessionData.targetAddr,
      sessionData.dropAmount,
      sessionData.remoteIP,
      JSON.stringify(sessionData.tasks),
      JSON.stringify(sessionData.data)
    );
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
    
    let timeout = now + (typeof duration === "number" ? duration : 86400);
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
    
    let timeout = now + (typeof duration === "number" ? duration : 86400);
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
    let timeout = now + (typeof duration === "number" ? duration : 86400);

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
