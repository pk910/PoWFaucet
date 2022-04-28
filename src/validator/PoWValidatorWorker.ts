import { parentPort } from "worker_threads";
import { base64ToHex } from "../utils/ConvertHelpers";
import { IPoWValidatorValidateRequest } from "./IPoWValidator";
import { faucetConfig, IPoWCryptoNightParams, IPoWSCryptParams, PoWCryptoParams, PoWHashAlgo } from "../common/FaucetConfig";

export type PoWHashFn = (nonceHex: string, preimgHex: string, params: PoWCryptoParams) => string;

export class PoWValidatorWorker {
  private hashFn: PoWHashFn;
  private difficultyMasks: {[difficulty: number]: string} = {};
  
  public constructor() {
    parentPort.on("message", (evt) => this.onControlMessage(evt));

    this.initHashFn().then((hashFn) => {
      this.hashFn = hashFn;
      parentPort.postMessage({ action: "init" });
    });
  }

  private initHashFn(): Promise<PoWHashFn> {
    switch(faucetConfig.powHashAlgo) {
      case PoWHashAlgo.SCRYPT:
        return import("../../libs/scrypt_wasm").then((module) => {
          return module.getScryptReadyPromise().then(() => {
            let scrypt = module.getScrypt();
            return (nonce, preimg, params: IPoWSCryptParams) => {
              return scrypt(nonce, preimg, params.cpuAndMemory, params.blockSize, params.paralellization, params.keyLength);
            };
          });
        });
      case PoWHashAlgo.CRYPTONIGHT:
        return import("../../libs/cryptonight_wasm").then((module) => {
          return module.getCryptoNightReadyPromise().then(() => {
            let cryptonight = module.getCryptoNight();
            return (nonce, preimg, params: IPoWCryptoNightParams) => {
              return cryptonight(preimg + nonce, params.algo, params.variant, params.height);
            };
          });
        });
    }
  }
  
  private onControlMessage(msg: any) {
    if(!msg || typeof msg !== "object")
      return;

    //console.log(evt);
    
    switch(msg.action) {
      case "validate":
        this.onCtrlValidate(msg.data);
        break;
    }
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

  private onCtrlValidate(req: IPoWValidatorValidateRequest) {
    let preimg = base64ToHex(req.preimage);

    let dmask = this.difficultyMasks[req.params.difficulty];
    if(!dmask)
      dmask = this.difficultyMasks[req.params.difficulty] = this.getDifficultyMask(req.params.difficulty);

    let isValid = (req.nonces.length > 0);
    for(var i = 0; i < req.nonces.length && isValid; i++) {
      let nonceHex = req.nonces[i].toString(16);
      if((nonceHex.length % 2) == 1) {
        nonceHex = `0${nonceHex}`;
      }

      let hashHex = this.hashFn(
        nonceHex, 
        preimg, 
        req.params
      );
      let startOfHash = hashHex.substring(0, dmask.length);
      if(!(startOfHash <= dmask)) {
        isValid = false;
      }
    }

    parentPort.postMessage({
      action: "validated", 
      data: {
        shareId: req.shareId,
        isValid: isValid
      }
    });
  }

  

}
