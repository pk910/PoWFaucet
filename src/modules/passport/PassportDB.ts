import { FaucetDbDriver } from '../../db/FaucetDatabase';
import { FaucetModuleDB } from '../../db/FaucetModuleDB';
import { SQL } from '../../db/SQL';
import { IPassportInfo } from './PassportResolver';

export class PassportDB extends FaucetModuleDB {
  protected override latestSchemaVersion = 1;
  
  protected override async upgradeSchema(version: number): Promise<number> {
    switch(version) {
      case 0:
        version = 1;
        await this.db.exec(SQL.driverSql({
          [FaucetDbDriver.SQLITE]: `
            CREATE TABLE "PassportCache" (
              "Address" TEXT NOT NULL UNIQUE,
              "Json" TEXT NOT NULL,
              "Timeout" INTEGER NOT NULL,
              PRIMARY KEY("Address")
            );`,
          [FaucetDbDriver.MYSQL]: `
            CREATE TABLE PassportCache (
              Address CHAR(42) NOT NULL UNIQUE,
              Json TEXT NOT NULL,
              Timeout INT(11) NOT NULL,
              PRIMARY KEY(Address)
            );`,
        }));
        await this.db.exec(SQL.driverSql({
          [FaucetDbDriver.SQLITE]: `
            CREATE TABLE "PassportStamps" (
              "StampHash" TEXT NOT NULL UNIQUE,
              "Address" TEXT NOT NULL,
              "Timeout" INTEGER NOT NULL,
              PRIMARY KEY("StampHash")
            );`,
          [FaucetDbDriver.MYSQL]: `
            CREATE TABLE PassportStamps (
              StampHash VARCHAR(250) NOT NULL UNIQUE,
              Address CHAR(42) NOT NULL,
              Timeout INT(11) NOT NULL,
              PRIMARY KEY(StampHash)
            );`,
        }));
        await this.db.exec(SQL.driverSql({
          [FaucetDbDriver.SQLITE]: `CREATE INDEX "PassportCacheTimeIdx" ON "PassportCache" ("Timeout"	ASC);`,
          [FaucetDbDriver.MYSQL]: `ALTER TABLE PassportCache ADD INDEX PassportCacheTimeIdx (Timeout);`,
        }));
        await this.db.exec(SQL.driverSql({
          [FaucetDbDriver.SQLITE]: `CREATE INDEX "PassportStampsTimeIdx" ON "PassportStamps" ("Timeout"	ASC);`,
          [FaucetDbDriver.MYSQL]: `ALTER TABLE PassportStamps ADD INDEX PassportStampsTimeIdx (Timeout);`,
        }));
    }
    return version;
  }

  public override async cleanStore(): Promise<void> {
    let now = this.now();
    await this.db.run("DELETE FROM PassportCache WHERE Timeout < ?", [now]);
    await this.db.run("DELETE FROM PassportStamps WHERE Timeout < ?", [now]);
  }

  public async getPassportInfo(addr: string): Promise<IPassportInfo> {
    let row = await this.db.get(
      "SELECT Json FROM PassportCache WHERE Address = ? AND Timeout > ?", 
      [addr.toLowerCase(), this.now()]
    ) as {Json: string};
    if(!row)
      return null;
    
    return JSON.parse(row.Json);
  }

  public async setPassportInfo(addr: string, info: IPassportInfo, duration?: number): Promise<void> {
    let now = this.now();
    let row = await this.db.get(
      "SELECT Timeout FROM PassportCache WHERE Address = ?",
      addr.toLowerCase()
    );
    
    let timeout = now + (typeof duration === "number" ? duration : 86400);
    let infoJson = JSON.stringify(info);

    if(row) {
      await this.db.run(
        "UPDATE PassportCache SET Json = ?, Timeout = ? WHERE Address = ?", 
        [infoJson, timeout, addr.toLowerCase()]
      );
    }
    else {
      await this.db.run(
        "INSERT INTO PassportCache (Address, Json, Timeout) VALUES (?, ?, ?)",
        [addr.toLowerCase(), infoJson, timeout]
      );
    }
  }
  
  public async getPassportStamps(stampHashs: string[]): Promise<{[hash: string]: string}> {
    let sql = "SELECT StampHash, Address FROM PassportStamps WHERE StampHash IN (" + stampHashs.map(() => "?").join(",") + ") AND Timeout > ?";
    let args: any[] = [];
    let stamps: {[hash: string]: string} = {};
    stampHashs.forEach((stampHash) => {
      args.push(stampHash);
      stamps[stampHash] = null;
    });
    args.push(this.now());

    let rows = await this.db.all(sql, args) as {StampHash: string, Address: string}[];
    rows.forEach((row) => {
      stamps[row.StampHash] = row.Address;
    });

    return stamps;
  }

  public async updatePassportStamps(stampHashs: string[], address: string, duration?: number): Promise<void> {
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
    
    let query = await this.db.run(
      SQL.driverSql({
        [FaucetDbDriver.SQLITE]: "INSERT OR REPLACE INTO PassportStamps (StampHash, Address, Timeout) VALUES " + queryRows,
        [FaucetDbDriver.MYSQL]: "REPLACE INTO PassportStamps (StampHash, Address, Timeout) VALUES " + queryRows,
      }),
      queryArgs
    );
  }

}