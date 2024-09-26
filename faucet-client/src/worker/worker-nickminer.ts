
import { PoWWorker } from "./PoWWorker";
import { getNickMiner, getNickMinerReadyPromise } from "../../../libs/nickminer_wasm.cjs";
import { PoWHashAlgo } from "../types/PoWMinerSrc";

(() => {
  getNickMinerReadyPromise().then(() => {
    let nickMiner = getNickMiner();
    nickMiner.miner_init();
    
    new PoWWorker({
      hashFn: (nonce, preimg, params) => {
        if(params.a !== PoWHashAlgo.NICKMINER)
          return null;
        return nickMiner.miner_run(nonce);
      },
      configFn: (preimg, params) => {
        if(params.a !== PoWHashAlgo.NICKMINER)
          return null;
        nickMiner.miner_set_config(params.i, params.r, params.v, params.s, params.p, params.c, preimg);
      }
    });
    
  })
})();