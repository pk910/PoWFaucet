/**
 * The operator's key, typed once on the status page and kept for the tab.
 *
 * The faucet's API unmasks the status list and the session details for a request that carries
 * it. sessionStorage: it is gone when the tab closes, it is not shared with other tabs, and it
 * never leaves the browser except in the query of the two requests that take it.
 */
const STORAGE_KEY = "powfaucet.operatorKey";

export function getOperatorKey(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || null;
  } catch(ex) {
    return null;
  }
}

export function setOperatorKey(key: string | null): void {
  try {
    if(key)
      sessionStorage.setItem(STORAGE_KEY, key);
    else
      sessionStorage.removeItem(STORAGE_KEY);
  } catch(ex) {
    // storage blocked: the key lives for this page only
  }
}
