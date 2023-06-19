import { TypedEmitter } from 'tiny-typed-emitter';
import { getPoWParamsStr } from '../utils/PoWParamsHelper';
import { PoWHashAlgo, PoWParams } from "../common/FaucetConfig";
import { PoWSession } from "./PoWSession";
import { FaucetTime } from '../common/FaucetTime';

export interface IPoWMinerOptions {
  time: FaucetTime;
  session: PoWSession;
  workerSrc: PoWMinerWorkerSrc;
  powParams: PoWParams;
  difficulty: number;
  nonceCount: number;
  hashrateLimit: number;
}

export type PoWMinerWorkerSrc = {
  [algo in PoWHashAlgo]: string;
};

interface IPoWMinerSettings {
  workerCount: number;
}

interface IPoWMinerWorker {
  id: number;
  worker: Worker;
  ready: boolean;
  stats: IPoWMinerWorkerStats[];
  lastNonce: number;
  verifyWorker: boolean;
}

interface IPoWMinerWorkerStats {
  shares: number;
  time: number;
}

export interface IPoWMinerStats {
  workerCount: number;
  hashRate: number;
  totalShares: number;
  lastShareTime: Date;
}

export interface IPoWMinerShare {
  nonces: number[];
  params: string;
  hashrate: number;
}

export interface IPoWMinerVerification {
  shareId: string;
  preimage: string;
  nonces: number[];
}

interface PoWMinerEvents {
  'stats': (stats: IPoWMinerStats) => void;
}


export class PoWMiner extends TypedEmitter<PoWMinerEvents> {
  private options: IPoWMinerOptions;
  private settings: IPoWMinerSettings;
  private workers: IPoWMinerWorker[];
  private verifyWorker: IPoWMinerWorker;
  private powParamsStr: string;
  private nonceQueue: number[];
  private lastSaveNonce: number;
  private updateStatsTimer: NodeJS.Timeout;
  private totalShares: number;
  private lastShareTime: Date;
  private targetNoncePrefill: number;
  private latestStats: IPoWMinerStats;

  public constructor(options: IPoWMinerOptions) {
    super();
    this.options = options;
    this.workers = [];
    this.powParamsStr = getPoWParamsStr(options.powParams, options.difficulty);
    this.totalShares = 0;
    this.lastShareTime = null;
    this.nonceQueue = [];
    this.lastSaveNonce = null;
    this.targetNoncePrefill = 200;
    this.latestStats = null;
    this.loadSettings();
  }

  public startMiner() {
    this.startStopWorkers();
  }

  public stopMiner() {
    this.stopAllWorker();
    if(this.verifyWorker) {
      this.verifyWorker.worker.terminate();
      this.verifyWorker = null;
    }
  }

  public setPoWParams(params: PoWParams, difficulty: number, nonceCount: number) {
    this.options.nonceCount = nonceCount;

    let powParamsStr = getPoWParamsStr(params, difficulty);
    if(this.powParamsStr === powParamsStr)
      return;
    let needRestart = (this.options.powParams.a !== params.a);

    this.powParamsStr = powParamsStr;
    this.options.powParams = params;
    this.nonceQueue = [];

    if(needRestart) {
      this.stopAllWorker();
      this.startStopWorkers();
    }
    else {
      // forward to workers
      if(this.verifyWorker) {
        this.verifyWorker.worker.postMessage({
          action: "setParams",
          data: {
            params: params,
            difficulty: difficulty,
          }
        });
      }
      this.workers.forEach((worker) => {
        if(!worker.ready)
          return;
        worker.worker.postMessage({
          action: "setParams",
          data: {
            params: params,
            difficulty: difficulty,
          }
        });
      });
    }
  }

  public setWorkerCount(count: number) {
    this.settings.workerCount = count;
    this.saveSettings();
    this.startStopWorkers();
  }

  public getTargetWorkerCount(): number {
    return this.settings.workerCount;
  }

