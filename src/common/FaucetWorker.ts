
import { Worker, parentPort, workerData } from "node:worker_threads";
import { DatabaseWorker } from "../db/DatabaseWorker";
import { PoWValidatorWorker } from "../modules/pow/validator/PoWValidatorWorker";

const WORKER_CLASSES = {
  "database": DatabaseWorker,
  "pow-validator": PoWValidatorWorker,
};

interface IFaucetWorkerData {
  classKey: string;
}

export class FaucetWorkers {

  public static loadWorkerClass(workerClassKey?: string, workerPort?: MessagePort) {
    let workerClass = WORKER_CLASSES[workerClassKey || workerData?.classKey];
    new workerClass(workerPort || parentPort);
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
      } as IFaucetWorkerData
    });
    return worker;
  }

}
