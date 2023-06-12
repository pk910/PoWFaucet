import { ModuleManager } from "./ModuleManager";

export interface IBaseModuleConfig {
  enabled: boolean;
}

export abstract class BaseModule<TModCfg extends IBaseModuleConfig = IBaseModuleConfig> {
  protected moduleManager: ModuleManager;
  protected moduleName: string;
  protected moduleConfig: TModCfg
  protected enabled: boolean;

  public constructor(manager: ModuleManager, name: string) {
    this.moduleManager = manager;
    this.moduleName = name;
  }

  public getModuleName(): string {
    return this.moduleName;
  }

  public enableModule(): Promise<void> {
    if(this.enabled)
      return Promise.reject("cannot enable module '" + this.moduleName + "': already enabled");
    this.enabled = true;
    return this.startModule();
  }
  
  public disableModule(): Promise<void> {
    if(this.enabled)
      return Promise.reject("cannot disable module '" + this.moduleName + "': not enabled");
    this.enabled = false;
    return this.stopModule();
  }

  public getModuleConfig(): TModCfg {
    return this.moduleConfig;
  }

  public setModuleConfig(config: TModCfg): void {
    this.moduleConfig = config;
    if(this.enabled)
      this.onConfigReload();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  protected abstract startModule(): Promise<void>;
  protected abstract stopModule(): Promise<void>;
  protected onConfigReload(): void {};
}