  private loadSettings() {
    this.settings = {
      workerCount: navigator.hardwareConcurrency || 4,
    };
    let savedSettingsJson = localStorage.getItem("powMinerSettings");
    if(savedSettingsJson) {
      try {
        let savedSettings = JSON.parse(savedSettingsJson);
        Object.assign(this.settings, savedSettings);
      } catch(ex) {}
    }
  }

  private saveSettings() {
    localStorage.setItem("powMinerSettings", JSON.stringify(this.settings));
  }

  private startStopWorkers() {
    while(this.workers.length > this.settings.workerCount) {
      // stop worker
      this.stopWorker();
    }
    while(this.workers.length < this.settings.workerCount) {
      // start worker
      this.workers.push(this.startWorker());
    }
    if(!this.verifyWorker) {
      this.verifyWorker = this.startWorker();
      this.verifyWorker.id = -1;
      this.verifyWorker.verifyWorker = true;
    }
  }

  private startWorker(): IPoWMinerWorker {
    let workerSrc = this.options.workerSrc[this.options.powParams.a];
    if(!workerSrc)
      throw "No worker src for '" + this.options.powParams.a + "' algorithm";
    
    let worker: IPoWMinerWorker = {
      id: this.workers.length,
      worker: new Worker(workerSrc),
      ready: false,
      stats: [],
      lastNonce: 0,
      verifyWorker: false,
    };
    worker.worker.addEventListener("message", (evt) => this.onWorkerMessage(worker, evt));
    return worker;
  }

  private stopWorker() {
    if(this.workers.length <= 0)
      return;
    let worker = this.workers.pop();
    worker.worker.terminate();
  }

  private stopAllWorker() {
    while(this.workers.length > 0) {
      this.stopWorker();
    }
  }

  private onWorkerMessage(worker: IPoWMinerWorker, evt: MessageEvent) {
    let msg = evt.data;
    if(!msg || typeof msg !== "object")
      return;

    //console.log(evt);
    switch(msg.action) {
      case "init":
        this.onWorkerInit(worker);
        break;
      case "nonce":
        this.onWorkerNonce(worker, msg.data);
        break;
      case "stats":
        this.onWorkerStats(worker, msg.data);
        break;
      case "verifyResult":
        this.onWorkerVerifyResult(worker, msg.data);
        break;
    }
  }

  private onWorkerInit(worker: IPoWMinerWorker) {
    worker.ready = true;

    if(worker.verifyWorker) {
      // don't assign any work to the verification worker to avoid verification delays
      worker.worker.postMessage({
        action: "setParams",
        data: {
          params: this.options.powParams,
          difficulty: this.options.difficulty,
        }
      });
    }
    else {
      let refillCount = this.getLimitedNonceRefillCount(this.targetNoncePrefill);
      if(refillCount === 0)
        refillCount = 1;
      let nonceRange = this.options.session.getNonceRange(refillCount);
      worker.lastNonce = nonceRange;
      
      worker.worker.postMessage({
        action: "setWork",
        data: {
          workerid: worker.id,
          preimage: this.options.session.getPreImage(),
          params: this.options.powParams,
          difficulty: this.options.difficulty,
          nonceStart: nonceRange,
          nonceCount: refillCount,
        }
      });
    }
  }

  private onWorkerNonce(worker: IPoWMinerWorker, nonce: any) {
    //console.log(nonce);
    if(nonce.params !== this.powParamsStr)
      return; // old params - ignore
    
    worker.lastNonce = nonce.nonce;

    let insertIdx = 0;
    let queueLen = this.nonceQueue.length;
    while(insertIdx < queueLen && nonce.nonce > this.nonceQueue[insertIdx])
      insertIdx++;
    this.nonceQueue.splice(insertIdx, 0, nonce.nonce);

    this.processNonceQueue();
  }

