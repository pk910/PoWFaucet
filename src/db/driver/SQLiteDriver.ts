import { BaseDriver, BindValues, QueryResult, RunResult } from "./BaseDriver";
import sqlite from "node-sqlite3-wasm";

export interface ISQLiteOptions {
  driver: "sqlite";

  file: string;
}

export class SQLiteDriver extends BaseDriver<ISQLiteOptions> {
  private db: sqlite.Database;

  public override async open(options: ISQLiteOptions): Promise<void> {
    this.db = new sqlite.Database(options.file);
  }
  public override async close(): Promise<void> {
    this.db.close();
  }

  public override async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  public override async run(sql: string, values?: BindValues): Promise<RunResult> {
    return this.db.run(sql, values);
  }
  
  public override async all(sql: string, values?: BindValues): Promise<QueryResult[]> {
    return this.db.all(sql, values);
  }

  public override async get(sql: string, values?: BindValues): Promise<QueryResult | null> {
    return this.db.get(sql, values);
  }

}
