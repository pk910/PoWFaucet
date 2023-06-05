import assert from 'node:assert';
import { isMainThread, parentPort, Worker } from 'worker_threads';
import { PromiseDfd } from '../../../utils/PromiseDfd';
import { PoWHashAlgo } from '../PoWConfig';
import { PoWModule } from '../PoWModule';
import { IPoWValidatorValidateRequest } from './IPoWValidator';

(() => {
  if (!isMainThread) {
    let worker = require("./PoWValidatorWorker");
    new worker.PoWValidatorWorker(parentPort);
  }
})();

export class PoWValidator {
  private module: PoWModule;
  private worker: Worker;
  private readyDfd: PromiseDfd<void>;
  private validateQueue: {[shareId: string]: PromiseDfd<boolean>} = {};

  public constructor(module: PoWModule, worker?: Worker) {
    this.module = module;
    this.readyDfd = new PromiseDfd<void>();
    this.worker = worker || new Worker(__filename);
    this.worker.on("message", (msg) => this.onWorkerMessage(msg))
  }

  public dispose() {
    if(this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  public getValidationQueueLength(): number {
    return Object.keys(this.validateQueue).length;
  }

  public validateShare(shareId: string, nonces: number[], preimg: string): Promise<boolean> {
    let resDfd = new PromiseDfd<boolean>();
    let config = this.module.getModuleConfig();
    let req: IPoWValidatorValidateRequest = {
      shareId: shareId,
      nonces: nonces,
      preimage: preimg,
      algo: config.powHashAlgo,
      params: (() => {
        switch(config.powHashAlgo) {
          case PoWHashAlgo.SCRYPT: 
            return config.powScryptParams;
          case PoWHashAlgo.CRYPTONIGHT: 
            return config.powCryptoNightParams;
          case PoWHashAlgo.ARGON2: 
            return config.powArgon2Params;
        }
      })()
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
    assert.equal(msg && (typeof msg === "object"), true);

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
    assert.equal(this.validateQueue.hasOwnProperty(msg.shareId), true);
    
    let resDfd = this.validateQueue[msg.shareId];
    delete this.validateQueue[msg.shareId];

    resDfd.resolve(msg.isValid);
  }

}