  private processNonceQueue() {
    // get lowest nonce
    let saveNonce: number = null;
    this.workers.forEach((worker) => {
      if(!worker.ready)
        return;
      if(saveNonce === null || worker.lastNonce < saveNonce)
        saveNonce = worker.lastNonce;
    });
    if(saveNonce === null || this.lastSaveNonce === saveNonce)
      return;

    this.lastSaveNonce = saveNonce;

    let saveNonces = 0;
    let queueLen = this.nonceQueue.length;
    if(queueLen < this.options.nonceCount)
      return;

    for(let i = 0; i < queueLen; i++) {
      if(this.nonceQueue[i] > saveNonce)
        break;
      saveNonces++;
    }

    while(saveNonces >= this.options.nonceCount) {
      let share: IPoWMinerShare = {
        nonces: this.nonceQueue.splice(0, this.options.nonceCount),
        params: this.powParamsStr,
        hashrate: this.latestStats ? this.latestStats.hashRate : 0,
      };
      
      this.totalShares++;
      this.lastShareTime = this.options.time.getSyncedDate();
      saveNonces -= this.options.nonceCount;
      this.options.session.submitShare(share);
    }
  }

  private getLimitedNonceRefillCount(requestedRefill: number): number {
    if(this.options.hashrateLimit <= 0)
      return requestedRefill;

    let sessionAge = this.options.time.getSyncedTime() - this.options.session.getStartTime();
    if(sessionAge <= 1)
      return requestedRefill;

    sessionAge += 4; // add 4 seconds as this limits the number of nonces that will be processed in the next 4 sec
    
    let nonceLimit =  sessionAge * this.options.hashrateLimit;
    let nonceCount = nonceLimit - this.options.session.getLastNonce();
    if(requestedRefill > nonceCount)
      requestedRefill = nonceCount;
    
    return requestedRefill;
  }

  private onWorkerStats(worker: IPoWMinerWorker, stats: any) {
    worker.stats.push({
      shares: stats.shares,
      time: stats.time,
    });
    if(worker.stats.length > 30) 
      worker.stats.splice(0, 1);

    worker.lastNonce = stats.last;
    if(stats.nonces < this.targetNoncePrefill) {
      let refill = this.getLimitedNonceRefillCount(this.targetNoncePrefill - stats.nonces);
      if(refill > 0) {
        worker.worker.postMessage({
          action: "addRange",
          data: {
            start: this.options.session.getNonceRange(refill),
            count: refill,
          }
        });
      }
    }

    this.processNonceQueue();
    
    if(!this.updateStatsTimer) {
      this.updateStatsTimer = setTimeout(() => {
        this.updateStatsTimer = null;
        this.generateMinerStats();
      }, 1000);
    }
  }

  private generateMinerStats() {
    let workerCount: number = 0;
    let hashRate: number = 0;
    this.workers.forEach((worker) => {
      if(!worker.ready)
        return;
      workerCount++;
      let workerShares = 0;
      let workerTime = 0;
      worker.stats.forEach((stats) => {
        workerShares += stats.shares;
        workerTime += stats.time;
      });
      if(workerTime > 0)
        hashRate += (workerShares / (workerTime / 1000));
    });

    // predict targetNoncePrefill based on hashrate
    if(hashRate > 0) {
      // workers should have enough nounces to work for 4 seconds
      // workers report their nonce count every 2 seconds so there is enough time to add more nonce ranges
      this.targetNoncePrefill = Math.ceil(hashRate * 4 / this.workers.length);
      if(this.targetNoncePrefill < 20)
        this.targetNoncePrefill = 20;
    }

    let minerStats: IPoWMinerStats = this.latestStats = {
      workerCount: workerCount,
      hashRate: hashRate,
      totalShares: this.totalShares,
      lastShareTime: this.lastShareTime,
    };
    this.emit("stats", minerStats);
  }

  public processVerification(verification: IPoWMinerVerification) {
    let verifyWorker = this.verifyWorker;
    if(!verifyWorker && this.workers.length > 0)
      verifyWorker = this.workers[0];
    if(!verifyWorker)
      return;

    verifyWorker.worker.postMessage({
      action: "verify",
      data: verification
    });
  }

  private onWorkerVerifyResult(worker: IPoWMinerWorker, result: any) {
    this.options.session.submitVerifyResult(result);
  }

}
