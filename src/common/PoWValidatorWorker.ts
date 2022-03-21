import { getScrypt, getScryptReadyPromise, Scrypt } from "../../libs/scrypt_wasm";
import { parentPort } from "worker_threads";
import { base64ToHex } from "../utils/ConvertHelpers";
import { IPoWValidatorValidateRequest } from "./IPoWValidator";

export class PoWValidatorWorker {
  private scrypt: Scrypt;
  private difficultyMasks: {[difficulty: number]: string} = {};
  
  public constructor() {
    parentPort.on("message", (evt) => this.onControlMessage(evt));
    getScryptReadyPromise().then(() => {
      this.scrypt = getScrypt();
      console.log("validator worker initialized");
      parentPort.postMessage({ action: "init" });
    });
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

    let dmask = this.difficultyMasks[req.params.d];
    if(!dmask)
      dmask = this.difficultyMasks[req.params.d] = this.getDifficultyMask(req.params.d);

    let isValid = (req.nonces.length > 0);
    for(var i = 0; i < req.nonces.length && isValid; i++) {
      let nonceHex = req.nonces[i].toString(16);
      if((nonceHex.length % 2) == 1) {
        nonceHex = `0${nonceHex}`;
      }

      let hashHex = this.scrypt(
        nonceHex, 
        preimg, 
        req.params.n, 
        req.params.r, 
        req.params.p, 
        req.params.l
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
