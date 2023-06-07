import React from 'react';
import ReactDOM from 'react-dom';
import { FaucetPage, IFaucetPageProps } from './components/FaucetPage';

(() => {
  let faucetProps: IFaucetPageProps = {
    apiUrl: "/api",
    /*
    powWebsockUrl: location.origin.replace(/^http/, "ws") + "/pow",
    minerSrc: {
      [PoWHashAlgo.SCRYPT]: "/js/powfaucet-worker-sc.js?" + FAUCET_CLIENT_BUILDTIME,
      [PoWHashAlgo.CRYPTONIGHT]: "/js/powfaucet-worker-cn.js?" + FAUCET_CLIENT_BUILDTIME,
      [PoWHashAlgo.ARGON2]: "/js/powfaucet-worker-a2.js?" + FAUCET_CLIENT_BUILDTIME,
    }
    */
  };

  var container = document.querySelector(".pow-faucet");
  let faucet = React.createElement<IFaucetPageProps>(FaucetPage, faucetProps, []);

  container.innerHTML = "";
  ReactDOM.render(faucet, container);
  
})();
