import { faucetConfig } from "../config/FaucetConfig";
import { FaucetDbDriver } from "./FaucetDatabase";

export class SQL {

  public static driverSql(sqlMap: {[driver in FaucetDbDriver]: string}): string {
    return sqlMap[faucetConfig.database.driver];
  }

  public static field(name: string): string {
    switch(faucetConfig.database.driver) {
      case FaucetDbDriver.MYSQL: return "`" + name + "`";
      default: return name;
    }
  }
}
