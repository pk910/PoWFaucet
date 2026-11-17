import { FaucetDbDriver } from '../../db/FaucetDatabase.js';
import { FaucetModuleDB } from '../../db/FaucetModuleDB.js';
import { SQL } from '../../db/SQL.js';
import { FaucetSessionStoreData } from '../../session/FaucetSession.js';

export class AuthenticatoorDB extends FaucetModuleDB {
  protected override latestSchemaVersion = 2;

  protected override async upgradeSchema(version: number): Promise<number> {
    switch(version) {
      case 0:
        version = 1;
        await this.db.exec(SQL.driverSql({
          [FaucetDbDriver.SQLITE]: `
            CREATE TABLE "AuthenticatoorSessions" (
              "SessionId" TEXT NOT NULL UNIQUE,
              "UserId" TEXT NOT NULL,
              "Issuer" TEXT NOT NULL,
              PRIMARY KEY("SessionId")
            );`,
          [FaucetDbDriver.MYSQL]: `
            CREATE TABLE AuthenticatoorSessions (
              SessionId CHAR(36) NOT NULL,
              UserId VARCHAR(190) NOT NULL,
              Issuer VARCHAR(190) NOT NULL,
              PRIMARY KEY(SessionId)
            );`,
        }));
        await this.db.exec(SQL.driverSql({
          [FaucetDbDriver.SQLITE]: `CREATE INDEX "AuthenticatoorSessionsUserIdx" ON "AuthenticatoorSessions" ("UserId" ASC);`,
          [FaucetDbDriver.MYSQL]: `ALTER TABLE AuthenticatoorSessions ADD INDEX AuthenticatoorSessionsUserIdx (UserId);`,
        }));
      case 1:
        version = 2;
        // the id of the grant selected for a session, NULL without a selection
        await this.db.exec(SQL.driverSql({
          [FaucetDbDriver.SQLITE]: `ALTER TABLE "AuthenticatoorSessions" ADD COLUMN "GrantId" TEXT NULL DEFAULT NULL;`,
          [FaucetDbDriver.MYSQL]: `ALTER TABLE AuthenticatoorSessions ADD COLUMN GrantId VARCHAR(64) NULL DEFAULT NULL;`,
        }));
    }
    return version;
  }

  public override async cleanStore(): Promise<void> {
    let rows = await this.db.all([
      "SELECT AuthenticatoorSessions.SessionId",
      "FROM AuthenticatoorSessions",
      "LEFT JOIN Sessions ON Sessions.SessionId = AuthenticatoorSessions.SessionId",
      "WHERE Sessions.SessionId IS NULL",
    ].join(" "));
    let dataIdx = 0;
    let promises: Promise<void>[] = [];
    while(dataIdx < rows.length) {
      let batchLen = Math.min(rows.length - dataIdx, 100);
      let dataBatch = rows.slice(dataIdx, dataIdx + batchLen);
      dataIdx += batchLen;
      promises.push(this.db.run(
        "DELETE FROM AuthenticatoorSessions WHERE SessionId IN (" + dataBatch.map(b => "?").join(",") + ")",
        dataBatch.map(b => b.SessionId) as any[]
      ).then())
    }
    await Promise.all(promises);
  }

  public getUserSessions(userId: string, duration: number, skipData?: boolean): Promise<FaucetSessionStoreData[]> {
    let now = this.now();
    return this.faucetStore.selectSessionsSql([
      "FROM AuthenticatoorSessions",
      "INNER JOIN Sessions ON Sessions.SessionId = AuthenticatoorSessions.SessionId",
      "WHERE AuthenticatoorSessions.UserId = ? AND Sessions.StartTime > ? AND Sessions.Status IN ('claimable','claiming','finished')",
    ].join(" "), [ userId, now - duration ], skipData);
  }

  // The user's sessions that selected the grant and are running, claimable or completed.
  public getUserGrantSessions(userId: string, grantId: string, duration: number, skipData?: boolean): Promise<FaucetSessionStoreData[]> {
    let now = this.now();
    return this.faucetStore.selectSessionsSql([
      "FROM AuthenticatoorSessions",
      "INNER JOIN Sessions ON Sessions.SessionId = AuthenticatoorSessions.SessionId",
      "WHERE AuthenticatoorSessions.UserId = ? AND AuthenticatoorSessions.GrantId = ? AND Sessions.StartTime > ? AND Sessions.Status IN ('running','claimable','claiming','finished')",
    ].join(" "), [ userId, grantId, now - duration ], skipData);
  }

  public async setUserSession(sessionId: string, userId: string, issuer: string, grantId?: string | null): Promise<void> {
    await this.db.run(
      SQL.driverSql({
        [FaucetDbDriver.SQLITE]: "INSERT OR REPLACE INTO AuthenticatoorSessions (SessionId,UserId,Issuer,GrantId) VALUES (?,?,?,?)",
        [FaucetDbDriver.MYSQL]: "REPLACE INTO AuthenticatoorSessions (SessionId,UserId,Issuer,GrantId) VALUES (?,?,?,?)",
      }),
      [ sessionId, userId, issuer, grantId || null ]
    );
  }

}
