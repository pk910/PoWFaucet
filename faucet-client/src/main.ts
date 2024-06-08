import React, { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { FaucetPage, IFaucetPageProps } from './components/FaucetPage';
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
