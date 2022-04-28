import { IPoWFaucetProps, PoWFaucet } from './components/PoWFaucet';
import { PoWHashAlgo } from './common/IFaucetConfig';
import React from 'react';
import ReactDOM from 'react-dom';

(() => {
  let faucetProps: IPoWFaucetProps = {
    powApiUrl: location.origin.replace(/^http/, "ws") + "/pow",
    minerSrc: {
      [PoWHashAlgo.SCRYPT]: "/js/powfaucet-worker-sc.js",
      [PoWHashAlgo.CRYPTONIGHT]: "/js/powfaucet-worker-cn.js",
    }
  };

  var container = document.querySelector(".pow-faucet");
  let faucet = React.createElement<IPoWFaucetProps>(PoWFaucet, faucetProps, []);

  container.innerHTML = "";
  ReactDOM.render(faucet, container);
  
})();
