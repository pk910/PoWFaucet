import { Worker } from "node:worker_threads";
import { faucetConfig, resolveRelativePath } from "../config/FaucetConfig.js";
import { FaucetProcess, FaucetLogLevel } from "../common/FaucetProcess.js";
import { ServiceManager } from "../common/ServiceManager.js";
import {
  FaucetSessionStatus,
  FaucetSessionStoreData,
} from "../session/FaucetSession.js";
import { BaseModule } from "../modules/BaseModule.js";
import { ClaimTxStatus, EthClaimData } from "../eth/EthClaimManager.js";
import { FaucetModuleDB } from "./FaucetModuleDB.js";
import { BaseDriver } from "./driver/BaseDriver.js";
import { ISQLiteOptions } from "./driver/SQLiteDriver.js";
import { WorkerDriver } from "./driver/WorkerDriver.js";
import { FaucetWorkers } from "../common/FaucetWorker.js";
import { IMySQLOptions, MySQLDriver } from "./driver/MySQLDriver.js";
import { SQL } from "./SQL.js";
import { getHashedIp } from "../utils/HashedInfo.js";
import { nowSeconds } from "../utils/DateUtils.js";

export type FaucetDatabaseOptions = ISQLiteOptions | IMySQLOptions;

export enum FaucetDbDriver {
  SQLITE = "sqlite",
  MYSQL = "mysql",
}

const TableSessionsColumns = [
  "SessionId",
  "Status",
  "StartTime",
  "TargetAddr",
  "DropAmount",
  "RemoteIP",
  "Tasks",
  "UserId",
  "Mode",
];

const TableSessionsColumnsFull = [...TableSessionsColumns, "Data", "ClaimData"];

