import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess.js";
import { ServiceManager } from "../common/ServiceManager.js";
import { faucetConfig } from "../config/FaucetConfig.js";
import { BaseModule } from "./BaseModule.js";
import { MODULE_CLASSES } from "./modules.js";

export enum ModuleHookAction {
  ClientConfig,
  SessionStart,
  SessionRestore,
  SessionInfo,
  SessionRewardFactor,
  SessionRewarded,
  SessionIpChange,
  SessionComplete,
  SessionClaim,
  SessionClaimed,
  SessionClose,
}

export interface ModuleHookRegistration {
  prio: number;
  module: BaseModule;
  name: string;
  hook: Function;
}

export class ModuleManager {
  private initialized: boolean;
  private loadedModules: {[module: string]: BaseModule} = {};
  private moduleHooks: {[action in ModuleHookAction]?: ModuleHookRegistration[]};
  private loadingPromise: Promise<void>;

  public async initialize(): Promise<void> {
    if(this.initialized)
      throw "already initialized";
    this.initialized = true;
    this.moduleHooks = {};
    await (this.loadingPromise = this.loadModules());
    ServiceManager.GetService(FaucetProcess).addListener("reload", () => {
      this.loadingPromise = this.loadModules();
    });
  }

  public getLoadingPromise(): Promise<void> {
    return this.loadingPromise;
  }

  private async loadModules(): Promise<void> {
    let loadedDict = Object.assign({}, this.loadedModules);
    for(let modName in faucetConfig.modules) {
      if(!faucetConfig.modules.hasOwnProperty(modName))
        continue;
      if(!faucetConfig.modules[modName].enabled)
        continue;
      
      let module: BaseModule
      if(!(module = loadedDict[modName])) {
        let modClass = MODULE_CLASSES[modName];
        if(!modClass) {
          ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Cannot load module '" + modName + "': unknown module");
          continue;
        }
        module = this.loadedModules[modName] = new modClass(this, modName);
      }
      else {
        delete loadedDict[modName];
      }
      module.setModuleConfig(faucetConfig.modules[modName]);
      if(!module.isEnabled()) {
        await module.enableModule();
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Enabled module: " + modName);
      }
    }
    for(let modName in loadedDict) {
      let module = loadedDict[modName];
      await module.disableModule();
      delete this.loadedModules[modName];
      this.removeModuleHooks(module);
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Disabled module: " + modName);
    }
  }

  public getModule<TModule extends BaseModule = BaseModule>(moduleName: string): TModule {
    return this.loadedModules[moduleName] as TModule;
  }

  public addActionHook(module: BaseModule | null, action: ModuleHookAction, priority: number, name: string, hook: Function) {
    let hookList = this.moduleHooks[action];
    if(!hookList)
      hookList = this.moduleHooks[action] = [];
    
    let hookReg: ModuleHookRegistration = {
      prio: priority,
      module: module,
      name: name,
      hook: hook,
    };

    let insertIdx = null;
    for(let i = 0; i < hookList.length; i++) {
      if(hookList[i].prio > priority) {
        insertIdx = i;
        break;
      }
    }
    if(insertIdx !== null) {
      hookList.splice(insertIdx, 0, hookReg);
    }
    else {
      hookList.push(hookReg);
    }
  }

  private removeModuleHooks(module: BaseModule) {
    for(let action in this.moduleHooks) {
      for(let i = this.moduleHooks[action].length - 1; i >= 0; i--) {
        if(this.moduleHooks[action][i].module === module)
          this.moduleHooks[action].splice(i, 1);
      }
    }
  }

  public getActionHooks(action: ModuleHookAction): ModuleHookRegistration[] {
    if(!this.moduleHooks[action])
      return [];
    return this.moduleHooks[action].slice();
  }

  public async processActionHooks(localfns: {prio: number, hook: Function}[], action: ModuleHookAction, args: any[]): Promise<void> {
    let hooks = this.getActionHooks(action);
    let localIdx = 0;
    let hookIdx = 0;
    do {
      let loopPrio: number;
      if(localfns.length > localIdx && (hookIdx >= hooks.length || localfns[localIdx].prio <= hooks[hookIdx].prio))
        loopPrio = localfns[localIdx].prio;
      else if(hooks.length > hookIdx && (localIdx >= localfns.length || hooks[hookIdx].prio < localfns[localIdx].prio))
        loopPrio = hooks[hookIdx].prio;
      else
        break;

      let promises: Promise<void>[] = [];
      while(localfns.length > localIdx && localfns[localIdx].prio == loopPrio) {
        promises.push(localfns[localIdx].hook.apply(this, args));
        localIdx++;
      }
      while(hooks.length > hookIdx && hooks[hookIdx].prio == loopPrio) {
        promises.push(hooks[hookIdx].hook.apply(this, args));
        hookIdx++;
      }

      await Promise.all(promises);
    } while(localfns.length > localIdx || hooks.length > hookIdx);
  }
}
