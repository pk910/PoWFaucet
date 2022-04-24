import { IPoWFaucetProps, PoWFaucet } from './components/PoWFaucet';
import React from 'react';
import ReactDOM from 'react-dom';

(() => {
  let faucetProps: IPoWFaucetProps = {
    powApiUrl: location.origin.replace(/^http/, "ws") + "/pow",
    minerSrc: "/js/powfaucet-worker.js"
  };

  var container = document.querySelector(".pow-faucet");
  let faucet = React.createElement<IPoWFaucetProps>(PoWFaucet, faucetProps, []);
  ReactDOM.render(faucet, container);
  
})();
