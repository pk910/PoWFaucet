import { IPoWFaucetProps, PoWFaucet } from './components/PoWFaucet';
import { PoWHashAlgo } from './common/IFaucetConfig';
import React from 'react';
import ReactDOM from 'react-dom';

(() => {
  let faucetProps: IPoWFaucetProps = {
    powWebsockUrl: location.origin.replace(/^http/, "ws") + "/pow",
    powApiUrl: "/api",
    minerSrc: {
      [PoWHashAlgo.SCRYPT]: "/js/powfaucet-worker-sc.js",
      [PoWHashAlgo.CRYPTONIGHT]: "/js/powfaucet-worker-cn.js",
      [PoWHashAlgo.ARGON2]: "/js/powfaucet-worker-a2.js",
    }
  };

  var container = document.querySelector(".pow-faucet");
  let faucet = React.createElement<IPoWFaucetProps>(PoWFaucet, faucetProps, []);

  container.innerHTML = "";
  ReactDOM.render(faucet, container);
  
})();
