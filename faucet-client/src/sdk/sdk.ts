import React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import * as common from '../common';
import * as types from '../types';
import { getCoreFlags, ICoreFlags } from './flags';
import { getPanels, getRoutes, IMiningPanelProps, registerPanel, registerRoute, resetSlots } from './slots';

/**
 * The surface a module may rely on, and the only one.
 *
 * A module's bundle declares every one of these as a webpack external and picks
 * them up from `window.PoWFaucet` at run time. That is not a convenience: two
 * copies of React in one page render nothing and explain nothing, and two copies
 * of any runtime a module shares with the page make two incompatible worlds. So the
 * faucet hands out its own instances and a module never bundles its own.
 *
 * `apiVersion` is the number a module's manifest is checked against. It changes
 * when something here changes shape; adding to it does not.
 */
export const SDK_API_VERSION = 1;

export interface IFaucetClientSdk {
  /** the faucet client's own version, for a module that wants to say so */
  version: string;
  /** the module interface version this build speaks */
  apiVersion: number;
  React: typeof React;
  ReactDOM: typeof ReactDOM;
  /**
   * React's automatic JSX runtime.
   *
   * Nothing imports it by hand, which is why it is easy to miss: babel's
   * automatic runtime emits `import { jsx } from "react/jsx-runtime"` for every
   * element, so a module that does not externalise it ships a second element
   * factory and every element it makes is foreign to this React.
   *
   * Imported by name rather than as a namespace: this build compiles JSX with
   * the classic runtime, so nothing else in it touches that module, and babel's
   * TypeScript preset drops a namespace import it believes is unused - which
   * leaves `jsxRuntime is not defined` at load and a blank page.
   */
  jsxRuntime: { jsx: typeof jsx; jsxs: typeof jsxs; Fragment: typeof Fragment };
  common: typeof common;
  types: typeof types;
  /**
   * Where a module puts its own user interface.
   *
   * The core renders what is registered here and knows nothing else about it.
   * The first module registers through these exact calls, before any other
   * does, so the surface is proved by the thing that used to be hard-wired.
   */
  ui: IFaucetClientUi;
  /** what the faucet published for a module, without handing over the whole config */
  config: IFaucetClientConfigAccess;
  /** the page's own switches; `dev` gates routes registered `{dev: true}` */
  flags: ICoreFlags;
  /** see `checkSingletons` */
  checkSingletons: (theirs?: ISingletonCandidates) => ISingletonReport;
}

export interface IFaucetClientUi {
  /** put a component in a slot; "mining" is the mining page's panel row */
  registerPanel: (slot: string, component: React.ComponentType<IMiningPanelProps>) => void;
  /** mount a component at a path; `{dev: true}` only when the page is in dev mode */
  registerRoute: (path: string, component: React.ComponentType<Record<string, never>>,
                  options?: { dev?: boolean }) => void;
  /** what is registered, for the pages that render it */
  getPanels: typeof getPanels;
  getRoutes: typeof getRoutes;
  /** forget every registration: a host reloading its modules, or a page under test */
  reset: typeof resetSlots;
}

export interface IFaucetClientConfigAccess {
  /**
   * A module's client config block, by the name the faucet knows it as.
   *
   * A module reads its own settings and nobody else's: the whole config carries
   * every other module's, and a module that helped itself to those would break
   * the moment one of them changed shape.
   */
  module: (name: string) => unknown;
}

/** What a module passes to `checkSingletons`: whatever it ended up with. */
export interface ISingletonCandidates {
  React?: unknown;
  ReactDOM?: unknown;
  jsxRuntime?: unknown;
}

export interface ISingletonReport {
  ok: boolean;
  /** the names that are not the faucet's own instance */
  duplicated: string[];
}

/**
 * Whether a module is using the faucet's own singletons.
 *
 * Called with no arguments it reports on the page as a whole - a second React
 * on `window` is the usual sign. Called with what the module imported, it says
 * which of those are copies. A copy of React means hooks throw and nothing
 * renders; a copy of a shared runtime means objects from one half
 * is unreadable by the other. Both fail far from the cause, which is why this
 * exists rather than a comment in the docs.
 */
export function checkSingletons(theirs?: ISingletonCandidates): ISingletonReport {
  let mine: ISingletonCandidates = {
    React: React,
    ReactDOM: ReactDOM,
    jsxRuntime: { jsx: jsx, jsxs: jsxs, Fragment: Fragment },
  };
  let duplicated: string[] = [];
  let names: (keyof ISingletonCandidates)[] = ["React", "ReactDOM", "jsxRuntime"];
  for(let i = 0; i < names.length; i++) {
    let name = names[i];
    let candidate = theirs ? theirs[name] : undefined;
    if(candidate && candidate !== mine[name])
      duplicated.push(name);
  }
  if(duplicated.length > 0) {
    console.error("[PoWFaucet] a module bundled its own " + duplicated.join(", ") +
      " instead of taking the faucet's from window.PoWFaucet; declare them as webpack externals");
  }
  return { ok: duplicated.length === 0, duplicated: duplicated };
}

/**
 * The faucet config as the page last read it, for `config.module(name)`.
 *
 * Set by the page when it has one rather than fetched here: a module asking for
 * its config before the page has any gets `null`, which is the honest answer and
 * the same one it would get from a faucet that does not run it.
 */
let currentConfig: { modules?: Record<string, unknown> } | null = null;

export function publishFaucetConfig(config: unknown): void {
  currentConfig = config as { modules?: Record<string, unknown> };
}

function moduleConfig(name: string): unknown {
  if(!currentConfig || !currentConfig.modules)
    return null;
  let block = currentConfig.modules[name];
  return block === undefined ? null : block;
}

/** The object published as `window.PoWFaucet`, minus the page's own fields. */
export function buildClientSdk(): IFaucetClientSdk {
  return {
    version: FAUCET_CLIENT_VERSION,
    apiVersion: SDK_API_VERSION,
    React: React,
    ReactDOM: ReactDOM,
    jsxRuntime: { jsx: jsx, jsxs: jsxs, Fragment: Fragment },
    common: common,
    types: types,
    ui: {
      registerPanel: registerPanel,
      registerRoute: registerRoute,
      getPanels: getPanels,
      getRoutes: getRoutes,
      reset: resetSlots,
    },
    config: {
      module: (name: string) => moduleConfig(name),
    },
    // A getter, not a snapshot: the page is a HashRouter, so a developer arrives
    // at `#/route?dev=1` *after* this object was built and a value read once
    // at load would answer for the URL nobody is on any more.
    get flags() { return getCoreFlags(); },
    checkSingletons: checkSingletons,
  };
}
