import { FaucetModuleDB } from '../../db/FaucetModuleDB';
import { IPassportInfo } from './PassportResolver';

export class PassportDB extends FaucetModuleDB {
  protected override latestSchemaVersion = 1;
  
  protected override upgradeSchema(version: number): number {
    switch(version) {
      case 0:
        version = 1;
        this.db.exec(`
          CREATE TABLE "PassportCache" (
            "Address" TEXT NOT NULL UNIQUE,
            "Json" TEXT NOT NULL,
            "Timeout" INTEGER NOT NULL,
            PRIMARY KEY("Address")
          );
          CREATE TABLE "PassportStamps" (
            "StampHash" TEXT NOT NULL UNIQUE,
            "Address" TEXT NOT NULL,
            "Timeout" INTEGER NOT NULL,
            PRIMARY KEY("StampHash")
          );
          
          CREATE INDEX "PassportCacheTimeIdx" ON "PassportCache" (
            "Timeout"	ASC
          );
          CREATE INDEX "PassportStampsTimeIdx" ON "PassportStamps" (
            "Timeout"	ASC
          );
        `);
    }
    return version;
  }

  public override cleanStore(): void {
    let now = this.now();
    this.db.run("DELETE FROM PassportCache WHERE Timeout < ?", [now]);
    this.db.run("DELETE FROM PassportStamps WHERE Timeout < ?", [now]);
  }

  public getPassportInfo(addr: string): IPassportInfo {
    let row = this.db.get(
      "SELECT Json FROM PassportCache WHERE Address = ? AND Timeout > ?", 
      [addr.toLowerCase(), this.now()]
    ) as {Json: string};
    if(!row)
      return null;
    
    return JSON.parse(row.Json);
  }

  public setPassportInfo(addr: string, info: IPassportInfo, duration?: number) {
    let now = this.now();
    let row = this.db.get(
      "SELECT Timeout FROM PassportCache WHERE Address = ?",
      addr.toLowerCase()
    );
    
    let timeout = now + (typeof duration === "number" ? duration : 86400);
    let infoJson = JSON.stringify(info);

    if(row) {
      this.db.run(
        "UPDATE PassportCache SET Json = ?, Timeout = ? WHERE Address = ?", 
        [infoJson, timeout, addr.toLowerCase()]
      );
    }
    else {
      this.db.run(
        "INSERT INTO PassportCache (Address, Json, Timeout) VALUES (?, ?, ?)",
        [addr.toLowerCase(), infoJson, timeout]
      );
    }
  }
  
  public getPassportStamps(stampHashs: string[]): {[hash: string]: string} {
    let sql = "SELECT StampHash, Address FROM PassportStamps WHERE StampHash IN (" + stampHashs.map(() => "?").join(",") + ") AND Timeout > ?";
    let args: any[] = [];
    let stamps: {[hash: string]: string} = {};
    stampHashs.forEach((stampHash) => {
      args.push(stampHash);
      stamps[stampHash] = null;
    });
    args.push(this.now());

    (this.db.all(sql, args) as {StampHash: string, Address: string}[]).forEach((row) => {
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
    
    let query = this.db.run(
      "INSERT OR REPLACE INTO PassportStamps (StampHash, Address, Timeout) VALUES " + queryRows,
      queryArgs
    );
  }

}