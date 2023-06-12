import { BaseModule } from "../modules/BaseModule";
import { BaseDriver } from "./driver/BaseDriver";
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

  protected get db(): BaseDriver {
    return this.faucetStore.getDatabase();
  }

  protected now(): number {
    return Math.floor((new Date()).getTime() / 1000);
  }

  public async initSchema(): Promise<void> {
    await this.faucetStore.upgradeIfNeeded(this.getModuleName(), this.latestSchemaVersion, (version) => this.upgradeSchema(version));
  }
  protected abstract upgradeSchema(version: number): Promise<number>;

  public async cleanStore(): Promise<void> {
  }

}
