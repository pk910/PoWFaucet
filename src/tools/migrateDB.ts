import { MySQLDriver } from "../db/driver/MySQLDriver.js";
import { SQLiteDriver } from "../db/driver/SQLiteDriver.js";
import { FaucetDbDriver } from "../db/FaucetDatabase.js";
import { SQL } from "../db/SQL.js";

(async function() {
  // migration config
  let sourceDB = new SQLiteDriver();
  let sourceDrv = FaucetDbDriver.SQLITE;
  await sourceDB.open({
    driver: sourceDrv,
    file: "./faucet-store.db"
  });

  let targetDB = new MySQLDriver();
  let targetDrv = FaucetDbDriver.MYSQL;
  await targetDB.open({
    driver: targetDrv,
    host: "10.16.71.107",
    username: "dev-faucet",
    password: "**censored**",
    database: "dev-faucet",
  });

  let migrations = {
    keyValueStore: true,
    sessions: true,
    ipInfoCache: true,
    passportCache: true,
    passportStamps: true,
  };


  // migration script
  if(migrations.keyValueStore) {
    let data = await sourceDB.all("SELECT " + SQL.field("Key", sourceDrv) + ",Value FROM KeyValueStore");
    for(let i = 0; i < data.length; i++) {
      await targetDB.run(
        SQL.driverSql({
          [FaucetDbDriver.SQLITE]: "INSERT OR REPLACE INTO KeyValueStore (Key,Value) VALUES (?,?)",
          [FaucetDbDriver.MYSQL]: "REPLACE INTO KeyValueStore (`Key`,Value) VALUES (?,?)",
        }, targetDrv),
        [ data[i].Key as any, data[i].Value as any ]
      );
    }
  }

  async function migrateTable(table: string, fields: string[], batchSize?: number) {
    if(!batchSize)
      batchSize = 10;
    console.log("migrating table " + table)
    await targetDB.run("DELETE FROM " + table);
    let data = await sourceDB.all("SELECT " + fields.map((f) => SQL.field(f, sourceDrv)).join(",") + " FROM " + table);
    let dataIdx = 0;
    while(dataIdx < data.length) {
      let batchLen = Math.min(data.length - dataIdx, batchSize);
      let dataBatch = data.slice(dataIdx, dataIdx + batchLen);
      console.log("  migrate batch " + dataIdx + " - " + (dataIdx + batchLen));
      dataIdx += batchLen;
      let args = [];
      let sql = [
        "INSERT INTO " + table,
        " (" + fields.map((f) => SQL.field(f, sourceDrv)).join(",") + ") ",
        "VALUES ",
        dataBatch.map(b => {
          return "(" + fields.map((f) => {
            args.push(b[f]);
            return "?";
          }).join(",") + ")"
        }).join(",")
      ].join("");
      await targetDB.run(sql, args);
    }
  }

  if(migrations.sessions)
    await migrateTable("Sessions", ["SessionId", "Status", "StartTime", "TargetAddr", "DropAmount", "RemoteIP", "Tasks", "Data", "ClaimData"]);
  if(migrations.ipInfoCache)
    await migrateTable("IPInfoCache", ["IP", "Json", "Timeout"]);
  if(migrations.passportCache)
    await migrateTable("PassportCache", ["Address", "Json", "Timeout"]);
  if(migrations.passportStamps)
    await migrateTable("PassportStamps", ["StampHash", "Address", "Timeout"]);
  
  console.log("migration complete!");
  process.exit(0);

})();

