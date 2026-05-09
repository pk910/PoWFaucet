// Pre-mount handler for authenticatoor's /auth/login redirect.
//
// authenticatoor returns the user to <our origin>#auth_token=…&exp=…&user=…
// after a successful login. The faucet uses HashRouter, so any unhandled
// hash content is interpreted as a route — leaving the user with a blank
// page until they reload from a clean URL.
//
// This module:
//   1. Detects the auth_token fragment params on initial page load.
//   2. Stashes them to sessionStorage with the exact keys authenticatoor's
//      drop-in client.js library uses, so AuthenticatoorLogin's later
//      checkLogin() picks the token up from cache.
//   3. Strips just those params from the hash via history.replaceState,
//      preserving any other fragment content (so it doesn't break the
//      router on first paint).
//
// Mirrors `captureFromFragment()` in service-authenticatoor's client.js,
// minus the network bits — this runs before our React tree mounts and
// before that script even loads.

const STORAGE_TOKEN = "ethpandaops.authenticatoor.token";
const STORAGE_EXP = "ethpandaops.authenticatoor.exp";
const STORAGE_USER = "ethpandaops.authenticatoor.user";

function base64UrlDecode(s: string): string {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while(s.length % 4) s += "=";
  try { return atob(s); } catch(e) { return ""; }
}

function extractUserFromToken(token: string): string {
  if(!token) return "";
  let parts = token.split(".");
  if(parts.length !== 3) return "";
  let json = base64UrlDecode(parts[1]);
  if(!json) return "";
  try {
    let c = JSON.parse(json);
    return (c.email as string) || (c.sub as string) || "";
  } catch(e) {
    return "";
  }
}

export function captureAuthenticatoorFragment(): void {
  if(!window.location.hash || window.location.hash.length < 2)
    return;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(window.location.hash.slice(1));
  } catch(e) {
    return;
  }

  let token = params.get("auth_token");
  let expStr = params.get("exp");
  if(!token || !expStr)
    return;
  let exp = parseInt(expStr, 10);
  if(!exp || isNaN(exp))
    return;

  let user = params.get("user") || extractUserFromToken(token);
  try {
    sessionStorage.setItem(STORAGE_TOKEN, token);
    sessionStorage.setItem(STORAGE_EXP, String(exp));
    sessionStorage.setItem(STORAGE_USER, user || "");
  } catch(e) { /* private mode etc — fall through */ }

  params.delete("auth_token");
  params.delete("exp");
  params.delete("user");
  let remaining = params.toString();
  let newURL = window.location.pathname + window.location.search +
    (remaining ? "#" + remaining : "");
  try { history.replaceState(null, "", newURL); } catch(e) {}
}
