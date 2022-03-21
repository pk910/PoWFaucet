import { IPoWParams } from "../common/IFaucetConfig";
import { Scrypt } from "../../../libs/scrypt_wasm";
import { base64ToHex } from "../utils/ConvertHelpers";

export interface IPoWWorkerOptions {
  scrypt: Scrypt;
}

interface IPoWWorkerParams extends IPoWParams {
  dmask: string;
  pstr: string;
}

export class PoWWorker {
  private options: IPoWWorkerOptions;
  private workerId: number;
  private powParams: IPoWWorkerParams;
  private powPreImage: string;
  private working = false;
  private workNonce: number;
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
    this.powParams = this.getWorkerParams(data.params);
    this.powPreImage = base64ToHex(data.preimage);
    this.startWorkLoop();
  }

  private onCtrlSetParams(data: any) {
    this.powParams = this.getWorkerParams(data);
  }

  private onCtrlVerify(share: any) {
    let preimg = base64ToHex(share.preimage);

    let isValid = (share.nonces.length > 0);
    for(var i = 0; i < share.nonces.length && isValid; i++) {
      let nonceHex = share.nonces[i].toString(16);
      if((nonceHex.length % 2) == 1) {
        nonceHex = `0${nonceHex}`;
      }

      if(!this.checkHash(nonceHex, preimg))
        isValid = false;
    }

    postMessage({
      action: "verifyResult",
      data: {
        shareId: share.shareId,
        isValid: isValid
      }
    });
  }

  private getWorkerParams(params: IPoWParams): IPoWWorkerParams {
    let workerParams: IPoWWorkerParams = Object.assign(params, {
      dmask: this.getDifficultyMask(params.d),
      pstr: this.getPoWParamsStr(params),
    });

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

  private getPoWParamsStr(params: IPoWParams): string {
    return params.n + "|" + params.r + "|" + params.p + "|" + params.l + "|" + params.d;
  }

  private startWorkLoop() {
    if(this.working)
      return;
    
    this.workNonce = 0;
    this.statsCount = 0;
    this.statsPoll = (new Date()).getTime();

    setInterval(() => this.collectStats(), 2000);

    this.working = true;
    this.workLoop();
  }

  private collectStats() {
    let now = (new Date()).getTime();
    postMessage({
      action: "stats",
      data: {
        shares: this.statsCount,
        time: (now - this.statsPoll)
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
    setTimeout(() => this.workLoop(), 0);
  }

  private work() {
    this.workNonce++;
    this.statsCount++;
    let nonce = (this.workNonce * 128) + this.workerId;
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
    if((nonceHex.length % 2) == 1) {
      nonceHex = `0${nonceHex}`;
    }

    let hashHex = this.options.scrypt(
      nonceHex, 
      preimg, 
      this.powParams.n, 
      this.powParams.r, 
      this.powParams.p, 
      this.powParams.l
    );

    let startOfHash = hashHex.substring(0, this.powParams.dmask.length);
    return (startOfHash <= this.powParams.dmask) ? hashHex : null;
  }

}
