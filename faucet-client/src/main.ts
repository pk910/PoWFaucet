import React, { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { FaucetPage, IFaucetPageProps } from './components/FaucetPage';
import { captureAuthenticatoorFragment } from './common/AuthenticatoorFragment';
import * as powfaucet from '.'
import { buildClientSdk } from './sdk/sdk';
import { getCoreFlags } from './sdk/flags';

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

  // The module surface first, then what the page itself needs. A module script
  // is injected after this bundle and before the first render, so by the time it
  // runs `window.PoWFaucet` is complete and `ui.registerPanel` is there to call
  // (PLAN_PLUGIN_ARCHITECTURE.md ss.3, QUERY_P1_CORE_SDK step 3).
  let PoWFaucet = (window as any).PoWFaucet = {
    ...powfaucet,
    ...buildClientSdk(),
    page: null,
    initializeFaucet: initializeFaucet,
  };
  // `flags` is a live reading, and a spread would have frozen it: the faucet is a
  // HashRouter, so a developer arrives at `#/route?dev=1` after this object
  // was built, and a module that asked then would have been told about the URL
  // nobody is on any more.
  Object.defineProperty(PoWFaucet, "flags", { get: getCoreFlags, enumerable: true });

  // No module is registered here any more: each one is a package, and its
  // `client/module.js` fills the slots from its own bundle - injected as a
  // deferred script that runs after this one and before the first render. What
  // the core knows about any of them is now exactly nothing.

  // The first render waits for DOMContentLoaded, and that is what makes the sentence above
  // true. A module's script is injected as `defer`, which runs it after parsing and *before*
  // that event; this bundle is a classic script at the end of <body>, so it runs during
  // parsing. Rendering here would beat every module to it, and a panel registered by one
  // would arrive after the page had already decided it did not exist.
  let boot = () => {
    var container = document.querySelector(".pow-faucet");
    if(container && container.hasAttribute("data-powfaucet")) {
      let faucetProps: IFaucetPageProps = {};
      PoWFaucet.page = initializeFaucet(container, faucetProps);
    }
  };
  if(document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  else
    boot();
})();
