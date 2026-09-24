import React from 'react';
import { IFaucetConfig } from '../common/FaucetConfig';

/**
 * The places a module may put something, and the only ones.
 *
 * The core client used to reach into one module by import: the mining page
 * rendered that module's panel and the faucet page mounted its dev route, both by name,
 * both from that module's own directory. That is the coupling this removes. The core now
 * offers **slots** and a module fills them - the first of them through
 * a hard-wired call, a loaded module through its client script, and
 * the two call exactly the same functions in the same order.
 *
 * Nothing here knows what any module does. A panel is a React component that the
 * mining page renders where the first module's panel used to sit; a route is a path the
 * faucet page mounts. With none registered the pages render as they did before
 * any module existed, which is the acceptance for this stage and a case in the
 * suite.
 */

/**
 * What the mining page hands a panel.
 *
 * These are the props the first panel was given by the page, split into what the
 * core knows (the session, the wallet, the module's config) and what it wants
 * back (the balance, the leave). The panel owns everything module-shaped behind
 * them - the socket, the client registry, the dev flags - because the core no
 * longer has a name for any of it.
 */
export interface IMiningPanelProps {
  /** the faucet session this panel belongs to */
  sessionId: string;
  /**
   * The faucet's state block for this module, and nothing else's.
   *
   * The whole session info carries every other module's state; a panel that
   * helped itself to those would break the moment one of them changed shape,
   * and the page has already read the one that matters.
   */
  moduleState: unknown;
  /** the module this panel was registered for, as the faucet names it */
  moduleName: string;
  /** that module's client config block, as `config.module(name)` returns it */
  moduleConfig: unknown;
  /** the faucet's own config: the coin, the decimals, what a claim needs */
  faucetConfig: IFaucetConfig;
  /** where the websocket lives, when the faucet publishes a base for it */
  wsBaseUrl: string | null;
  /** whether the page has room for the panel to be collapsed (a mining session has) */
  collapsible: boolean;
  /** the balance the session has now, whichever half of it is earning */
  getBalance: () => bigint;
  /** the panel earned something: the page routes it to the miner's status and the claim */
  onBalance: (balanceWei: string, reason: string) => void;
  /** the panel wants the miner to go slower while it is being played */
  setMinerThrottle: (fraction: number) => void;
  /** the panel's session ended; the page decides where that leaves the player */
  onLeave: () => void;
  /**
   * The panel's own control surface, handed up when it is ready.
   *
   * One method today: the page's Stop button has to be able to end a session the
   * panel owns. A callback rather than a ref because a module's component is not
   * this build's React class and may not be a class at all.
   */
  onPanelReady?: (api: IMiningPanelApi | null) => void;
}

export interface IMiningPanelApi {
  /** leave the module's session, as the page's Stop button asks */
  leave: () => void;
}

export interface IRegisteredRoute {
  path: string;
  component: React.ComponentType<Record<string, never>>;
  /** only mounted when the page is in dev mode */
  dev: boolean;
}

/**
 * What a panel says about itself when it registers.
 *
 * `module` is here because the page needs it and the alternative was worse: the
 * mining page used to find the module by scanning the config for names carrying a
 * particular prefix, which is the core knowing what one kind of module does in
 * order to render something that is none of its business. A panel knows which
 * module it belongs to; it can say so.
 *
 * `captions` are the words the page puts on the screen when this panel is the
 * whole session - a heading and two buttons. They used to be written into the
 * core, in the vocabulary of the one module that existed, which made the core's
 * wording a guess about what a module does. A module that hosts a quiz or a
 * survey wants different words and should not have to ask for them.
 */
export interface IPanelCaptions {
  /** the noun in "<x> balance too low" */
  balance: string;
  /** the button that goes back to it */
  resume: string;
  /** the button that ends it */
  stop: string;
}

/**
 * One way to start a session with this module, as the front page offers it.
 *
 * The core renders a button per mode and puts `key` in the start request's
 * `params.mode`; it never reads that value, and the module's server half is the
 * only thing that knows what it means. Before this the page had the two modes
 * of the one module that existed written into it, with a config flag deciding
 * whether the second was allowed - so the core knew that "playing" was a thing
 * and that a module might permit it *instead* of mining.
 *
 * `withMining` is the one bit the core does need, because it is a fact about the
 * *core*: whether the session it is about to start still mines. It decides
 * whether the button is offered at all when the faucet has no pow module.
 */
export interface IPanelSessionMode {
  /** what goes in `params.mode`; opaque to the core */
  key: string;
  /** the button's words */
  label: string;
  /** the line under it, as a tooltip */
  hint?: string;
  /** false when choosing this means the session does not mine */
  withMining: boolean;
}

export interface IRegisteredPanel {
  slot: string;
  component: React.ComponentType<IMiningPanelProps>;
  /** the faucet module this panel belongs to, as the faucet names it */
  module: string;
  /** what the page should call it when it is the whole session */
  captions?: IPanelCaptions;
  /** what to call it in a list of things to start, when more than one is offered */
  title?: string;
  /** the ways a session with this module can be started */
  modes?: IPanelSessionMode[];
}

/** Every panel registered for a slot, in registration order. */
let panels: Map<string, IRegisteredPanel[]> = new Map();
let routes: IRegisteredRoute[] = [];

/**
 * Puts a component in a slot.
 *
 * Called before the first render - a module's script is injected `defer` and the
 * page waits for `DOMContentLoaded` - so a panel registered here is one the page
 * has never rendered without. Registering twice is allowed and renders twice:
 * the core does not deduplicate what a module asked for.
 */
export function registerPanel(slot: string, component: React.ComponentType<IMiningPanelProps>,
                              options: { module: string; captions?: IPanelCaptions;
                                         title?: string; modes?: IPanelSessionMode[] }): void {
  let list = panels.get(slot);
  if(!list)
    panels.set(slot, list = []);
  list.push({
    slot: slot, component: component,
    module: options.module, captions: options.captions,
    title: options.title, modes: options.modes,
  });
}

export function getPanels(slot: string): IRegisteredPanel[] {
  return (panels.get(slot) || []).slice();
}

/**
 * Mounts a component at a path.
 *
 * `dev` routes exist only when the page is in dev mode, which is the same
 * condition the first dev route was written with - a developer's query flag,
 * never a player's URL.
 */
export function registerRoute(path: string, component: React.ComponentType<Record<string, never>>,
                              options?: { dev?: boolean }): void {
  routes.push({ path: path, component: component, dev: !!(options && options.dev) });
}

export function getRoutes(): IRegisteredRoute[] {
  return routes.slice();
}

/**
 * Forgets every registration.
 *
 * Published as `PoWFaucet.ui.reset()` because two callers need it and neither is
 * a module: a host that reloads its modules without reloading the page, and the
 * case that asks what this page does with **no** module in it - which is the
 * acceptance for this stage and cannot be written any other way, since the
 * built-in registration happens while the bundle is still executing.
 */
export function resetSlots(): void {
  panels = new Map();
  routes = [];
}
