import React, { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { FaucetPage, IFaucetPageProps } from './components/FaucetPage';
import { captureAuthenticatoorFragment } from './common/AuthenticatoorFragment';
import * as powfaucet from '.'

export function initializeFaucet(container: Element, faucetProps: IFaucetPageProps): { element: ReactElement, instance: FaucetPage } {
  let res: { element: ReactElement, instance: FaucetPage } = {
    element: null,
    instance: null,
  };
  res.element = React.createElement<IFaucetPageProps>(FaucetPage, {
    ...faucetProps,
    ref: (ref) => {
      res.instance = ref;
    }
  }, []);
  container.innerHTML = "";
  let root = createRoot(container); 
  root.render(res.element);
  return res;
}

(() => {
  // Authenticatoor's /auth/login redirect lands back on us with
  // #auth_token=…&exp=…&user=… in the URL fragment. The faucet uses a
  // HashRouter, so an unhandled fragment becomes a phantom route and
  // nothing renders. Strip those params (and stash the token to
  // sessionStorage with the same keys client.js uses) before React mounts.
  captureAuthenticatoorFragment();

  let PoWFaucet = (window as any).PoWFaucet = {
    ...powfaucet,
    page: null,
    initializeFaucet: initializeFaucet,
  };

  var container = document.querySelector(".pow-faucet");
  if(container && container.hasAttribute("data-powfaucet")) {
    let faucetProps: IFaucetPageProps = {};
    PoWFaucet.page = initializeFaucet(container, faucetProps);
  }
})();
