
import { Worker } from "node:worker_threads";
import { faucetConfig, resolveRelativePath } from '../config/FaucetConfig';
import { FaucetProcess, FaucetLogLevel } from '../common/FaucetProcess';
import { ServiceManager } from '../common/ServiceManager';
import { FaucetSessionStatus, FaucetSessionStoreData } from '../session/FaucetSession';
import { BaseModule } from '../modules/BaseModule';
import { ClaimTxStatus, EthClaimData } from '../eth/EthClaimManager';
import { FaucetModuleDB } from './FaucetModuleDB';
import { BaseDriver } from './driver/BaseDriver';
import { ISQLiteOptions } from './driver/SQLiteDriver';
import { WorkerDriver } from './driver/WorkerDriver';
import { FaucetWorkers } from '../common/FaucetWorker';

export type FaucetDatabaseOptions = ISQLiteOptions;

export class FaucetDatabase {
  private initialized: boolean;
  private db: BaseDriver;
  private dbWorker: Worker;
  private moduleDBs: {[module: string]: FaucetModuleDB} = {};

  public async initialize(): Promise<void> {
    if(this.initialized)
      return;
    this.initialized = true;

    await this.initDatabase();
    setInterval(() => {
      this.cleanStore();
    }, (1000 * 60 * 60 * 2));
  }

  private async initDatabase(): Promise<void> {
    switch(faucetConfig.database.driver) {
      case "sqlite":
        this.dbWorker = ServiceManager.GetService(FaucetWorkers).createWorker("database");
        this.db = new WorkerDriver(this.dbWorker);
        await this.db.open(Object.assign({}, faucetConfig.database, {
          file: resolveRelativePath(faucetConfig.database.file),
        }))
        break;
      default:
        throw "unknown database driver: " + faucetConfig.database.driver;
    }
    await this.upgradeSchema();
  }

  public async closeDatabase(): Promise<void> {
    await this.db.close();
    if(this.dbWorker) {
      this.dbWorker.terminate();
      this.dbWorker = null;
    }
  }

  public async createModuleDb<TModDB extends FaucetModuleDB>(dbClass: new(module: BaseModule, faucetStore: FaucetDatabase) => TModDB, module: BaseModule): Promise<TModDB> {
    let modName = module.getModuleName();
    let modDb: TModDB;
    if(!(modDb = this.moduleDBs[modName] as TModDB)) {
      modDb = this.moduleDBs[modName] = new dbClass(module, this);
      await modDb.initSchema();
    }
    return modDb;
  }

  public disposeModuleDb(moduleDb: FaucetModuleDB) {
    if(this.moduleDBs[moduleDb.getModuleName()] === moduleDb)
      delete this.moduleDBs[moduleDb.getModuleName()];
  }

  public getDatabase(): BaseDriver {
    return this.db;
  }

  public async upgradeIfNeeded(module: string, latestVersion: number, upgrade: (version: number) => Promise<number>): Promise<void> {
    let schemaVersion: number = 0;
    
    let res = await this.db.get("SELECT Version FROM SchemaVersion WHERE Module = ?", [module]) as {Version: number};
    if(res)
      schemaVersion = res.Version;
    else
      await this.db.run("INSERT INTO SchemaVersion (Module, Version) VALUES (?, ?)", [module, 0]);

    let upgradedVersion = schemaVersion;
    if(schemaVersion != latestVersion) {
      upgradedVersion = await upgrade(schemaVersion);
    }
    if(upgradedVersion != schemaVersion) {
      await this.db.run("UPDATE SchemaVersion SET Version = ? WHERE Module = ?", [upgradedVersion, module]);
    }
  }

