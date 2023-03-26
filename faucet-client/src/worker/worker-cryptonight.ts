
import { PoWWorker } from "./PoWWorker";
import { getCryptoNight, getCryptoNightReadyPromise, CryptoNight } from "../../../libs/cryptonight_wasm";
import { PoWHashAlgo } from "../common/IFaucetConfig";

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