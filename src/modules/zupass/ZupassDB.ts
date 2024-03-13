import { FaucetDbDriver } from '../../db/FaucetDatabase.js';
import { FaucetModuleDB } from '../../db/FaucetModuleDB.js';
import { SQL } from '../../db/SQL.js';
import { FaucetSessionStoreData } from '../../session/FaucetSession.js';

export class ZupassDB extends FaucetModuleDB {
  protected override latestSchemaVersion = 1;
  
  protected override async upgradeSchema(version: number): Promise<number> {
    switch(version) {
      case 0:
        version = 1;
        await this.db.exec(SQL.driverSql({
          [FaucetDbDriver.SQLITE]: `
            CREATE TABLE "ZupassSessions" (
              "SessionId" TEXT NOT NULL UNIQUE,
              "TicketId" TEXT NOT NULL,
              "EventId" TEXT NOT NULL,
              "ProductId" TEXT NOT NULL,
              "AttendeeId" TEXT NOT NULL,
              PRIMARY KEY("SessionId")
            );`,
          [FaucetDbDriver.MYSQL]: `
            CREATE TABLE ZupassSessions (
              SessionId CHAR(36) NOT NULL,
              TicketId CHAR(36) NOT NULL,
              EventId CHAR(36) NOT NULL,
              ProductId CHAR(36) NOT NULL,
              AttendeeId VARCHAR(150) NOT NULL,
              PRIMARY KEY(SessionId)
            );`,
        }));
        await this.db.exec(SQL.driverSql({
          [FaucetDbDriver.SQLITE]: `CREATE INDEX "ZupassSessionsAttendeeIdx" ON "ZupassSessions" ("AttendeeId"	ASC);`,
          [FaucetDbDriver.MYSQL]: `ALTER TABLE ZupassSessions ADD INDEX ZupassSessionsAttendeeIdx (AttendeeId);`,
        }));
    }
    return version;
  }

  public override async cleanStore(): Promise<void> {
    let rows = await this.db.all([
      "SELECT ZupassSessions.SessionId",
      "FROM ZupassSessions",
      "LEFT JOIN Sessions ON Sessions.SessionId = ZupassSessions.SessionId",
      "WHERE Sessions.SessionId IS NULL",
    ].join(" "));
    let dataIdx = 0;
    let promises: Promise<void>[] = [];
    while(dataIdx < rows.length) {
      let batchLen = Math.min(rows.length - dataIdx, 100);
      let dataBatch = rows.slice(dataIdx, dataIdx + batchLen);
      dataIdx += batchLen;
      promises.push(this.db.run(
        "DELETE FROM ZupassSessions WHERE SessionId IN (" + dataBatch.map(b => "?").join(",") + ")",
        dataBatch.map(b => b.SessionId) as any[]
      ).then())
    }
    await Promise.all(promises);
  }

  public getZupassSessions(attendeeId: string, duration: number, skipData?: boolean): Promise<FaucetSessionStoreData[]> {
    let now = this.now();
    return this.faucetStore.selectSessionsSql([
      "FROM ZupassSessions",
      "INNER JOIN Sessions ON Sessions.SessionId = ZupassSessions.SessionId",
      "WHERE ZupassSessions.AttendeeId = ? AND Sessions.StartTime > ? AND Sessions.Status IN ('claimable','claiming','finished')",
    ].join(" "), [ attendeeId, now - duration ], skipData);
  }

  public async setZupassSession(sessionId: string, attendeeId: string, ticketId: string, eventId: string, productId: string): Promise<void> {
    await this.db.run(
      SQL.driverSql({
        [FaucetDbDriver.SQLITE]: "INSERT OR REPLACE INTO ZupassSessions (SessionId,TicketId,EventId,ProductId,AttendeeId) VALUES (?,?,?,?,?)",
        [FaucetDbDriver.MYSQL]: "REPLACE INTO ZupassSessions (SessionId,TicketId,EventId,ProductId,AttendeeId) VALUES (?,?,?,?,?)",
      }),
      [
        sessionId,
        ticketId,
        eventId,
        productId,
        attendeeId
      ]
    );
  }

}