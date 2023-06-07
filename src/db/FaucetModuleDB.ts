import * as SQLite3 from 'better-sqlite3';

import { BaseModule } from "../modules/BaseModule";
import { FaucetDatabase } from "./FaucetDatabase";

export abstract class FaucetModuleDB {
  protected abstract readonly latestSchemaVersion: number;
  protected module: BaseModule;
  protected faucetStore: FaucetDatabase;

  public constructor(module: BaseModule, faucetStore: FaucetDatabase) {
    this.module = module;
    this.faucetStore = faucetStore;
  }

  public dispose() {
    this.faucetStore.disposeModuleDb(this);
  }

  public getModuleName(): string {
    return this.module.getModuleName();
  }

  protected get db(): SQLite3.Database {
    return this.faucetStore.getDatabase();
  }

  protected now(): number {
    return Math.floor((new Date()).getTime() / 1000);
  }

  public initSchema() {
    this.faucetStore.upgradeIfNeeded(this.getModuleName(), this.latestSchemaVersion, (version) => this.upgradeSchema(version));
  }
  protected abstract upgradeSchema(version: number): number;

  public cleanStore() {
  }

}
