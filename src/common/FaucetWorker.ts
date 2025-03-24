
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

const WORKER_CLASSES = {
  "test": TestWorker,
  "database": DatabaseWorker,
  "pow-server": PoWServerWorker,
  "pow-validator": PoWValidatorWorker,
  "zupass-worker": ZupassWorker,
};

interface IFaucetWorkerData {
  classKey: string;
}

export interface IFaucetChildProcess {
  childProcess: ChildProcess;
  controller: AbortController;
}

export class FaucetWorkers {

  public static loadWorkerClass(workerClassKey?: string, workerPort?: MessagePort|ChildProcess) {
    let workerClass = WORKER_CLASSES[workerClassKey || workerData?.classKey];
    return new workerClass(workerPort || parentPort);
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
      } as IFaucetWorkerData,
    });
    return worker;
  }

  public createChildProcess(classKey: string): IFaucetChildProcess {
    if(!WORKER_CLASSES[classKey])
      throw "unknown worker class-key '" + classKey + "'";

    let controller = new AbortController();
    let childProcess = fork(this.workerSrc, ["worker", classKey], {
      signal: controller.signal,
    });

    return {
      childProcess: childProcess,
      controller: controller,
    };
  }

}
