import { getPoWParamsStr } from "../utils/PoWParamsHelper";
import { PoWHashAlgo, PoWParams } from "../common/FaucetConfig";
import { base64ToHex } from "../utils/ConvertHelpers";

export type PoWWorkerHashFn = (nonceHex: string, preimgHex: string, params: PoWParams) => string;

export interface IPoWWorkerOptions {
  hashFn: PoWWorkerHashFn;
}

interface IPoWWorkerParams {
  params: PoWParams;
  difficulty: number;
  dmask: string;
  pstr: string;
}

interface IPoWWorkerNonceRange {
  first: number;
  last: number;
  count: number;
}

export class PoWWorker {
  private options: IPoWWorkerOptions;
  private workerId: number;
  private powParams: IPoWWorkerParams;
  private powDifficulty: number;
  private powPreImage: string;
  private working = false;
  private workNonce: number;
  private nonceRanges: IPoWWorkerNonceRange[];
  private statsCount: number;
  private statsPoll: number;

  public constructor(options: IPoWWorkerOptions) {
    this.options = options;

    addEventListener("message", (evt) => this.onControlMessage(evt));
    postMessage({ action: "init" });
  }

  private onControlMessage(evt: MessageEvent) {
    let msg = evt.data;
    if(!msg || typeof msg !== "object")
      return;

    //console.log(evt);
    
    switch(msg.action) {
      case "setWork":
        this.onCtrlSetWork(msg.data);
        break;
      case "addRange":
        this.onCtrlAddRange(msg.data);
        break;
      case "setParams":
        this.onCtrlSetParams(msg.data);
        break;
      case "verify":
        this.onCtrlVerify(msg.data);
        break;
    }
  }

  private onCtrlSetWork(data: any) {
    this.workerId = data.workerid;
    this.powParams = this.getWorkerParams(data.params, data.difficulty);
    this.powPreImage = base64ToHex(data.preimage);
    this.nonceRanges = [{
      first: data.nonceStart,
      last: data.nonceStart + data.nonceCount - 1,
      count: data.nonceCount,
    }];
    this.workNonce = data.nonceStart;

    this.startWorkLoop();
  }

  private onCtrlAddRange(data: any) {
    this.nonceRanges.push({
      first: data.start,
      last: data.start + data.count - 1,
      count: data.count,
    });
    if(this.nonceRanges.length === 1)
      this.workNonce = data.start;
  }

  private onCtrlSetParams(data: any) {
    this.powParams = this.getWorkerParams(data.params, data.difficulty);
  }

  private onCtrlVerify(share: any) {
    let preimg = base64ToHex(share.preimage);

    let isValid = (share.nonces.length > 0);
    for(var i = 0; i < share.nonces.length && isValid; i++) {
      if(!this.checkHash(share.nonces[i], preimg)) {
        isValid = false;
        break;
      }
    }

    postMessage({
      action: "verifyResult",
      data: {
        shareId: share.shareId,
        isValid: isValid
      }
    });
  }

  private getWorkerParams(params: PoWParams, difficulty: number): IPoWWorkerParams {
    let workerParams: IPoWWorkerParams = {
      params: params,
      difficulty: difficulty,
      dmask: this.getDifficultyMask(difficulty),
      pstr: getPoWParamsStr(params, difficulty),
    };

    return workerParams;
  }

  private getDifficultyMask(difficulty: number) {
    let byteCount = Math.floor(difficulty / 8) + 1;
    let bitCount = difficulty - ((byteCount-1)*8);
    let maxValue = Math.pow(2, 8 - bitCount);

    let mask = maxValue.toString(16);
    while(mask.length < byteCount * 2) {
      mask = "0" + mask;
    }

    return mask;
  }

  private startWorkLoop() {
    if(this.working)
      return;
    
    this.statsCount = 0;
    this.statsPoll = (new Date()).getTime();

    setInterval(() => this.collectStats(), 2000);

    this.working = true;
    this.workLoop();
  }

  private collectStats() {
    let now = (new Date()).getTime();
    let nonces = 0;
    if(this.nonceRanges.length > 0) {
      nonces += this.nonceRanges[0].last - this.workNonce;
      for(let i = 1; i < this.nonceRanges.length; i++) {
        nonces += this.nonceRanges[i].count;
      }
    }

    postMessage({
      action: "stats",
      data: {
        shares: this.statsCount,
        time: (now - this.statsPoll),
        last: this.workNonce,
        nonces: nonces,
      }
    });
    this.statsCount = 0;
    this.statsPoll = now;
  }

  private workLoop() {
    if(!this.working)
      return;
    for(var i = 0; i < 8; i++) {
      this.work();
    }
    let tout = (this.nonceRanges.length === 0 ? 20 : 0);
    setTimeout(() => this.workLoop(), tout);
  }

  private work() {
    let rangeCount = this.nonceRanges.length;
    if(rangeCount === 0)
      return;
    let nonce = this.workNonce++;
    if(nonce >= this.nonceRanges[0].last) {
      this.nonceRanges.splice(0, 1);
      if(rangeCount !== 1) {
        this.workNonce = this.nonceRanges[0].first;
      }
    }

    let hash: string;
    if((hash = this.checkHash(nonce, this.powPreImage))) {
      // found a nonce! :>
      postMessage({
        action: "nonce",
        data: {
          nonce: nonce,
          params: this.powParams.pstr,
        }
      });
    }
  }

  private checkHash(nonce: number, preimg: string): string {
    let nonceHex = nonce.toString(16);
    // pad hex to 64bit (16 hex characters) to prevent re-hashing the same nonce multiple times
    if(nonceHex.length < 16) {
      nonceHex = "0000000000000000".substring(0, 16 - nonceHex.length) + nonceHex;
    }
    
    this.statsCount++;
    let hashHex = this.options.hashFn(nonceHex, preimg, this.powParams.params);

    let startOfHash = hashHex.substring(0, this.powParams.dmask.length);
    return (startOfHash <= this.powParams.dmask) ? hashHex : null;
  }

}
