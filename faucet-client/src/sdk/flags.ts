/**
 * The core's own dev switch.
 *
 * The question this answers belongs to the core: *"is this page being driven by
 * a developer, so that routes registered `{dev: true}` may be mounted?"* It used
 * to be answered by importing a module and asking it, which made the core page
 * depend on one module in order to decide something about itself.
 *
 * `?dev=1` is the core's parameter, and it is the only one the core defines. A
 * module that wants its own switches reads its own query string; the core has no
 * opinion about what they are called and does not look for them. A module's dev
 * route is therefore opened with `?dev=1` plus whatever the module reads.
 *
 * The faucet uses a HashRouter, so a dev URL is `/#/somewhere?dev=1` and the
 * parameters can land in the hash rather than in the search; both are read, and
 * `search` wins on a conflict.
 */
const DEV_PARAM = "dev";

export interface ICoreFlags {
  /** a developer is driving this page: routes registered `{dev: true}` are mounted */
  dev: boolean;
}

function params(): URLSearchParams {
  let merged = new URLSearchParams();
  let fromHash = location.hash.indexOf("?");
  if(fromHash >= 0) {
    let hash = new URLSearchParams(location.hash.substring(fromHash + 1));
    hash.forEach((value, key) => merged.set(key, value));
  }
  new URLSearchParams(location.search).forEach((value, key) => merged.set(key, value));
  return merged;
}

export function getCoreFlags(): ICoreFlags {
  let query = params();
  return { dev: query.has(DEV_PARAM) };
}
