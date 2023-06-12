// MIT License

// Copyright (c) 2022-2023 Tobias Enderle

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface QueryOptions {
  expand?: boolean;
}

export type SQLiteValue = number | bigint | string | Uint8Array | null;
export type JSValue = boolean | SQLiteValue;

export type BindValues = JSValue | JSValue[] | Record<string, JSValue>;

export type NormalQueryResult = Record<string, SQLiteValue>;
export type ExpandedQueryResult = Record<string, NormalQueryResult>;
export type QueryResult = NormalQueryResult | ExpandedQueryResult;

export class Database {
  constructor(filename?: string, options?: { fileMustExist?: boolean });

  get isOpen(): boolean;
  get inTransaction(): boolean;

  close(): void;
  function(
    name: string,
    func: (...params: SQLiteValue[]) => JSValue,
    options?: { deterministic?: boolean }
  ): this;
  exec(sql: string): void;
  prepare(sql: string): Statement;
  run(sql: string, values?: BindValues): RunResult;
  all(
    sql: string,
    values?: BindValues,
    options?: QueryOptions
  ): QueryResult[];
  get(
    sql: string,
    values?: BindValues,
    options?: QueryOptions
  ): QueryResult | null;
}

export class Statement {
  get database(): Database;
  get isFinalized(): boolean;

  run(values?: BindValues): RunResult;
  all(values?: BindValues, options?: QueryOptions): QueryResult[];
  get(values?: BindValues, options?: QueryOptions): QueryResult | null;
  finalize(): void;
}

export class SQLite3Error extends Error {}
