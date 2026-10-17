import { FaucetDbDriver } from '../../db/FaucetDatabase.js';
import { FaucetModuleDB } from '../../db/FaucetModuleDB.js';
import { SQL } from '../../db/SQL.js';
import { FaucetSessionStoreData } from '../../session/FaucetSession.js';

export class TicketProofDB extends FaucetModuleDB {
  protected override latestSchemaVersion = 1;

  protected override async upgradeSchema(version: number): Promise<number> {
    switch(version) {
      case 0:
        version = 1;
        await this.db.exec(SQL.driverSql({
          [FaucetDbDriver.SQLITE]: `
            CREATE TABLE "TicketProofSessions" (
              "SessionId" TEXT NOT NULL UNIQUE,
              "Identifier" TEXT NOT NULL,
              "Tier" TEXT NOT NULL,
              "Event" TEXT NOT NULL,
              PRIMARY KEY("SessionId")
            );`,
          [FaucetDbDriver.MYSQL]: `
            CREATE TABLE TicketProofSessions (
              SessionId CHAR(36) NOT NULL,
              Identifier CHAR(66) NOT NULL,
              Tier VARCHAR(32) NOT NULL,
              Event VARCHAR(100) NOT NULL,
              PRIMARY KEY(SessionId)
            );`,
        }));
        await this.db.exec(SQL.driverSql({
          [FaucetDbDriver.SQLITE]: `CREATE INDEX "TicketProofSessionsIdentIdx" ON "TicketProofSessions" ("Identifier" ASC);`,
          [FaucetDbDriver.MYSQL]: `ALTER TABLE TicketProofSessions ADD INDEX TicketProofSessionsIdentIdx (Identifier);`,
        }));
    }
    return version;
  }

  public override async cleanStore(): Promise<void> {
    let rows = await this.db.all([
      "SELECT TicketProofSessions.SessionId",
      "FROM TicketProofSessions",
      "LEFT JOIN Sessions ON Sessions.SessionId = TicketProofSessions.SessionId",
      "WHERE Sessions.SessionId IS NULL",
    ].join(" "));
    let dataIdx = 0;
    let promises: Promise<void>[] = [];
    while(dataIdx < rows.length) {
      let batchLen = Math.min(rows.length - dataIdx, 100);
      let dataBatch = rows.slice(dataIdx, dataIdx + batchLen);
      dataIdx += batchLen;
      promises.push(this.db.run(
        "DELETE FROM TicketProofSessions WHERE SessionId IN (" + dataBatch.map(b => "?").join(",") + ")",
        dataBatch.map(b => b.SessionId) as any[]
      ).then())
    }
    await Promise.all(promises);
  }

  public getTicketSessions(identifier: string, duration: number, skipData?: boolean): Promise<FaucetSessionStoreData[]> {
    let now = this.now();
    return this.faucetStore.selectSessionsSql([
      "FROM TicketProofSessions",
      "INNER JOIN Sessions ON Sessions.SessionId = TicketProofSessions.SessionId",
      "WHERE TicketProofSessions.Identifier = ? AND Sessions.StartTime > ? AND Sessions.Status IN ('claimable','claiming','finished')",
    ].join(" "), [ identifier, now - duration ], skipData);
  }

  public async setTicketSession(sessionId: string, identifier: string, tier: string, event: string): Promise<void> {
    await this.db.run(
      SQL.driverSql({
        [FaucetDbDriver.SQLITE]: "INSERT OR REPLACE INTO TicketProofSessions (SessionId,Identifier,Tier,Event) VALUES (?,?,?,?)",
        [FaucetDbDriver.MYSQL]: "REPLACE INTO TicketProofSessions (SessionId,Identifier,Tier,Event) VALUES (?,?,?,?)",
      }),
      [
        sessionId,
        identifier,
        tier,
        event,
      ]
    );
  }

}
