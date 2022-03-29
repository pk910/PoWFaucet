
import { PoWWorker } from "./worker/PoWWorker";
import { getScrypt, getScryptReadyPromise, Scrypt } from "../../libs/scrypt_wasm";

(() => {
  getScryptReadyPromise().then(() => {
    new PoWWorker({
      scrypt: getScrypt()
    });
  })
})();