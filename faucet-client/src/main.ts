import { IPoWFaucetProps, PoWFaucet } from './components/PoWFaucet';
import React from 'react';
import ReactDOM from 'react-dom';

(() => {
  let faucetProps: IPoWFaucetProps = {
    powWebsockUrl: location.origin.replace(/^http/, "ws") + "/pow",
    powApiUrl: "/api",
    minerSrc: "/js/powfaucet-worker.js?" + FAUCET_CLIENT_BUILDTIME,
  };

  var container = document.querySelector(".pow-faucet");
  let faucet = React.createElement<IPoWFaucetProps>(PoWFaucet, faucetProps, []);

  container.innerHTML = "";
  ReactDOM.render(faucet, container);
  
})();
