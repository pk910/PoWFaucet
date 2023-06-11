import { FaucetModuleDB } from '../../db/FaucetModuleDB';
import { IIPInfo } from './IPInfoResolver';

export class IPInfoDB extends FaucetModuleDB {
  protected override latestSchemaVersion = 1;
  
  protected override upgradeSchema(version: number): number {
    switch(version) {
      case 0:
        version = 1;
        this.db.exec(`
          CREATE TABLE "IPInfoCache" (
            "IP" TEXT NOT NULL UNIQUE,
            "Json" TEXT NOT NULL,
            "Timeout" INTEGER NOT NULL,
            PRIMARY KEY("IP")
          );
          CREATE INDEX "IPInfoCacheTimeIdx" ON "IPInfoCache" (
            "Timeout"	ASC
          );
        `);
    }
    return version;
  }

  public override cleanStore(): void {
    this.db.run("DELETE FROM IPInfoCache WHERE Timeout < ?", [this.now()]);
  }

  public getIPInfo(ip: string): IIPInfo {
    let row = this.db.get(
      "SELECT Json FROM IPInfoCache WHERE IP = ? AND Timeout > ?", 
      [ip.toLowerCase(), this.now()]
    ) as {Json: string};
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
      this.db.run("UPDATE IPInfoCache SET Json = ?, Timeout = ? WHERE IP = ?", [infoJson, timeout, ip.toLowerCase()]);
    }
    else {
      this.db.run("INSERT INTO IPInfoCache (IP, Json, Timeout) VALUES (?, ?, ?)", [ip.toLowerCase(), infoJson, timeout]);
    }
  }

}