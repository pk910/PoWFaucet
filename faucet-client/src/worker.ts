
import { PoWWorker } from "./worker/PoWWorker";
import { getScrypt, getScryptReadyPromise, Scrypt } from "../../libs/scrypt_wasm";

(() => {
  let scrypt: Scrypt;
  getScryptReadyPromise().then(() => {
    scrypt = getScrypt();

    (globalThis as any).powWorker = new PoWWorker({
      scrypt: scrypt
    });
  })
})();