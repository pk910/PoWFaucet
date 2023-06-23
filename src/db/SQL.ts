import { faucetConfig } from "../config/FaucetConfig";
import { FaucetDbDriver } from "./FaucetDatabase";

export class SQL {

  public static driverSql(sqlMap: {[driver in FaucetDbDriver]: string}, driver?: FaucetDbDriver): string {
    return sqlMap[driver || faucetConfig.database.driver];
  }

  public static field(name: string, driver?: FaucetDbDriver): string {
    switch(driver || faucetConfig.database.driver) {
      case FaucetDbDriver.MYSQL: return "`" + name + "`";
      default: return name;
    }
  }
}
