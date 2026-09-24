
import { MessagePort, Worker, parentPort, workerData } from "node:worker_threads";
import { fork, ChildProcess } from "node:child_process";
import { DatabaseWorker } from "../db/DatabaseWorker.js";
import { PoWServerWorker } from "../modules/pow/PoWServerWorker.js";
import { PoWValidatorWorker } from "../modules/pow/validator/PoWValidatorWorker.js";
import { ZupassWorker } from "../modules/zupass/ZupassWorker.js";

class TestWorker {
  constructor(port: MessagePort) {
    if(port) {
      port.postMessage({ action: "test" });
    } else if(process.send) {
      process.send({ action: "test" });
    }
  }
}

/**
 * The worker classes a forked child can be, by key. Mutable for the same reason as
 * MODULE_CLASSES, and with the same rule: a module adds, never replaces.
 */
const WORKER_CLASSES: {[key: string]: any} = {
  "test": TestWorker,
  "database": DatabaseWorker,
  "pow-server": PoWServerWorker,
  "pow-validator": PoWValidatorWorker,
  "zupass-worker": ZupassWorker,
};

/**
 * Where a module's worker class comes from, because a child process cannot be told only a key.
 *
 * The classes above are compiled in, so a child gets them by importing this file. A module's are
 * not: the child is a fresh `node` that loads no modules, so before the loader a module could register a
 * worker, the main process would accept it, and the child spawned for it died with
 * `unknown worker class-key '<key>'`. Nothing caught that - the echo fixture declares a worker and
 * the suite only ever checked that it *registered* - and it surfaced the day a worker the faucet
 * used to carry became an installed module's: the faucet failed to initialise with that module
 * enabled.
 *
 * So the registration records the backend file and the export name, and both travel to the child,
 * which loads that one file through the loader's injected-SDK `require` - the same path the main
 * process used, so the class in the child is built against the faucet's own SDK instance rather
 * than a second copy of it.
 */
export interface IFaucetWorkerSource {
  /** absolute path to the module's `backend.cjs` */
  backend: string;
  /** the export in it that is the worker class */
  export: string;
}

const WORKER_SOURCES: {[key: string]: IFaucetWorkerSource} = {};

interface IFaucetWorkerData {
  classKey: string;
  source?: IFaucetWorkerSource;
}

export interface IFaucetChildProcess {
  childProcess: ChildProcess;
  controller: AbortController;
}

export class FaucetWorkers {

  /**
   * Adds a worker class under a global key, for a module.
   *
   * Refuses a taken key: a module shadowing `pow-validator` would be a faucet that
   * validates nothing, and nothing downstream would say so.
   */
  public static registerWorkerClass(classKey: string, workerClass: any, source?: IFaucetWorkerSource) {
    if(!classKey || typeof classKey !== "string")
      throw new Error("worker class-key must be a non-empty string, got " + JSON.stringify(classKey));
    if(WORKER_CLASSES[classKey])
      throw new Error("worker class-key '" + classKey + "' is already registered; a module may not replace a worker");
    if(typeof workerClass !== "function")
      throw new Error("worker '" + classKey + "' is not a class");
    WORKER_CLASSES[classKey] = workerClass;
    if(source)
      WORKER_SOURCES[classKey] = source;
  }

  /** Where a key's class came from, or undefined for one that is compiled in. */
  public static getWorkerSource(classKey: string): IFaucetWorkerSource {
    return WORKER_SOURCES[classKey];
  }

  /** Whether a key is known, so the loader can report a clash before it registers. */
  public static hasWorkerClass(classKey: string): boolean {
    return !!WORKER_CLASSES[classKey];
  }

  /** What a key holds, so a re-registration of the same class can be told from a clash. */
  public static getWorkerClass(classKey: string): any {
    return WORKER_CLASSES[classKey];
  }

  /**
   * The class this child is, built and handed its port.
   *
   * A compiled-in worker is in the map already. A module's is not, because this process loaded no
   * modules - so the source that travelled with the key is used to load exactly that one file,
   * through the loader's injected-SDK `require`. Loading *all* modules here would be the other
   * way, and a worse one: a validator child would pay for every installed module and run their
   * `init` hooks a second time.
   */
  public static loadWorkerClass(workerClassKey?: string, workerPort?: MessagePort|ChildProcess,
                                source?: IFaucetWorkerSource): any {
    let classKey = workerClassKey || workerData?.classKey;
    let workerClass = WORKER_CLASSES[classKey];
    // Synchronous when the class is here, which is every compiled-in worker and every already
    // registered one - and not a detail: the suite's stub for `createChildProcess` runs the worker
    // in-process by calling this and expects the instance to exist on that tick. Making the whole
    // function `async` for the sake of the one case that has to load a file cost nine lifecycle
    // cases a welcome that arrived a microtask late.
    if(workerClass)
      return new workerClass(workerPort || parentPort);

    let from = source || WORKER_SOURCES[classKey] || workerData?.source;
    if(!from)
      throw new Error("unknown worker class-key '" + classKey + "' and nothing said where it comes from");
    return (async () => {
      // imported here, not at the top: the loader reaches the module system and this file is part
      // of what the module system imports
      let loader = await import("../loader/ModuleLoader.js");
      let loaded = await loader.loadModuleExport(from.backend, from.export);
      if(typeof loaded !== "function") {
        throw new Error("worker '" + classKey + "': " + from.backend + " has no class export '" +
          from.export + "'");
      }
      WORKER_CLASSES[classKey] = loaded;
      return new loaded(workerPort || parentPort);
    })();
  }

  private initialized: boolean;
  private workerSrc: string;

  public initialize(workerSrc: string) {
    if(this.initialized)
      return;
    this.initialized = true;
    this.workerSrc = workerSrc;
  }

  public createWorker(classKey: string): Worker {
    if(!WORKER_CLASSES[classKey])
      throw "unknown worker class-key '" + classKey + "'";
    let worker = new Worker(this.workerSrc, {
      workerData: {
        classKey: classKey,
        // undefined for a compiled-in worker; a module's child needs it to find the class at all
        source: WORKER_SOURCES[classKey],
      } as IFaucetWorkerData,
    });
    return worker;
  }

  public createChildProcess(classKey: string): IFaucetChildProcess {
    if(!WORKER_CLASSES[classKey])
      throw "unknown worker class-key '" + classKey + "'";

    let source = WORKER_SOURCES[classKey];
    let controller = new AbortController();
    // the source goes on the command line, because a forked child has no `workerData` and this is
    // the only thing it is told before it has to be the class
    let args = source ? ["worker", classKey, source.backend, source.export] : ["worker", classKey];
    let childProcess = fork(this.workerSrc, args, {
      signal: controller.signal,
    });

    return {
      childProcess: childProcess,
      controller: controller,
    };
  }

}
