import { PoWWorker } from "./PoWWorker";
import { getYespower, getYespowerReadyPromise } from "../../../libs/yespower_wasm.cjs";
import { PoWHashAlgo } from "../types/PoWMinerSrc";

(() => {
  getYespowerReadyPromise().then(() => {
    let yespower = getYespower();
    new PoWWorker({
      hashFn: (nonce, preimg, params) => {
        if(params.a !== PoWHashAlgo.YESPOWER)
          return null;
        return yespower(preimg + nonce, params.n, params.r, params.s);
      }
    });
  })
})();
