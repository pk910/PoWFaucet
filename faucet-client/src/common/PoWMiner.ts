import { TypedEmitter } from 'tiny-typed-emitter';
import { IPoWParams } from "./IFaucetConfig";
import { PoWClient } from "./PoWClient";
import { PoWSession } from "./PoWSession";

export interface IPoWMinerOptions {
  session: PoWSession;
  workerSrc: string;
  powParams: IPoWParams;
  nonceCount: number;
}

interface IPoWMinerSettings {
  workerCount: number;
}

interface IPoWMinerWorker {
  id: number;
  worker: Worker;
  ready: boolean;
  stats: IPoWMinerWorkerStats[];
  lastNonce: number;
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
    this.powParamsStr = this.getPoWParamsStr(options.powParams);
    this.totalShares = 0;
    this.lastShareTime = null;
    this.nonceQueue = [];
    this.lastSaveNonce = null;
    this.targetNoncePrefill = 200;
    this.latestStats = null;

    this.loadSettings();
    this.startStopWorkers();
  }

  public stopMiner() {
    while(this.workers.length > 0) {
      this.stopWorker();
    }
  }

  public setPoWParams(params: IPoWParams, nonceCount: number) {
    this.options.nonceCount = nonceCount;

    let powParamsStr = this.getPoWParamsStr(params);
    if(this.powParamsStr === powParamsStr)
      return;

    this.powParamsStr = powParamsStr;
    this.options.powParams = params;
    this.nonceQueue = [];

    // forward to workers
    this.workers.forEach((worker) => {
      if(!worker.ready)
        return;
      worker.worker.postMessage({
        action: "setParams",
        data: params
      });
    })
  }

  public setWorkerCount(count: number) {
    this.settings.workerCount = count;
    this.saveSettings();
    this.startStopWorkers();
  }

  public getTargetWorkerCount(): number {
    return this.settings.workerCount;
  }

  private getPoWParamsStr(params: IPoWParams): string {
    return params.n + "|" + params.r + "|" + params.p + "|" + params.l + "|" + params.d;
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
      this.startWorker();
    }
  }

  private startWorker() {
    let worker: IPoWMinerWorker = {
      id: this.workers.length,
      worker: new Worker(this.options.workerSrc),
      ready: false,
      stats: [],
      lastNonce: 0,
    };
    worker.worker.addEventListener("message", (evt) => this.onWorkerMessage(worker, evt));
    this.workers.push(worker);
  }

  private stopWorker() {
    if(this.workers.length <= 0)
      return;
    let worker = this.workers.pop();
    worker.worker.terminate();
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
    let sessionInfo = this.options.session.getSessionInfo();
    let nonceRange = this.options.session.getNonceRange(this.targetNoncePrefill);

    worker.ready = true;
    worker.lastNonce = nonceRange;
    
    worker.worker.postMessage({
      action: "setWork",
      data: {
        workerid: worker.id,
        preimage: sessionInfo.preimage,
        params: this.options.powParams,
        nonceStart: nonceRange,
        nonceCount: this.targetNoncePrefill,
      }
    });
  }

  private onWorkerNonce(worker: IPoWMinerWorker, nonce: any) {
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
      this.lastShareTime = new Date();
      saveNonces -= this.options.nonceCount;
      this.options.session.submitShare(share);
    }
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
      let refill = this.targetNoncePrefill - stats.nonces;
      worker.worker.postMessage({
        action: "addRange",
        data: {
          start: this.options.session.getNonceRange(refill),
          count: refill,
        }
      });
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
    if(this.workers.length == 0)
      return;
    this.workers[0].worker.postMessage({
      action: "verify",
      data: verification
    });
  }

  private onWorkerVerifyResult(worker: IPoWMinerWorker, result: any) {
    this.options.session.submitVerifyResult(result);
  }

}
