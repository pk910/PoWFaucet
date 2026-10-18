/**
 * RPC URLs carry secrets: basic auth in the userinfo, API keys as path segments or query values.
 * Everything the faucet logs or shows about an endpoint goes through here first.
 */

const SECRET_QUERY_KEYS = /^(api[_-]?key|key|token|auth|secret|password|pw|access[_-]?token|x[_-]?api[_-]?key)$/i;

/** Long opaque strings (hex, base64url, UUIDs): the usual shape of an API key. */
export function looksLikeSecret(value: string): boolean {
  if (!value || value.length < 16)
    return false;
  return /^[A-Za-z0-9_\-]{16,}$/.test(value);
}

/** A display-safe URL: no userinfo, key-like path segments and secret-bearing query values redacted. */
export function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    let dirty = false;
    if (u.username || u.password) {
      u.username = '';
      u.password = '';
      dirty = true;
    }
    if (u.pathname && u.pathname !== '/') {
      const sanitizedPath = u.pathname
        .split('/')
        .map((seg) => looksLikeSecret(seg) ? '<redacted>' : seg)
        .join('/');
      if (sanitizedPath !== u.pathname) {
        u.pathname = sanitizedPath;
        dirty = true;
      }
    }
    if (u.search) {
      let changed = false;
      const out = new URLSearchParams();
      for (const [k, v] of u.searchParams.entries()) {
        if (SECRET_QUERY_KEYS.test(k) || looksLikeSecret(v)) {
          out.append(k, '<redacted>');
          changed = true;
        } else {
          out.append(k, v);
        }
      }
      if (changed) {
        u.search = '?' + out.toString();
        dirty = true;
      }
    }
    return dirty ? u.toString() : url;
  } catch (ex) {
    return url;
  }
}

/** Every http(s)/ws(s) URL in a piece of text (an error message, say) replaced by its redacted form. */
export function redactUrlsInText(text: string): string {
  if (!text)
    return text;
  return text.replace(/(?:https?|wss?):\/\/[^\s"'`<>]+/gi, (match) => redactUrl(match));
}
