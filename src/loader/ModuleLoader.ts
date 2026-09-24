import * as fs from "node:fs";
import * as path from "node:path";
import { createRequire } from "node:module";
import { ServiceManager } from "../common/ServiceManager.js";
import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess.js";
import { FaucetWorkers } from "../common/FaucetWorker.js";
import { MODULE_CLASSES, registerModuleClass } from "../modules/modules.js";
import { IModulePackage, IFaucetSdk, IModuleManifest, MODULE_API_VERSION } from "../sdk/modulePackage.js";

/**
 * Loads modules before the modules are built.
 *
 * A module brings backend classes, worker classes, client assets and, if it has one, a native
 * engine binary (PLAN_PLUGIN_ARCHITECTURE §3). The loader's job is narrow: find them,
 * validate the manifest strictly, require the backend, and let it register. Everything
 * after that is the module's.
 *
 * Two rules shape it.
 *
 * **A bad module must not take the faucet down.** Every failure here is an ERROR in the
 * log and that module skipped; the faucet starts without it. An operator who adds a module
 * to a running faucet and gets a faucet that will not start has no way to tell which change
 * did it.
 *
 * **A module gets the live objects.** `createRequire` against the module's own directory
 * means the module resolves *its* dependencies, but the SDK it is handed is the faucet's
 * own `ServiceManager`, its own registries. A module that bundled a second copy of them
 * would register hooks nothing calls.
 */

/** The shape a module directory has to have. */
export interface ILoadedModule {
  manifest: IModuleManifest;
  dir: string;
  module: IModulePackage;
}

const MANIFEST_NAME = "module.json";

export class ModuleLoader {
  private loaded: ILoadedModule[] = [];

  /** The modules that loaded, for the http server and the client config. */
  public getLoaded(): ILoadedModule[] {
    return this.loaded.slice();
  }

  /**
   * Loads every module under `<datadir>/modules/` plus every path in `extraPaths`.
   *
   * `datadirModules` is scanned rather than configured so that dropping a directory in is
   * enough; the config list is for modules that live elsewhere, which is the normal case
   * for a module installed from a package.
   *
   * A null datadir loads only `extraPaths`, relative to the working directory - for
   * `check-modules`, which is handed the paths and has no faucet around it.
   */
  public async loadAll(datadir: string, extraPaths: string[] = []): Promise<ILoadedModule[]> {
    return this.scan(datadir, extraPaths, false);
  }

  /**
   * Everything `loadAll` does except registering anything: the manifests are validated, the
   * versions checked, the backends required, and their exports looked up.
   *
   * For checking a package whose module key this build already has compiled in. Registering a
   * taken key is refused, deliberately,
   * so a plain load of such a package fails on the one thing that is expected to be true and
   * says nothing about the package. This answers the question that was actually asked: is
   * this archive a module this faucet could load?
   */
  public async inspectAll(datadir: string, extraPaths: string[] = []): Promise<ILoadedModule[]> {
    return this.scan(datadir, extraPaths, true);
  }

  /**
   * Where the program itself keeps its modules: `<program dir>/modules/`.
   *
   * The program dir is the directory of the running entry, which is what makes **one** rule cover all
   * three formats (PLAN_MODULE_SPLIT ss.4): `dist/` for a raw build, `bundle/` for the bundled one, and
   * the extraction cache for the all-in-one executable, where the snapshot filesystem can neither
   * `require` a file nor `exec` a binary.
   *
   * `process.argv[1]` and not `__dirname`, because `__dirname` inside the bundle is wherever webpack
   * decided the chunk lives, while argv[1] is the file the operator actually started.
   */
  public static programModulesDir(): string {
    let entry = process.argv[1];
    if(!entry)
      return null;
    return path.join(path.dirname(path.resolve(entry)), "modules");
  }

