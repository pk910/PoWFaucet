
export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export type SQLValue = number | bigint | string | Uint8Array | null;
export type JSValue = boolean | SQLValue;

export type BindValues = JSValue | JSValue[] | Record<string, JSValue>;

export type NormalQueryResult = Record<string, SQLValue>;
export type ExpandedQueryResult = Record<string, NormalQueryResult>;
export type QueryResult = NormalQueryResult | ExpandedQueryResult;

export abstract class BaseDriver<TDriverOpts = {}> {
  public abstract open(options: TDriverOpts): Promise<void>;
  public abstract close(): Promise<void>;

  public abstract exec(sql: string): Promise<void>;
  public abstract run(sql: string, values?: BindValues): Promise<RunResult>;
  public abstract all(sql: string, values?: BindValues): Promise<QueryResult[]>;
  public abstract get(sql: string, values?: BindValues): Promise<QueryResult | null>;
}
