import { FaucetDbDriver } from '../../db/FaucetDatabase';
import { FaucetModuleDB } from '../../db/FaucetModuleDB';
import { SQL } from '../../db/SQL';
import { FaucetSessionStoreData } from '../../session/FaucetSession';
import { IGithubInfo } from './GithubResolver';

export class GithubDB extends FaucetModuleDB {
  protected override latestSchemaVersion = 1;
  
  protected override async upgradeSchema(version: number): Promise<number> {
    switch(version) {
      case 0:
        version = 1;
        await this.db.exec(SQL.driverSql({
          [FaucetDbDriver.SQLITE]: `
            CREATE TABLE "GithubCache" (
              "UserId" TEXT NOT NULL UNIQUE,
              "Json" TEXT NOT NULL,
              "Timeout" INTEGER NOT NULL,
              PRIMARY KEY("UserId")
            );`,
          [FaucetDbDriver.MYSQL]: `
            CREATE TABLE GithubCache (
              UserId VARCHAR(40) NOT NULL,
              Json TEXT NOT NULL,
              Timeout INT(11) NOT NULL,
              PRIMARY KEY(UserId)
            );`,
        }));
        await this.db.exec(SQL.driverSql({
          [FaucetDbDriver.SQLITE]: `CREATE INDEX "GithubCacheTimeIdx" ON "GithubCache" ("Timeout"	ASC);`,
          [FaucetDbDriver.MYSQL]: `ALTER TABLE GithubCache ADD INDEX GithubCacheTimeIdx (Timeout);`,
        }));
        await this.db.exec(SQL.driverSql({
          [FaucetDbDriver.SQLITE]: `
            CREATE TABLE "GithubSessions" (
              "SessionId" TEXT NOT NULL UNIQUE,
              "UserId" TEXT NOT NULL,
              PRIMARY KEY("SessionId")
            );`,
          [FaucetDbDriver.MYSQL]: `
            CREATE TABLE GithubSessions (
              SessionId CHAR(36) NOT NULL,
              UserId VARCHAR(40) NOT NULL,
              PRIMARY KEY(SessionId)
            );`,
        }));
        await this.db.exec(SQL.driverSql({
          [FaucetDbDriver.SQLITE]: `CREATE INDEX "GithubSessionsUserIdx" ON "GithubSessions" ("UserId"	ASC);`,
          [FaucetDbDriver.MYSQL]: `ALTER TABLE GithubSessions ADD INDEX GithubSessionsUserIdx (UserId);`,
        }));
    }
    return version;
  }

  public override async cleanStore(): Promise<void> {
    await this.db.run("DELETE FROM GithubCache WHERE Timeout < ?", [this.now()]);

    let rows = await this.db.all([
      "SELECT GithubSessions.SessionId",
      "FROM GithubSessions",
      "LEFT JOIN Sessions ON Sessions.SessionId = GithubSessions.SessionId",
      "WHERE Sessions.SessionId IS NULL",
    ].join(" "));
    let dataIdx = 0;
    let promises: Promise<void>[] = [];
    while(dataIdx < rows.length) {
      let batchLen = Math.min(rows.length - dataIdx, 100);
      let dataBatch = rows.slice(dataIdx, dataIdx + batchLen);
      dataIdx += batchLen;
      promises.push(this.db.run(
        "DELETE FROM GithubSessions WHERE SessionId IN (" + dataBatch.map(b => "?").join(",") + ")",
        dataBatch.map(b => b.SessionId) as any[]
      ).then())
    }
    await Promise.all(promises);
  }

  public async getGithubInfo(userId: number): Promise<IGithubInfo> {
    let row = await this.db.get(
      "SELECT Json FROM GithubCache WHERE UserId = ? AND Timeout > ?", 
      [userId.toString(), this.now()]
    ) as {Json: string};
    if(!row)
      return null;
    
    return JSON.parse(row.Json);
  }

  public async setGithubInfo(userId: number, info: IGithubInfo, duration?: number): Promise<void> {
    let now = this.now();
    let row = await this.db.get("SELECT Timeout FROM GithubCache WHERE UserId = ?", [userId.toString()]);
    
    let timeout = now + (typeof duration === "number" ? duration : 86400);
    let infoJson = JSON.stringify(info);

    if(row) {
      await this.db.run("UPDATE GithubCache SET Json = ?, Timeout = ? WHERE UserId = ?", [infoJson, timeout, userId.toString()]);
    }
    else {
      await this.db.run("INSERT INTO GithubCache (UserId, Json, Timeout) VALUES (?, ?, ?)", [userId.toString(), infoJson, timeout]);
    }
  }

  public getGithubSessions(userId: number, duration: number, skipData?: boolean): Promise<FaucetSessionStoreData[]> {
    let now = this.now();
    return this.faucetStore.selectSessionsSql([
      "FROM GithubSessions",
      "INNER JOIN Sessions ON Sessions.SessionId = GithubSessions.SessionId",
      "WHERE GithubSessions.UserId = ? AND Sessions.StartTime > ? AND Sessions.Status IN ('claimable','claiming','finished')",
    ].join(" "), [ userId.toString(), now - duration ], skipData);
  }

  public async setGithubSession(sessionId: string, userId: number): Promise<void> {
    await this.db.run(
      SQL.driverSql({
        [FaucetDbDriver.SQLITE]: "INSERT OR REPLACE INTO GithubSessions (SessionId,UserId) VALUES (?,?)",
        [FaucetDbDriver.MYSQL]: "REPLACE INTO GithubSessions (SessionId,UserId) VALUES (?,?)",
      }),
      [
        sessionId,
        userId.toString(),
      ]
    );
  }

}