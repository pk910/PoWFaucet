
import { PoWWorker } from "./PoWWorker";
import { getScrypt, getScryptReadyPromise } from "../../../libs/scrypt_wasm.cjs";
import { PoWHashAlgo } from "../common/FaucetConfig";

(() => {
  getScryptReadyPromise().then(() => {
    let scrypt = getScrypt();
    new PoWWorker({
      hashFn: (nonce, preimg, params) => {
        if(params.a !== PoWHashAlgo.SCRYPT)
          return null;
        return scrypt(nonce, preimg, params.n, params.r, params.p, params.l);
      }
    });
  })
})();