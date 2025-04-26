import { FaucetDbDriver } from '../../db/FaucetDatabase.js';
import { FaucetModuleDB } from '../../db/FaucetModuleDB.js';
import { SQL } from '../../db/SQL.js';
import { FaucetSessionStoreData } from '../../session/FaucetSession.js';

interface IVoucher {
  code: string;
  dropAmount: string;
  sessionId?: string;
  targetAddr?: string;
  startTime?: number;
}

export class VoucherDB extends FaucetModuleDB {
  protected override latestSchemaVersion = 1;
  
  protected override async upgradeSchema(version: number): Promise<number> {
    switch(version) {
      case 0:
        version = 1;
        await this.db.exec(SQL.driverSql({
          [FaucetDbDriver.SQLITE]: `
            CREATE TABLE "Vouchers" (
              "Code" TEXT NOT NULL UNIQUE,
              "DropAmount" TEXT NOT NULL,
              "SessionId" TEXT NULL,
              "TargetAddr" TEXT NULL,
              "StartTime" INTEGER NULL,
              PRIMARY KEY("Code")
            );`,
          [FaucetDbDriver.MYSQL]: `
            CREATE TABLE Vouchers (
              Code VARCHAR(50) NOT NULL,
              DropAmount VARCHAR(50) NOT NULL,
              SessionId CHAR(36) NULL,
              TargetAddr CHAR(42) NULL,
              StartTime INT(11) NULL,
              PRIMARY KEY(Code)
            );`,
        }));
    }
    return version;
  }

  public async getVoucher(code: string): Promise<IVoucher | null> {
    let sql = [
      "SELECT Code, DropAmount, SessionId, TargetAddr, StartTime",
      "FROM Vouchers",
      "WHERE Code = ?",
    ].join(" ");
    let rows = await this.db.all(sql, [ code ]) as {
      Code: string;
      DropAmount: string;
      SessionId: string;
      TargetAddr: string;
      StartTime: number;
    }[];
    
    let vouchers = rows.map((row) => {
      return {
        code: row.Code,
        dropAmount: row.DropAmount,
        sessionId: row.SessionId,
        targetAddr: row.TargetAddr,
        startTime: row.StartTime,
      };
    });

    if(vouchers.length === 0)
      return null;

    return vouchers[0];
  }

  public async updateVoucher(code: string, sessionId: string, targetAddr: string, startTime: number): Promise<void> {
    await this.db.run(
      "UPDATE Vouchers SET SessionId = ?, TargetAddr = ?, StartTime = ? WHERE Code = ?",
      [
        sessionId,
        targetAddr,
        startTime,
        code,
      ]
    );
  }

}