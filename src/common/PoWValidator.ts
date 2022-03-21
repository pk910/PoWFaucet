import { isMainThread, Worker } from 'worker_threads';
import { faucetConfig } from './FaucetConfig';
import { PromiseDfd } from '../utils/PromiseDfd';
import { IPoWValidatorValidateRequest } from './IPoWValidator';
import { IPowShare } from './PowController';

(() => {
  if (!isMainThread) {
    let worker = require("./PoWValidatorWorker");
    new worker.PoWValidatorWorker();
  }
})();

export class PoWValidator {
  private worker: Worker;
  private readyDfd: PromiseDfd<void>;
  private validateQueue: {[shareId: string]: PromiseDfd<boolean>} = {};

  public constructor() {
    this.readyDfd = new PromiseDfd<void>();
    this.worker = new Worker(__filename);
    this.worker.on("message", (msg) => this.onWorkerMessage(msg))
  }

  public getValidationQueueLength(): number {
    return Object.keys(this.validateQueue).length;
  }

  public validateShare(share: IPowShare, preimg: string): Promise<boolean> {
    let resDfd = new PromiseDfd<boolean>();
    // TODO: continue here

    let req: IPoWValidatorValidateRequest = {
      shareId: share.shareId,
      nonces: share.nonces,
      preimage: preimg,
      params: {
        n: faucetConfig.powScryptParams.cpuAndMemory,
        r: faucetConfig.powScryptParams.blockSize,
        p: faucetConfig.powScryptParams.paralellization,
        l: faucetConfig.powScryptParams.keyLength,
        d: faucetConfig.powScryptParams.difficulty,
      }
    };
    this.validateQueue[req.shareId] = resDfd;
    this.readyDfd.promise.then(() => {
      this.worker.postMessage({
        action: "validate",
        data: req
      });
    });

    return resDfd.promise;
  }

  private onWorkerMessage(msg: any) {
    if(!msg || typeof msg !== "object")
      return;

    switch(msg.action) {
      case "init":
        this.readyDfd.resolve();
        break;
      case "validated":
        this.onWorkerValidated(msg.data);
        break;
    }
  }

  private onWorkerValidated(msg: any) {
    if(!this.validateQueue.hasOwnProperty(msg.shareId))
      return;
    
    let resDfd = this.validateQueue[msg.shareId];
    delete this.validateQueue[msg.shareId];

    resDfd.resolve(msg.isValid);
  }

}

