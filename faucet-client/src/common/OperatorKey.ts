/**
 * The operator's key, typed once on the status page and kept in the browser.
 *
 * The faucet's API unmasks the status list and the session details for a request that carries
 * it. localStorage: it stays across tabs, restarts and crashes of the browser until the faucet
 * refuses it or the field is cleared, and it never leaves the browser except in the header of
 * the two requests that take it.
 */
const STORAGE_KEY = "powfaucet.operatorKey";

export function getOperatorKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch(ex) {
    return null;
  }
}

export function setOperatorKey(key: string | null): void {
  try {
    if(key)
      localStorage.setItem(STORAGE_KEY, key);
    else
      localStorage.removeItem(STORAGE_KEY);
  } catch(ex) {
    // storage blocked: the key lives for this page only
  }
}