export class FaucetDatabase {
  private initialized: boolean;
  private cleanupTimer: NodeJS.Timeout;
  private db: BaseDriver;
  private dbWorker: Worker;
  private moduleDBs: { [module: string]: FaucetModuleDB } = {};

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    await this.initDatabase();
    this.cleanupTimer = setInterval(() => {
      this.cleanStore();
    }, 1000 * 60 * 60 * 2);
  }

  public dispose() {
    if (!this.initialized) return;
    this.initialized = false;

    clearInterval(this.cleanupTimer);
  }

  private async initDatabase(): Promise<void> {
    switch (faucetConfig.database.driver) {
      case "sqlite":
        this.dbWorker =
          ServiceManager.GetService(FaucetWorkers).createWorker("database");
        this.db = new WorkerDriver(this.dbWorker);
        await this.db.open(
          Object.assign({}, faucetConfig.database, {
            file: resolveRelativePath(faucetConfig.database.file),
          })
        );
        break;
      case "mysql":
        this.db = new MySQLDriver();
        await this.db.open(Object.assign({}, faucetConfig.database));
        break;
      default:
        throw new Error(
          "unknown database driver: " + (faucetConfig.database as any).driver
        );
    }
    await this.upgradeSchema();
  }

  public async closeDatabase(): Promise<void> {
    await this.db.close();
    if (this.dbWorker) {
      this.dbWorker.terminate();
      this.dbWorker = null;
    }
  }

  public async createModuleDb<TModDB extends FaucetModuleDB>(
    dbClass: new (module: BaseModule, faucetStore: FaucetDatabase) => TModDB,
    module: BaseModule
  ): Promise<TModDB> {
    const modName = module.getModuleName();
    let modDb: TModDB;
    if (!(modDb = this.moduleDBs[modName] as TModDB)) {
      modDb = this.moduleDBs[modName] = new dbClass(module, this);
      await modDb.initSchema();
    }
    return modDb;
  }

  public disposeModuleDb(moduleDb: FaucetModuleDB) {
    if (this.moduleDBs[moduleDb.getModuleName()] === moduleDb)
      delete this.moduleDBs[moduleDb.getModuleName()];
  }

  public getDatabase(): BaseDriver {
    return this.db;
  }

  public async upgradeIfNeeded(
    module: string,
    latestVersion: number,
    upgrade: (version: number) => Promise<number>
  ): Promise<void> {
    let schemaVersion: number = 0;

    const res = (await this.db.get(
      "SELECT Version FROM SchemaVersion WHERE Module = ?",
      [module]
    )) as { Version: number };
    if (res) schemaVersion = res.Version;
    else
      await this.db.run(
        "INSERT INTO SchemaVersion (Module, Version) VALUES (?, ?)",
        [module, 0]
      );

    let upgradedVersion = schemaVersion;
    if (schemaVersion !== latestVersion) {
      upgradedVersion = await upgrade(schemaVersion);
    }
    if (upgradedVersion !== schemaVersion) {
      await this.db.run(
        "UPDATE SchemaVersion SET Version = ? WHERE Module = ?",
        [upgradedVersion, module]
      );
    }
  }

  private async upgradeSchema(): Promise<void> {
    let schemaVersion: number = 0;
    await this.db.run(
      SQL.driverSql({
        [FaucetDbDriver.SQLITE]: `
        CREATE TABLE IF NOT EXISTS SchemaVersion (
          Module TEXT NULL UNIQUE,
          Version INTEGER NOT NULL,
          PRIMARY KEY(Module)
        )`,
        [FaucetDbDriver.MYSQL]: `
        CREATE TABLE IF NOT EXISTS SchemaVersion (
          Module VARCHAR(50) NULL,
          Version INT(11) NOT NULL
        )`,
      })
    );

    const res = (await this.db.get(
      "SELECT Version FROM SchemaVersion WHERE Module IS NULL"
    )) as { Version: number };
    ServiceManager.GetService(FaucetProcess).emitLog(
      FaucetLogLevel.INFO,
      "Current FaucetStore schema version: " +
        (res ? res.Version : "uninitialized")
    );
    if (res) schemaVersion = res.Version;
    else
      await this.db.run(
        "INSERT INTO SchemaVersion (Module, Version) VALUES (NULL, ?)",
        [0]
      );

    const oldVersion = schemaVersion;
    switch (schemaVersion) {
      case 0: {
        // upgrade to version 1
        schemaVersion = 1;
        await this.db.exec(
          SQL.driverSql({
            [FaucetDbDriver.SQLITE]: `
            CREATE TABLE KeyValueStore (
              Key	TEXT NOT NULL UNIQUE,
              Value	TEXT NOT NULL,
              PRIMARY KEY(Key)
            );`,
            [FaucetDbDriver.MYSQL]: `
            CREATE TABLE KeyValueStore (
              \`Key\`	VARCHAR(250) NOT NULL,
              Value	TEXT NOT NULL,
              PRIMARY KEY(\`Key\`)
            );`,
          })
        );
        await this.db.exec(
          SQL.driverSql({
            [FaucetDbDriver.SQLITE]: `
            CREATE TABLE Sessions (
              SessionId TEXT NOT NULL UNIQUE,
              Status TEXT NOT NULL,
              StartTime INTEGER NOT NULL,
              TargetAddr TEXT NOT NULL,
              DropAmount TEXT NOT NULL,
              RemoteIP TEXT NOT NULL,
              Tasks TEXT NOT NULL,
              Data TEXT NOT NULL,
              ClaimData TEXT NULL,
              PRIMARY KEY(SessionId)
            );`,
            [FaucetDbDriver.MYSQL]: `
            CREATE TABLE Sessions (
              SessionId CHAR(36) NOT NULL,
              Status VARCHAR(30) NOT NULL,
              StartTime INT(11) NOT NULL,
              TargetAddr CHAR(42) NOT NULL,
              DropAmount VARCHAR(50) NOT NULL,
              RemoteIP VARCHAR(40) NOT NULL,
              Tasks TEXT NOT NULL,
              Data TEXT NOT NULL,
              ClaimData TEXT NULL,
              PRIMARY KEY(SessionId)
            );`,
          })
        );
        await this.db.exec(
          SQL.driverSql({
            [FaucetDbDriver.SQLITE]: `CREATE INDEX IF NOT EXISTS SessionsTimeIdx ON Sessions (StartTime	ASC);`,
            [FaucetDbDriver.MYSQL]: `ALTER TABLE Sessions ADD INDEX SessionsTimeIdx (StartTime);`,
          })
        );
        await this.db.exec(
          SQL.driverSql({
            [FaucetDbDriver.SQLITE]: `CREATE INDEX IF NOT EXISTS SessionsStatusIdx ON Sessions (Status	ASC);`,
            [FaucetDbDriver.MYSQL]: `ALTER TABLE Sessions ADD INDEX SessionsStatusIdx (Status);`,
          })
        );
        await this.db.exec(
          SQL.driverSql({
            [FaucetDbDriver.SQLITE]: `CREATE INDEX IF NOT EXISTS SessionsTargetAddrIdx ON Sessions (TargetAddr	ASC, StartTime	ASC);`,
            [FaucetDbDriver.MYSQL]: `ALTER TABLE Sessions ADD INDEX SessionsTargetAddrIdx (TargetAddr, StartTime);`,
          })
        );
        await this.db.exec(
          SQL.driverSql({
            [FaucetDbDriver.SQLITE]: `CREATE INDEX IF NOT EXISTS SessionsRemoteIPIdx ON Sessions (RemoteIP	ASC, StartTime	ASC);`,
            [FaucetDbDriver.MYSQL]: `ALTER TABLE Sessions ADD INDEX SessionsRemoteIPIdx (RemoteIP, StartTime);`,
          })
        );
      }
      case 1: {
        // upgrade to version 2
        schemaVersion = 2;
        await this.db.exec(
          SQL.driverSql({
            [FaucetDbDriver.SQLITE]: `ALTER TABLE Sessions ADD UserId TEXT;`,
            [FaucetDbDriver.MYSQL]: `ALTER TABLE Sessions ADD UserId TEXT;`,
          })
        );
      }
      case 2: {
        // upgrade to version 3
        schemaVersion = 3;
        await this.db.exec(
          SQL.driverSql({
            [FaucetDbDriver.SQLITE]: `CREATE INDEX IF NOT EXISTS UserIdIdx ON Sessions (UserId ASC);`,
            [FaucetDbDriver.MYSQL]: `ALTER TABLE Sessions ADD INDEX UserIdIdx (UserId(255));`,
          })
        );
      }
      case 3: {
        // upgrade to version 4
        schemaVersion = 4;
        await this.db.exec(
          SQL.driverSql({
            [FaucetDbDriver.SQLITE]: `
            CREATE TABLE GitcoinClaims (
              Uuid TEXT NOT NULL UNIQUE,
              UserId TEXT NOT NULL,
              TargetAddress TEXT NOT NULL,
              TxHash TEXT,
              Status TEXT NOT NULL,
              DateCreated INTEGER NOT NULL,
              DateUpdated INTEGER NOT NULL,
              DateClaimed INTEGER,
              DropAmount TEXT NOT NULL,
              RemoteIP TEXT NOT NULL,
              PRIMARY KEY(Uuid)
            );`,
            [FaucetDbDriver.MYSQL]: `
            CREATE TABLE GitcoinClaims (
              Uuid CHAR(36) NOT NULL,
              UserId VARCHAR(255) NOT NULL,
              TargetAddress CHAR(42) NOT NULL,
              TxHash CHAR(66),
              Status VARCHAR(255) NOT NULL,
              DateCreated INT(11) NOT NULL,
              DateUpdated INT(11) NOT NULL,
              DateClaimed INT(11),
              DropAmount VARCHAR(50) NOT NULL,
              RemoteIP VARCHAR(40) NOT NULL,
              PRIMARY KEY(Uuid)
            );`,
          })
        );
        await this.db.exec(
          SQL.driverSql({
            [FaucetDbDriver.SQLITE]: `CREATE INDEX IF NOT EXISTS GitcoinClaimsUserIdIdx ON GitcoinClaims (UserId ASC);`,
            [FaucetDbDriver.MYSQL]: `ALTER TABLE GitcoinClaims ADD INDEX GitcoinClaimsDataUserIdIdx (UserId(255));`,
          })
        );
      }
      case 4: {
        // upgrade to version 5
        schemaVersion = 5;
        await this.db.exec(
          SQL.driverSql({
            [FaucetDbDriver.SQLITE]: `
              ALTER TABLE Sessions ADD COLUMN Mode TEXT;
              UPDATE Sessions SET Mode = 'pow';
            `,
            [FaucetDbDriver.MYSQL]: `
              ALTER TABLE Sessions ADD COLUMN Mode ENUM('pow', 'gitcoin') DEFAULT 'pow';
            `,
          })
        );
      }
    }
    if (schemaVersion !== oldVersion) {
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.INFO,
        "Upgraded FaucetStore schema from version " +
          oldVersion +
          " to version " +
          schemaVersion
      );
      await this.db.run(
        "UPDATE SchemaVersion SET Version = ? WHERE Module IS NULL",
        [schemaVersion]
      );
    }
  }

  public cleanStore() {
    const now = nowSeconds();
    this.db.run("DELETE FROM Sessions WHERE StartTime < ?", [
      now - faucetConfig.sessionCleanup,
    ]);

    Object.values(this.moduleDBs).forEach((modDb) => {
      modDb.cleanStore();
    });
  }

  public async dropAllTables() {
    // for tests only! this drops the whole DB.
    const tables = (await this.db.all(
      SQL.driverSql({
        [FaucetDbDriver.SQLITE]:
          "SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%'",
        [FaucetDbDriver.MYSQL]:
          "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()",
      })
    )) as {
      name: string;
    }[];

    const dropPromises = tables.map((table) => {
      return this.db.run("DROP TABLE " + table.name);
    });

    await Promise.all(dropPromises);
  }

  public async getKeyValueEntry(key: string): Promise<string> {
    const row = (await this.db.get(
      "SELECT " +
        SQL.field("Value") +
        " FROM KeyValueStore WHERE " +
        SQL.field("Key") +
        " = ?",
      [key]
    )) as { Value: string };
    return row?.Value;
  }

  public async setKeyValueEntry(key: string, value: string): Promise<void> {
    await this.db.run(
      SQL.driverSql({
        [FaucetDbDriver.SQLITE]:
          "INSERT OR REPLACE INTO KeyValueStore (Key,Value) VALUES (?,?)",
        [FaucetDbDriver.MYSQL]:
          "REPLACE INTO KeyValueStore (`Key`,Value) VALUES (?,?)",
      }),
      [key, value]
    );
  }

  public async deleteKeyValueEntry(key: string): Promise<void> {
    await this.db.run(
      "DELETE FROM KeyValueStore WHERE " + SQL.field("Key") + " = ?",
      [key]
    );
  }

  private selectSessions(
    whereSql: string,
    whereArgs: any[],
    skipData?: boolean
  ): Promise<FaucetSessionStoreData[]> {
    const sql = ["FROM Sessions WHERE ", whereSql].join("");
    return this.selectSessionsSql(sql, whereArgs, skipData);
  }

  public async selectSessionsSql(
    selectSql: string,
    args: any[],
    skipData?: boolean
  ): Promise<FaucetSessionStoreData[]> {
    let fields = TableSessionsColumns;
    if (!skipData) fields = TableSessionsColumnsFull;

    const sql = [
      "SELECT ",
      fields.map((f) => "Sessions." + f).join(","),
      " ",
      selectSql,
    ].join("");
    const rows = (await this.db.all(sql, args)) as {
      SessionId: string;
      Status: string;
      StartTime: number;
      TargetAddr: string;
      DropAmount: string;
      RemoteIP: string;
      Tasks: string;
      UserId: string;
      Data: string;
      ClaimData: string;
      Mode: "pow" | "gitcoin";
    }[];

    if (rows.length === 0) return [];

    return rows.map((row) => {
      return {
        sessionId: row.SessionId,
        status: row.Status as FaucetSessionStatus,
        startTime: row.StartTime,
        targetAddr: row.TargetAddr,
        dropAmount: row.DropAmount,
        remoteIP: row.RemoteIP,
        tasks: JSON.parse(row.Tasks),
        userId: row.UserId,
        data: skipData ? undefined : JSON.parse(row.Data),
        claim: skipData
          ? undefined
          : row.ClaimData
          ? JSON.parse(row.ClaimData)
          : null,
        mode: row.Mode,
      };
    });
  }

  public getSessions(
    states: FaucetSessionStatus[]
  ): Promise<FaucetSessionStoreData[]> {
    return this.selectSessions(
      "Status IN (" + states.map(() => "?").join(",") + ")",
      states
    );
  }

  public async getAllSessions(
    timeLimit: number
  ): Promise<FaucetSessionStoreData[]> {
    return this.selectSessions(
      "Status NOT IN ('finished', 'failed') OR StartTime > ?",
      [nowSeconds() - timeLimit]
    );
  }

  public async getTimedOutSessions(
    timeout: number
  ): Promise<FaucetSessionStoreData[]> {
    return this.selectSessions(
      "Status NOT IN ('finished', 'failed') AND StartTime <= ?",
      [nowSeconds() - timeout]
    );
  }

  public async getFinishedSessions(
    by: {
      targetAddr?: string;
      remoteIP?: string;
      userId: string;
    },
    timeout: number,
    skipData?: boolean
  ): Promise<FaucetSessionStoreData[]> {
    const { targetAddr, remoteIP, userId } = by;
    const now = nowSeconds();
    const whereSql: string[] = ["UserId = ?"];
    const whereArgs: any[] = [userId];
    if (targetAddr) {
      whereSql.push("TargetAddr = ?");
      whereArgs.push(targetAddr);
    }
    if (remoteIP) {
      whereSql.push("RemoteIP LIKE ?");
      whereArgs.push(getHashedIp(remoteIP));
    }
    if (whereSql.length === 0) throw new Error("invalid query");

    whereArgs.push(now - timeout);
    return this.selectSessions(
      "(" +
        whereSql.join(" OR ") + // TODO: check if this is correct
        ") AND StartTime > ? AND ((Status IN ('claiming','finished') AND Mode = 'gitcoin') OR (Status IN ('claimable','claiming','finished') AND Mode = 'pow'))",
      whereArgs,
      skipData
    );
  }

  public async getLastFinishedSessionStartTime(
    userId: string,
    timeout: number
  ): Promise<null | number> {
    const whereSql: string[] = ["UserId = ?"];
    const whereArgs: any[] = [userId, nowSeconds() - timeout];

    const finishedSessions = await this.selectSessions(
      "(" +
        whereSql.join(" OR ") +
        ") AND StartTime > ? AND ((Status IN ('claiming','finished') AND Mode = 'gitcoin') OR (Status IN ('claimable','claiming','finished') AND Mode = 'pow'))",
      whereArgs,
      true
    );

    if (!finishedSessions || !finishedSessions.length) {
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.INFO,
        "no finished sessions"
      );
      return null;
    }
    const lastSession = finishedSessions[finishedSessions.length - 1];
    ServiceManager.GetService(FaucetProcess).emitLog(
      FaucetLogLevel.INFO,
      "lastSessionId: " + lastSession.sessionId
    );
    ServiceManager.GetService(FaucetProcess).emitLog(
      FaucetLogLevel.INFO,
      "lastSession startTime: " + lastSession.startTime
    );
    return lastSession.startTime;
  }

  public async getClaimableSessions(userId: string) {
    const claimableSessions = await this.selectSessions(
      "UserId = ? AND Status IN ('claimable')",
      [userId],
      true
    );
    return claimableSessions;
  }

  public async getSession(sessionId: string): Promise<FaucetSessionStoreData> {
    const row = (await this.db.get(
      "SELECT SessionId,Status,StartTime,TargetAddr,DropAmount,RemoteIP,Tasks,Data,ClaimData,UserId,Mode FROM Sessions WHERE SessionId = ?",
      [sessionId]
    )) as {
      SessionId: string;
      Status: string;
      StartTime: number;
      TargetAddr: string;
      DropAmount: string;
      RemoteIP: string;
      Tasks: string;
      Data: string;
      ClaimData: string;
      UserId: string;
      Mode: "pow" | "gitcoin";
    };

    if (!row) return null;

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
      userId: row.UserId,
      mode: row.Mode as "pow" | "gitcoin",
    };
  }

  public async updateSession(
    sessionData: FaucetSessionStoreData
  ): Promise<void> {
    const hashedIp = getHashedIp(sessionData.remoteIP);
    await this.db.run(
      SQL.driverSql({
        [FaucetDbDriver.SQLITE]:
          "INSERT OR REPLACE INTO Sessions (SessionId,Status,StartTime,TargetAddr,DropAmount,RemoteIP,Tasks,Data,ClaimData,UserId,Mode) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [FaucetDbDriver.MYSQL]:
          "REPLACE INTO Sessions (SessionId,Status,StartTime,TargetAddr,DropAmount,RemoteIP,Tasks,Data,ClaimData,UserId,Mode) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      }),
      [
        sessionData.sessionId,
        sessionData.status,
        sessionData.startTime,
        sessionData.targetAddr,
        sessionData.dropAmount,
        hashedIp,
        JSON.stringify(sessionData.tasks),
        JSON.stringify(sessionData.data),
        sessionData.claim ? JSON.stringify(sessionData.claim) : null,
        sessionData.userId,
        sessionData.mode,
      ]
    );
  }

  public async updateClaimData(
    sessionId: string,
    claimData: EthClaimData
  ): Promise<void> {
    let status: FaucetSessionStatus;
    switch (claimData.claimStatus) {
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
    await this.db.run(
      "UPDATE Sessions SET Status = ?, ClaimData = ? WHERE Status = 'claiming' AND SessionId = ?",
      [status, JSON.stringify(claimData), sessionId]
    );
  }

  public async getClaimableAmount(): Promise<bigint> {
    const row = (await this.db.get(
      "SELECT SUM(CAST(DropAmount AS FLOAT)) AS TotalAmount FROM Sessions WHERE Status = 'claimable'"
    )) as {
      TotalAmount: string;
    };
    if (!row || !row.TotalAmount) return 0n;
    return BigInt(row.TotalAmount);
  }
}
