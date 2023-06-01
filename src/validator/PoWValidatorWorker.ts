import assert from 'node:assert';
import { getScrypt, getScryptReadyPromise, Scrypt } from "../../libs/scrypt_wasm";
import { MessagePort } from "worker_threads";
import { base64ToHex } from "../utils/ConvertHelpers";
import { IPoWValidatorValidateRequest } from "./IPoWValidator";
import { IPoWArgon2Params, IPoWCryptoNightParams, IPoWSCryptParams, PoWCryptoParams, PoWHashAlgo } from "../common/FaucetConfig";

export type PoWHashFn = (nonceHex: string, preimgHex: string, params: PoWCryptoParams) => string;

export class PoWValidatorWorker {
  private hashFn: {[algo: string]: Promise<PoWHashFn>} = {};
  private port: MessagePort;
  private difficultyMasks: {[difficulty: number]: string} = {};
  
  public constructor(port: MessagePort) {
    this.port = port;
    this.port.on("message", (evt) => this.onControlMessage(evt));
    this.port.postMessage({ action: "init" });
  }

  private getHashFn(algo: PoWHashAlgo): Promise<PoWHashFn> {
    let algoKey = algo.toString();
    if(this.hashFn[algoKey])
      return this.hashFn[algoKey];
    else
      return this.hashFn[algoKey] = this.initHashFn(algo);
  }

  private async initHashFn(algo: PoWHashAlgo): Promise<PoWHashFn> {
    let hashFn: PoWHashFn;
    switch(algo) {
      case PoWHashAlgo.SCRYPT:
        hashFn = await (async () => {
          let module = await import("../../libs/scrypt_wasm");
          await module.getScryptReadyPromise();
          let scrypt = module.getScrypt();
          return (nonce, preimg, params: IPoWSCryptParams) => {
            return scrypt(nonce, preimg, params.cpuAndMemory, params.blockSize, params.parallelization, params.keyLength);
          };
        })();
        break;
      case PoWHashAlgo.CRYPTONIGHT:
        hashFn = await (async () => {
          let module = await import("../../libs/cryptonight_wasm");
          await module.getCryptoNightReadyPromise();
          let cryptonight = module.getCryptoNight();
          return (nonce, preimg, params: IPoWCryptoNightParams) => {
            return cryptonight(preimg + nonce, params.algo, params.variant, params.height);
          };
        })();
        break;
      case PoWHashAlgo.ARGON2:
        hashFn = await (async () => {
          let module = await import("../../libs/argon2_wasm");
          await module.getArgon2ReadyPromise();
          let argon2 = module.getArgon2();
          return (nonce, preimg, params: IPoWArgon2Params) => {
            return argon2(nonce, preimg, params.keyLength, params.timeCost, params.memoryCost, params.parallelization, params.type, params.version);
          };
        })();
        break;
    }
    return hashFn;
  }
  
  private onControlMessage(msg: any) {
    assert.equal(msg && (typeof msg === "object"), true);

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

  private async onCtrlValidate(req: IPoWValidatorValidateRequest) {
    let hashFn = await this.getHashFn(req.algo);
    let preimg = base64ToHex(req.preimage);

    let dmask = this.difficultyMasks[req.params.difficulty];
    if(!dmask)
      dmask = this.difficultyMasks[req.params.difficulty] = this.getDifficultyMask(req.params.difficulty);

    let isValid = (req.nonces.length > 0);
    for(var i = 0; i < req.nonces.length && isValid; i++) {
      let nonceHex = req.nonces[i].toString(16);
      if(nonceHex.length < 16) {
        nonceHex = "0000000000000000".substring(0, 16 - nonceHex.length) + nonceHex;
      }

      let hashHex = hashFn(
        nonceHex, 
        preimg, 
        req.params
      );
      let startOfHash = hashHex.substring(0, dmask.length);
      if(!(startOfHash <= dmask)) {
        isValid = false;
      }
    }

    this.port.postMessage({
      action: "validated", 
      data: {
        shareId: req.shareId,
        isValid: isValid
      }
    });
  }

  

}
