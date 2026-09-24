import { BaseModule, IBaseModuleConfig } from "../modules/BaseModule.js";

/**
 * The module contract: the manifest on disk, and the object `backend.cjs` exports.
 *
 * Kept in its own file so a module can `import type` it without dragging the faucet's
 * runtime in - a module's *build* needs the types, its *runtime* needs the live objects,
 * and those are different moments.
 */

/**
 * The version of this contract.
 *
 * A module states the one it was built against; a mismatch means the faucet skips it with
 * an ERROR and carries on, rather than loading something that will misbehave later in a
 * way nobody traces back here. It changes when the shape of `IFaucetSdk` changes in a way
 * a module can notice.
 */
export const MODULE_API_VERSION = 1;

/** `modules` / `workers`: registry key -> the export name in `backend.cjs`. */
export interface IModulePackageMap {
  [registryKey: string]: string;
}

/**
 * `module.json`, validated strictly: a module that half-loads is worse than one that does
 * not load, because the faucet would run with part of a module wired up.
 */


export interface IModuleManifest {
  /** directory-unique, and what the client assets are served under (`/modules/<name>/`) */
  name: string;
  /** the module's own version, and the cache key for its client assets */
  version: string;
  /** the `MODULE_API_VERSION` it was built against */
  apiVersion: number;
  /** a semver range the faucet's version has to satisfy, e.g. ">=2.6.0" */
  faucetVersion?: string;
  /** the CommonJS entry, relative to the module directory */
  backend: string;
  /** module registry key -> export name */
  modules?: IModulePackageMap;
  /** worker registry key -> export name; these are global, and may not shadow a core key */
  workers?: IModulePackageMap;
  client?: {
    /** served at `/modules/<name>/<script>` and injected into index.html */
    script?: string;
    css?: string;
  };
}

/**
 * What the faucet hands a module's `init()`.
 *
 * The live objects, not the classes: a module that constructed its own `ServiceManager`
 * would get a second service registry and none of the faucet's state. `registerModule`
 * and `registerWorker` exist so a module can register under a key the manifest did not
 * name - a module that takes its own name from its config, say - and both refuse a
 * key that is already taken rather than replacing it.
 */
export interface IFaucetSdk {
  /** the faucet's version, for a module that wants to check more than `faucetVersion` */
  faucetVersion: string;
  /** the contract version this faucet implements */
  apiVersion: number;
  /** where this module was loaded from; the anchor for its own files */
  moduleDir: string;
  /** the manifest as validated, so a module need not re-read its own file */
  manifest: IModuleManifest;

  /** Registers a module class under a registry key. Throws if the key is taken. */
  registerModule(name: string, moduleClass: new (...args: any[]) => BaseModule<IBaseModuleConfig>): void;
  /** Registers a worker class under a global key. Throws if the key is taken. */
  /**
   * A worker class under a global key.
   *
   * `source` is how the child process spawned for this key finds the class: it loads no modules, so
   * a key alone means nothing there. The loader fills it from the manifest; a module registering a
   * worker by hand should pass its own backend and export name, or the worker will register fine and
   * every child spawned for it will die with `unknown worker class-key`.
   */
  registerWorker(name: string, workerClass: any,
                 source?: { backend: string, export: string }): void;


  /** Logs through the faucet's own log, prefixed with the module name. */
  log(level: "debug" | "info" | "warn" | "error", message: string): void;
}

/**
 * The default export of a module's `backend.cjs`.
 *
 * `init` runs in the faucet process before modules are loaded, and again in a forked
 * worker child for a module that brings one - with a worker-scoped SDK that has no session
 * manager, because a worker has no sessions. A module that needs to tell the two apart can
 * look at what the SDK gives it rather than at a flag.
 */
export interface IModulePackage {
  init(sdk: IFaucetSdk): void | Promise<void>;
  /** Optional, called on faucet shutdown, in reverse registration order. */
  dispose?(): void | Promise<void>;
}