  private async upgradeSchema(): Promise<void> {
    let schemaVersion: number = 0;
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS "SchemaVersion" (
        "Module" TEXT NULL UNIQUE,
        "Version" INTEGER NOT NULL,
        PRIMARY KEY("Module")
      )
    `);
    let res = await this.db.get("SELECT Version FROM SchemaVersion WHERE Module IS NULL") as {Version: number};
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Current FaucetStore schema version: " + (res ? res.Version : "uninitialized"));
    if(res)
      schemaVersion = res.Version;
    else
      await this.db.run("INSERT INTO SchemaVersion (Module, Version) VALUES (NULL, ?)", [0]);
    
    let oldVersion = schemaVersion;
    switch(schemaVersion) {
      case 0: // upgrade to version 1
        schemaVersion = 1;
        await this.db.exec(`
          CREATE TABLE "KeyValueStore" (
            "Key"	TEXT NOT NULL UNIQUE,
            "Value"	TEXT NOT NULL,
            PRIMARY KEY("Key")
          );
          CREATE TABLE "Sessions" (
            "SessionId" TEXT NOT NULL UNIQUE,
            "Status" TEXT NOT NULL,
            "StartTime" INTEGER NOT NULL,
            "TargetAddr" TEXT NOT NULL,
            "DropAmount" TEXT NOT NULL,
            "RemoteIP" TEXT NOT NULL,
            "Tasks" TEXT NOT NULL,
            "Data" TEXT NOT NULL,
            "ClaimData" TEXT NULL,
            PRIMARY KEY("SessionId")
          );
          CREATE INDEX "SessionsTimeIdx" ON "Sessions" (
            "StartTime"	ASC
          );
          CREATE INDEX "SessionsStatusIdx" ON "Sessions" (
            "Status"	ASC
          );
          CREATE INDEX "SessionsTargetAddrIdx" ON "Sessions" (
            "TargetAddr"	ASC,
            "StartTime"	ASC
          );
          CREATE INDEX "SessionsRemoteIPIdx" ON "Sessions" (
            "RemoteIP"	ASC,
            "StartTime"	ASC
          );
        `);
      /*
      case 1: // upgrade to version 2
        schemaVersion = 2;
        this.db.exec(`
          
        `);
      */
    }
    if(schemaVersion !== oldVersion) {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Upgraded FaucetStore schema from version " + oldVersion + " to version " + schemaVersion);
      await this.db.run("UPDATE SchemaVersion SET Version = ? WHERE Module IS NULL", [schemaVersion]);
    }
  }


  private now(): number {
    return Math.floor((new Date()).getTime() / 1000);
  }

  public cleanStore() {
    let now = this.now();
    this.db.run("DELETE FROM Sessions WHERE StartTime < ?", [now - faucetConfig.sessionCleanup]);

    Object.values(this.moduleDBs).forEach((modDb) => {
      modDb.cleanStore();
    });
  }

  public async getKeyValueEntry(key: string): Promise<string> {
    let row = await this.db.get("SELECT Value FROM KeyValueStore WHERE Key = ?", [key]) as {Value: string};
    return row?.Value;
  }

  public async setKeyValueEntry(key: string, value: string): Promise<void> {
    let row = await this.db.get("SELECT Key FROM KeyValueStore WHERE Key = ?", [key]);
    if(row) {
      await this.db.run("UPDATE KeyValueStore SET Value = ? WHERE Key = ?", [value, key]);
    }
    else {
      await this.db.run("INSERT INTO KeyValueStore (Key, Value) VALUES (?, ?)", [key, value]);
    }
  }

  public async deleteKeyValueEntry(key: string): Promise<void> {
    await this.db.run("DELETE FROM KeyValueStore WHERE Key = ?", [key]);
  }

  private async selectSessions(whereSql: string, whereArgs: any[], skipData?: boolean): Promise<FaucetSessionStoreData[]> {
    let sql = [
      "SELECT SessionId,Status,StartTime,TargetAddr,DropAmount,RemoteIP,Tasks",
      (skipData ? "" : ",Data,ClaimData"),
      " FROM Sessions WHERE ",
      whereSql
    ].join("");
    let rows = await this.db.all(sql, whereArgs) as {
      SessionId: string;
      Status: string;
      StartTime: number;
      TargetAddr: string;
      DropAmount: string;
      RemoteIP: string;
      Tasks: string;
      Data: string;
      ClaimData: string;
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
        data: skipData ? undefined : JSON.parse(row.Data),
        claim: skipData ? undefined : (row.ClaimData ? JSON.parse(row.ClaimData) : null),
      };
    });
  }

  public getSessions(states: FaucetSessionStatus[]): Promise<FaucetSessionStoreData[]> {
    return this.selectSessions("Status IN (" + states.map(() => "?").join(",") + ")", states);
  }

  public async getAllSessions(timeLimit: number): Promise<FaucetSessionStoreData[]> {
    let now = Math.floor(new Date().getTime() / 1000);
    return this.selectSessions("Status NOT IN ('finished', 'failed') OR StartTime > ?", [now - timeLimit]);
  }

  public async getTimedOutSessions(timeout: number): Promise<FaucetSessionStoreData[]> {
    let now = Math.floor(new Date().getTime() / 1000);
    return this.selectSessions("Status NOT IN ('finished', 'failed') AND StartTime <= ?", [now - timeout]);
  }

  public async getFinishedSessions(targetAddr: string, remoteIP: string, timeout: number, skipData?: boolean): Promise<FaucetSessionStoreData[]> {
    let now = Math.floor(new Date().getTime() / 1000);
    let whereSql: string[] = [];
    let whereArgs: any[] = [];
    if(targetAddr) {
      whereSql.push("TargetAddr = ?");
      whereArgs.push(targetAddr);
    }
    if(remoteIP) {
      whereSql.push("RemoteIP = ?");
      whereArgs.push(remoteIP);
    }
    if(whereSql.length === 0)
      throw "invalid query";
    
    whereArgs.push(now - timeout);
    return this.selectSessions("(" + whereSql.join(" OR ") + ") AND StartTime > ? AND Status IN ('claimable','claiming','finished')", whereArgs, skipData);
  }

  public async getSession(sessionId: string): Promise<FaucetSessionStoreData> {
    let row = await this.db.get("SELECT SessionId,Status,StartTime,TargetAddr,DropAmount,RemoteIP,Tasks,Data,ClaimData FROM Sessions WHERE SessionId = ?", [sessionId]) as {
      SessionId: string;
      Status: string;
      StartTime: number;
      TargetAddr: string;
      DropAmount: string;
      RemoteIP: string;
      Tasks: string;
      Data: string;
      ClaimData: string;
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
      claim: row.ClaimData ? JSON.parse(row.ClaimData) : null,
    };
  }

  public async updateSession(sessionData: FaucetSessionStoreData): Promise<void> {
    await this.db.run(
      "INSERT OR REPLACE INTO Sessions (SessionId,Status,StartTime,TargetAddr,DropAmount,RemoteIP,Tasks,Data,ClaimData) VALUES (?,?,?,?,?,?,?,?,?)",
      [
        sessionData.sessionId,
        sessionData.status,
        sessionData.startTime,
        sessionData.targetAddr,
        sessionData.dropAmount,
        sessionData.remoteIP,
        JSON.stringify(sessionData.tasks),
        JSON.stringify(sessionData.data),
        sessionData.claim ? JSON.stringify(sessionData.claim) : null,
      ]
    );
  }

  public async updateClaimData(sessionId: string, claimData: EthClaimData): Promise<void> {
    let status: FaucetSessionStatus;
    switch(claimData.claimStatus) {
      case ClaimTxStatus.CONFIRMED:
        status = FaucetSessionStatus.FINISHED;
        break;
      case ClaimTxStatus.FAILED:
        status = FaucetSessionStatus.FAILED;
        break;
      default:
        status = FaucetSessionStatus.CLAIMING;
        break;
    }
    await this.db.run("UPDATE Sessions SET Status = ?, ClaimData = ? WHERE Status = 'claiming' AND SessionId = ?", [
      status,
      JSON.stringify(claimData),
      sessionId
    ]);
  }

  public async getClaimableAmount(): Promise<bigint> {
    let row = await this.db.get("SELECT SUM(DropAmount) AS TotalAmount FROM Sessions WHERE Status = 'claimable'") as {
      TotalAmount: string;
    };
    if(!row || !row.TotalAmount)
      return 0n;
    return BigInt(row.TotalAmount)
  }

}
