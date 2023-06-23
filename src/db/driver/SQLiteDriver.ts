import { FaucetDbDriver } from "../FaucetDatabase";
import { BaseDriver, BindValues, QueryResult, RunResult } from "./BaseDriver";

export interface ISQLiteOptions {
  driver: FaucetDbDriver.SQLITE;

  file: string;
}

export class SQLiteDriver extends BaseDriver<ISQLiteOptions> {
  private static sqlite: Promise<any>;

  private static loadSQLite(): Promise<any> {
    if(!this.sqlite) {
      this.sqlite = import("../../../libs/sqlite3_wasm");
    }
    return this.sqlite;
  }

  private db: any;

  public override async open(options: ISQLiteOptions): Promise<void> {
    let sqlite = await SQLiteDriver.loadSQLite();
    this.db = new sqlite.Database(options.file);
  }
  public override async close(): Promise<void> {
    this.db.close();
  }

  public override async exec(sql: string): Promise<void> {
    try {
      this.db.exec(sql);
    } catch(ex) {
      return Promise.reject("sqlite exec() error: " + sql + " [] " + ex.toString());
    }
  }

  public override async run(sql: string, values?: BindValues): Promise<RunResult> {
    try {
      return this.db.run(sql, values);
    } catch(ex) {
      return Promise.reject("sqlite run() error: " + sql + " [] " + ex.toString());
    }
  }
  
  public override async all(sql: string, values?: BindValues): Promise<QueryResult[]> {
    try {
      return this.db.all(sql, values);
    } catch(ex) {
      return Promise.reject("sqlite all() error: " + sql + " [] " + ex.toString());
    }
  }

  public override async get(sql: string, values?: BindValues): Promise<QueryResult | null> {
    try {
      return this.db.get(sql, values);
    } catch(ex) {
      return Promise.reject("sqlite get() error: " + sql + " [] " + ex.toString());
    }
  }

}
