
import { PoWWorker } from "./PoWWorker";
import { getCryptoNight, getCryptoNightReadyPromise } from "../../../libs/cryptonight_wasm.cjs";
import { PoWHashAlgo } from "../common/FaucetConfig";

(() => {
  getCryptoNightReadyPromise().then(() => {
    let cryptonight = getCryptoNight();
    new PoWWorker({
      hashFn: (nonce, preimg, params) => {
        if(params.a !== PoWHashAlgo.CRYPTONIGHT)
          return null;
        return cryptonight(preimg + nonce, params.c, params.v, params.h);
      }
    });
  })
})();