  /**
   * The program's modules directory, or a real-disk copy of it when we are inside an executable.
   *
   * `pkg` gives the snapshot a working `fs` for *reading* and nothing else: it cannot `require` a file
   * from it (the docs said so before this existed), cannot `exec` a binary in it, and cannot hand a path
   * to `express`-style static serving that outlives the process. All three are exactly what a module
   * needs. So when `process.pkg` is set, every module in the snapshot is copied out **once** to
   * `<datadir>/modules-cache/<name>-<version>/` and everything downstream - require, serving, exec -
   * uses that real directory and never learns it was ever a snapshot.
   *
   * Extraction is skipped when the version directory already holds a `manifest.json` that matches, so a
   * restart is free and an upgrade is not: the version is in the path, so two versions can sit side by
   * side and the old one is never half-overwritten by the new.
   *
   * Outside an executable this is just `<program dir>/modules/`.
   */
  private async extractedOrProgramModules(datadir: string): Promise<string> {
    let program = ModuleLoader.programModulesDir();
    if(!(process as any).pkg || !program)
      return program;
    if(!datadir) {
      // `check-modules` runs with no faucet and therefore no datadir; a snapshot with nowhere to
      // extract to is a thing to say, not to guess around.
      this.emitLog(FaucetLogLevel.WARNING, "running from an executable with no datadir, so the" +
        " modules in the snapshot cannot be extracted and will not be loaded");
      return null;
    }

    let cacheRoot = path.join(datadir, "modules-cache");
    let extracted: string[] = [];
    for(let dir of ModuleLoader.packagesIn(program)) {
      let manifest: IModuleManifest;
      try {
        manifest = this.readManifest(dir);
      } catch(ex) {
        this.emitLog(FaucetLogLevel.ERROR, "module in the executable at " + dir +
          " has no readable manifest: " + (ex instanceof Error ? ex.message : ex));
        continue;
      }
      let target = path.join(cacheRoot, manifest.name + "-" + manifest.version);
      let stamp = path.join(target, MANIFEST_NAME);
      if(fs.existsSync(stamp) && fs.readFileSync(stamp, "utf8") === fs.readFileSync(path.join(dir, MANIFEST_NAME), "utf8")) {
        extracted.push(target);
        continue;
      }
      // a half-written cache is worse than none: build beside it and move into place
      let staging = target + ".partial-" + process.pid;
      fs.rmSync(staging, { recursive: true, force: true });
      fs.mkdirSync(staging, { recursive: true });
      copyTree(dir, staging);
      fs.rmSync(target, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.renameSync(staging, target);
      this.emitLog(FaucetLogLevel.INFO, "module '" + manifest.name + "' " + manifest.version +
        " extracted from the executable to " + target);
      extracted.push(target);
    }
    // the cache root is now the program's modules directory as far as everything else is concerned
    return extracted.length > 0 ? cacheRoot : program;
  }

  /** Every directory under `parent` that holds a manifest; [] when parent is missing. */
  private static packagesIn(parent: string): string[] {
    let found: string[] = [];
    if(!parent || !fs.existsSync(parent))
      return found;
    for(let entry of fs.readdirSync(parent).sort()) {
      let dir = path.join(parent, entry);
      if(fs.existsSync(path.join(dir, MANIFEST_NAME)))
        found.push(dir);
    }
    return found;
  }

  private async scan(datadir: string, extraPaths: string[], inspectOnly: boolean): Promise<ILoadedModule[]> {
    let base = datadir || process.cwd();

    /**
     * **One rule, three sources, in this order** (PLAN_MODULE_SPLIT ss.4):
     *
     *   (a) `<program dir>/modules/` - what the artifact ships with;
     *   (b) `<datadir>/modules/`     - what the operator dropped in;
     *   (c) every `modulePaths:` entry - what the config points at.
     *
     * A module is a directory with a `module.json` and nothing else; there is no separate notion of an
     * installed module, a dev module or a configured one, because three notions is how a loader ends up
     * with three sets of bugs.
     *
     * **Later wins, and says which it shadowed.** An operator who drops a newer build into the datadir
     * to try it, or points `modulePaths` at a working tree, expects that copy to be the one that runs -
     * and expects to be told, because two copies of one module on a disk is exactly the state in which a
     * person spends an hour reading the wrong file.
     */
    let sources: {dir: string, from: string}[] = [];
    for(let dir of ModuleLoader.packagesIn(await this.extractedOrProgramModules(datadir)))
      sources.push({ dir: dir, from: "the program directory" });
    for(let dir of ModuleLoader.packagesIn(datadir ? path.join(datadir, "modules") : null))
      sources.push({ dir: dir, from: "the datadir" });
    for(let entry of extraPaths || []) {
      // a relative path in the config is relative to the datadir, which is where an
      // operator thinks in terms of
      sources.push({ dir: path.isAbsolute(entry) ? entry : path.resolve(base, entry),
                     from: "modulePaths" });
    }

    // Name -> the last source that offered it. The name comes from the manifest rather than the
    // directory, because the directory is the operator's to call whatever they like.
    let chosen = new Map<string, {dir: string, from: string}>();
    let order: string[] = [];
    for(let source of sources) {
      let name: string;
      try {
        name = this.readManifest(source.dir)?.name;
      } catch(ex) {
        // an unreadable manifest is `loadOne`'s to report, with its own message; keep it in the list
        // so it is reported once, under its own directory
        name = "?" + source.dir;
      }
      if(!name)
        continue;
      if(!chosen.has(name))
        order.push(name);
      chosen.set(name, source);
    }
    /**
     * **A candidate that cannot load must not hide one that can.**
     *
     * "Later wins" is the operator's intent, and it was hiding the module in development on the very
     * first run: the plan puts module *sources* at `modules/<name>/` in the repo, and source (b) is
     * `<datadir>/modules/` - and in development the datadir *is* the repo root, so the unbuilt source
     * tree and the install directory are the same path. The source tree has a `module.json` too, so it
     * won on being later, and then refused to load for want of a `backend.cjs`, and the built copy in
     * `dist/modules/` never got a turn. `check-modules` said "0 module(s) loaded" with the real module
     * sitting right there.
     *
     * So the order decides *preference*, not exclusivity: every candidate for a name is kept, newest
     * first, and the first that actually loads is the one that counts. A fallback says so, because
     * "your newer copy was skipped and an older one is running" is not a thing to discover later.
     */
    let candidates = new Map<string, {dir: string, from: string}[]>();
    for(let source of sources) {
      let name: string;
      try {
        name = this.readManifest(source.dir)?.name;
      } catch(ex) {
        name = "?" + source.dir;
      }
      if(!name)
        continue;
      let list = candidates.get(name) || [];
      list.unshift(source);          // newest first
      candidates.set(name, list);
    }

    let inspected: ILoadedModule[] = [];
    for(let name of order) {
      let tries = candidates.get(name) || [];
      for(let i = 0; i < tries.length; i++) {
        let source = tries[i];
        try {
          let loaded = await this.loadOne(source.dir, inspectOnly);
          if(loaded) {
            if(i > 0) {
              this.emitLog(FaucetLogLevel.WARNING, "module '" + name + "' loaded from " + source.dir +
                " (" + source.from + "): the " + i + " newer copy/copies could not be loaded - see above");
            }
            else if(tries.length > 1) {
              this.emitLog(FaucetLogLevel.INFO, "module '" + name + "' at " + source.dir + " (" +
                source.from + ") shadows " + (tries.length - 1) + " other copy/copies: " +
                tries.slice(1).map((other) => other.dir + " (" + other.from + ")").join(", "));
            }
            inspected.push(loaded);
            if(!inspectOnly)
              this.loaded.push(loaded);
          }
          break;
        } catch(ex) {
          // "not built" is a state of a source tree, not a fault, and it must not colour a deploy's
          // output red; everything else that stops a module loading still does.
          let notBuilt = !!(ex as any)?.moduleNotBuilt;
          this.emitLog(notBuilt ? FaucetLogLevel.INFO : FaucetLogLevel.ERROR,
            "module at " + source.dir + (notBuilt ? " skipped, " : " was skipped: ") +
            (ex instanceof Error ? ex.message : ex));
          // ...and try the next copy of the same name rather than leaving the name unloaded
        }
      }
    }

    return inspectOnly ? inspected : this.getLoaded();
  }

  private async loadOne(dir: string, inspectOnly = false): Promise<ILoadedModule> {
    let manifest = this.readManifest(dir);

    if(manifest.apiVersion !== MODULE_API_VERSION) {
      // deliberately not a range check: the module api is one number and a mismatch means
      // the module was built against a different faucet, whichever way round
      throw new Error("'" + manifest.name + "' was built against module api " +
        manifest.apiVersion + ", this faucet implements " + MODULE_API_VERSION);
    }

    let backend = path.resolve(dir, manifest.backend);
    if(!fs.existsSync(backend)) {
      /**
       * A module whose source is here and whose build is not is **not built**, not broken.
       *
       * A module checkout under `modules/` is a tracked scaffold - manifest and sources in the tree, no
       * `backend.cjs` until someone runs its build - so every local `check-modules` logged it at
       * ERROR and a deploy's own output carried a red line about a thing that is fine
       * The distinction is the file the manifest names: absent means not built,
       * anything else wrong with the module is still an error.
       */
      let notBuilt: any = new Error("'" + manifest.name + "' is not built: no " + manifest.backend +
        " in " + dir + " (run its build, e.g. `npm run build` in that directory)");
      notBuilt.moduleNotBuilt = true;
      throw notBuilt;
    }

    // the module's own resolution root, so its dependencies are its own - except the SDK,
    // which is handed to it rather than resolved (see `withInjectedSdk`)
    let exported = await withInjectedSdk(() => modulePackageRequire(dir)(backend));
    let module: IModulePackage = exported?.default || exported;
    if(!module || typeof module.init !== "function")
      throw new Error("'" + manifest.name + "' does not export a module with an init()");

    if(inspectOnly) {
      // the exports the manifest names have to be there; that they are not *registered* is
      // the whole difference between this and a load
      this.checkExportsExist(manifest, exported);
      this.emitLog(FaucetLogLevel.INFO, "checked module '" + manifest.name + "' v" +
        manifest.version + " from " + dir + " (nothing registered)");
      return { manifest: manifest, dir: dir, module: module };
    }

    // every key it claims, checked before anything is registered: a module that registers
    // half its modules and then fails leaves the faucet in a state nobody designed
    this.checkKeysAreFree(manifest);

    let sdk = this.buildSdk(dir, manifest, exported);
    await module.init(sdk);

    this.registerFromManifest(manifest, exported, sdk, dir);

    this.emitLog(FaucetLogLevel.INFO, "loaded module '" + manifest.name + "' v" +
      manifest.version + " from " + dir);
    return { manifest: manifest, dir: dir, module: module };
  }


  /** Each export the manifest names, present and a function - without registering it. */
  private checkExportsExist(manifest: IModuleManifest, exported: any): void {
    let maps: [string, {[key: string]: string}][] = [
      ["module", manifest.modules || {}], ["worker", manifest.workers || {}],
    ];
    for(let [what, map] of maps) {
      for(let key of Object.keys(map)) {
        let name = map[key];
        if(typeof exported?.[name] !== "function")
          throw new Error("'" + manifest.name + "' names " + what + " export '" + name +
            "' for key '" + key + "', and its backend does not export it");
      }
    }
  }

  private readManifest(dir: string): IModuleManifest {
    let file = path.join(dir, MANIFEST_NAME);
    if(!fs.existsSync(file))
      throw new Error("no " + MANIFEST_NAME);

    let manifest: IModuleManifest;
    try {
      manifest = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch(ex) {
      throw new Error(MANIFEST_NAME + " is not valid json: " + (ex instanceof Error ? ex.message : ex));
    }

    let required: (keyof IModuleManifest)[] = ["name", "version", "apiVersion", "backend"];
    for(let key of required) {
      if(manifest[key] === undefined || manifest[key] === null)
        throw new Error(MANIFEST_NAME + " has no '" + key + "'");
    }
    if(typeof manifest.name !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(manifest.name)) {
      // it becomes a url path segment, so it cannot be anything that needs escaping
      throw new Error("'" + manifest.name + "' is not a usable module name (lowercase, digits and dashes)");
    }
    if(typeof manifest.apiVersion !== "number")
      throw new Error("'" + manifest.name + "' has a non-numeric apiVersion");
    if(typeof manifest.backend !== "string")
      throw new Error("'" + manifest.name + "' has a non-string backend");

    ["modules", "workers"].forEach((block) => {
      let map = (manifest as any)[block];
      if(map === undefined)
        return;
      if(typeof map !== "object" || Array.isArray(map))
        throw new Error("'" + manifest.name + "' has a '" + block + "' that is not an object");
      for(let key in map) {
        if(typeof map[key] !== "string")
          throw new Error("'" + manifest.name + "' maps " + block + "." + key + " to something that is not an export name");
      }
    });

    return manifest;
  }

  /** Refuses a module that would shadow a core key, before anything is registered. */
  private checkKeysAreFree(manifest: IModuleManifest) {
    for(let key in manifest.workers || {}) {
      if(FaucetWorkers.hasWorkerClass(key))
        throw new Error("'" + manifest.name + "' wants worker key '" + key + "', which is taken");
    }
  }

  /**
   * The keys the manifest names, registered from the backend's exports.
   *
   * A module may also register in `init()`, and one that does both would otherwise register
   * the same key twice and be refused by its own second attempt - a module failing on the
   * one thing it got right. So a key already holding *this same class* is taken as the same
   * registration and left alone; a key holding a different one is still the clash the
   * registry exists to refuse.
   */
  private registerFromManifest(manifest: IModuleManifest, exported: any, sdk: IFaucetSdk,
                               dir: string) {
    for(let key in manifest.modules || {}) {
      let exportName = manifest.modules[key];
      let moduleClass = exported[exportName];
      if(!moduleClass)
        throw new Error("'" + manifest.name + "' has no export '" + exportName + "' for module '" + key + "'");
      if(MODULE_CLASSES[key] === moduleClass)
        continue;   // its own init() already did this one
      sdk.registerModule(key, moduleClass);
    }
    for(let key in manifest.workers || {}) {
      let exportName = manifest.workers[key];
      let workerClass = exported[exportName];
      if(!workerClass)
        throw new Error("'" + manifest.name + "' has no export '" + exportName + "' for worker '" + key + "'");
      if(FaucetWorkers.getWorkerClass(key) === workerClass)
        continue;
      // with where it came from: the child process spawned for this key loads no modules and has
      // nothing else to find the class with
      sdk.registerWorker(key, workerClass,
        { backend: path.join(dir, manifest.backend), export: exportName });
    }
  }

  private buildSdk(dir: string, manifest: IModuleManifest, exported: any): IFaucetSdk {
    return {
      faucetVersion: typeof POWFAUCET_VERSION === "string" ? POWFAUCET_VERSION : "0.0.0",
      apiVersion: MODULE_API_VERSION,
      moduleDir: dir,
      manifest: manifest,
      registerModule: (name, moduleClass) => registerModuleClass(name, moduleClass),
      registerWorker: (name, workerClass, source) =>
        FaucetWorkers.registerWorkerClass(name, workerClass, source),
      log: (level, message) => this.emitLog(toLogLevel(level), "[" + manifest.name + "] " + message),
    };
  }

  private emitLog(level: FaucetLogLevel, message: string) {
    ServiceManager.GetService(FaucetProcess).emitLog(level, message);
  }
}

function toLogLevel(level: string): FaucetLogLevel {
  switch(level) {
    case "debug": return FaucetLogLevel.HIDDEN;
    case "warn": return FaucetLogLevel.WARNING;
    case "error": return FaucetLogLevel.ERROR;
    default: return FaucetLogLevel.INFO;
  }
}

/**
 * Runs `load` with `@powfaucet/sdk` and `@powfaucet/sdk/module` resolving to **this**
 * faucet's live modules, whatever is or is not installed next to the module.
 *
 * A module needs the SDK at run time and not only at build time: its module class
 * extends `BaseModule`, which is a class, not a type. Every other way of getting one
 * there is worse.
 *
 * Letting the module resolve `@powfaucet/sdk` from its own `node_modules` gives it a
 * *second* copy - a second `ServiceManager`, a second `BaseModule`, a second module
 * registry - so its hooks would be registered on objects the faucet never calls. That is
 * the failure `checkSingletons` exists to catch on the client side, and it is worse here
 * because nothing renders wrongly; what the module was supposed to do simply never happens.
 *
 * Resolving it from the faucet's own tree is not available either: `sdk-dist/` is the whole
 * compiled faucet, and entering it from outside re-enters the import cycle between the
 * module system and the modules the faucet still carries (`Cannot access 'BaseModule'
 * before initialization`).
 *
 * So the faucet injects it. `Module._load` is patched for the duration of one synchronous
 * `require`, which is where a module's own `require("@powfaucet/sdk")` happens, and restored
 * in a `finally`. Startup loads modules one at a time, so the window is not shared.
 */
async function withInjectedSdk<T>(load: () => T): Promise<T> {
  // imported here rather than at the top of the file: `sdk/index.js` re-exports the module
  // system, which imports this file, and entering that cycle at module-evaluation time is
  // exactly the fault described above
  let injected: {[request: string]: any} = {
    "@powfaucet/sdk": await import("../sdk/index.js"),
    "@powfaucet/sdk/module": await import("../sdk/modulePackage.js"),
  };
  // A third specifier used to be injected here, carrying the host machinery one kind of module
  // needs. It is gone: that code belongs to the module that needs it, not to the
  // platform, and it lives there now. A module
  // asking for that specifier gets the ordinary "cannot find module", which is the truth.

  let moduleClass: any = (await import("node:module")).default;
  let original = moduleClass._load;
  moduleClass._load = function(request: string, parent: any, isMain: boolean) {
    if(Object.prototype.hasOwnProperty.call(injected, request))
      return injected[request];
    return original.call(this, request, parent, isMain);
  };
  try {
    return load();
  } finally {
    moduleClass._load = original;
  }
}

/** webpack replaces this identifier with the real `require` of the bundle it emits. */
declare const __non_webpack_require__: ((id: string) => any) | undefined;

/**
 * A `require` that loads a module from the real filesystem, from source and from a bundle.
 *
 * Both spellings are rewritten by webpack: a `require(...)` call becomes a lookup in the
 * bundle's own module map, and `createRequire(...)` becomes the literal `undefined`. So the
 * faucet run from `dist/` loaded modules and the packaged binary could not load any at all,
 * failing with "require is not a function" - a break no test running from source can see,
 * which is why `check-modules` exists and why CI runs it against the built binary.
 *
 * The `createRequire` root only decides how the *first* specifier resolves, and that one is
 * an absolute path either way; a module's own `require("dep")` resolves from the module's
 * own directory because that is where node looks, no matter who required it.
 */
function modulePackageRequire(dir: string): (id: string) => any {
  if(typeof __non_webpack_require__ === "function")
    return __non_webpack_require__;
  return createRequire(path.join(dir, "package.json"));
}

/**
 * A recursive copy that works out of a `pkg` snapshot.
 *
 * `fs.cpSync` refuses a snapshot source in the versions this runs on, so the tree is walked and each
 * file read and written - which is also the only way to give the copies real modes, since everything in
 * a snapshot reports the same ones.
 */
function copyTree(from: string, to: string) {
  for(let entry of fs.readdirSync(from)) {
    let src = path.join(from, entry);
    let dst = path.join(to, entry);
    if(fs.statSync(src).isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      copyTree(src, dst);
    }
    else
      fs.writeFileSync(dst, fs.readFileSync(src));
  }
}


/**
 * One export out of one module's backend, for a process that is not the faucet.
 *
 * A worker runs in a forked child that loads no modules, so the child cannot look its class up in a
 * registry the main process filled - it is told the backend file and the export name and loads that
 * file and nothing else (`FaucetWorkers.loadWorkerClass`). It goes through the same injected-SDK
 * `require` as a full load, because a worker class that resolved `@powfaucet/sdk` for itself would
 * get a second `ServiceManager` in that child and hooks nobody calls.
 *
 * No manifest is read and nothing is registered: this is deliberately the narrow door, so that the
 * only way a module's code runs in the faucet's own process stays `loadAll`.
 */
export async function loadModuleExport(backend: string, exportName: string): Promise<any> {
  let dir = path.dirname(backend);
  let exported = await withInjectedSdk(() => modulePackageRequire(dir)(backend));
  return exported ? exported[exportName] : undefined;
}


/**
 * The url a browser fetches a module's client file from, or null if the module ships none.
 *
 * The manifest names the file on disk (`client/module.js`), but the http server serves that
 * directory *as* `/modules/<name>/`, so the `client/` prefix is not part of the url - a
 * client handed the manifest path verbatim would ask for `/modules/echo/client/module.js`
 * and get a 404. `?v=` is what makes the answer cacheable: it is the module's version, so an
 * upgrade changes the url rather than waiting for a cache to expire.
 */
export function moduleAssetUrl(manifest: {name: string, version: string}, file: string): string {
  if(!file)
    return null;
  let relative = file.replace(/^\.?\//, "").replace(/^client\//, "");
  return "/modules/" + manifest.name + "/" + relative + "?v=" + encodeURIComponent(manifest.version);
}
