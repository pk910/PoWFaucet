import { createRemoteJWKSet, customFetch, jwtVerify, JWTPayload } from "jose";
import { ServiceManager } from "../../common/ServiceManager.js";
import { FaucetLogLevel, FaucetProcess } from "../../common/FaucetProcess.js";
import { FetchUtil } from "../../utils/FetchUtil.js";

export interface IAuthenticatoorClaims extends JWTPayload {
  email?: string;
  scope?: string;
  services?: string;
}

// matchHost mirrors authenticatoor's pkg/auth.MatchHost: a DNS-label glob.
// "foo.bar" matches only "foo.bar"; "*.foo.bar" matches "x.foo.bar" and
// "x.y.foo.bar" but not "foo.bar" (leading "*" requires at least one
// label) and not "evil-foo.bar" (label boundary enforced); "*" matches
// anything. Partial and non-leading wildcards are not supported.
export function matchHost(pattern: string, host: string): boolean {
  pattern = (pattern || "").toLowerCase().trim();
  host = (host || "").toLowerCase().trim();
  if(!pattern || !host)
    return false;
  if(pattern === "*")
    return true;

  let pl = pattern.split(".");
  let hl = host.split(".");

  for(let i = 0; i < pl.length; i++) {
    let l = pl[i];
    if(l === "*" && i !== 0)
      return false;
    if(l.indexOf("*") !== -1 && l !== "*")
      return false;
  }

  if(pl[0] === "*") {
    let suffix = pl.slice(1);
    if(hl.length <= suffix.length)
      return false;
    for(let i = 0; i < suffix.length; i++) {
      if(suffix[suffix.length - 1 - i] !== hl[hl.length - 1 - i])
        return false;
    }
    return true;
  }

  if(pl.length !== hl.length)
    return false;
  for(let i = 0; i < pl.length; i++) {
    if(pl[i] !== hl[i])
      return false;
  }
  return true;
}

export class AuthenticatoorVerifier {
  private authUrl: string;
  private expectedAudience: string;
  private expectedHost: string;
  private issuer: string;
  private jwks: ReturnType<typeof createRemoteJWKSet>;
  private discoveryPromise: Promise<void>;

  public constructor(authUrl: string, expectedAudience: string, expectedHost?: string) {
    this.authUrl = authUrl.replace(/\/+$/, "");
    this.expectedAudience = expectedAudience;
    this.expectedHost = expectedHost || "";
  }

  private async ensureDiscovered(): Promise<void> {
    if(this.jwks)
      return;
    if(!this.discoveryPromise) {
      this.discoveryPromise = this.discover().catch((err) => {
        // Reset so a later call can retry instead of being stuck on a failed promise.
        this.discoveryPromise = null;
        throw err;
      });
    }
    await this.discoveryPromise;
  }

  private async discover(): Promise<void> {
    let discoveryUrl = this.authUrl + "/.well-known/openid-configuration";
    let response = await FetchUtil.fetch(discoveryUrl);
    if(!response.ok)
      throw new Error("authenticatoor discovery failed: HTTP " + response.status);
    let doc = await response.json() as { issuer?: string, jwks_uri?: string };
    if(!doc.issuer || !doc.jwks_uri)
      throw new Error("authenticatoor discovery: missing issuer or jwks_uri");
    this.issuer = doc.issuer;
    this.jwks = createRemoteJWKSet(new URL(doc.jwks_uri), {
      [customFetch]: ((url: any, init: any) => FetchUtil.fetch(url, init)) as any,
    });
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "authenticatoor discovered: issuer=" + this.issuer + " jwks=" + doc.jwks_uri);
  }

  public async verify(token: string): Promise<IAuthenticatoorClaims> {
    await this.ensureDiscovered();
    let { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
      audience: this.expectedAudience,
      algorithms: ["RS256"],
    });
    let claims = payload as IAuthenticatoorClaims;

    // When expectedHost is configured, enforce that the token's scope
    // wildcard pattern matches our host. Tokens without a scope claim
    // fall through unchecked — the audience pin is the floor of trust.
    if(this.expectedHost && claims.scope) {
      if(!matchHost(claims.scope, this.expectedHost))
        throw new Error("scope " + JSON.stringify(claims.scope) + " does not match host " + JSON.stringify(this.expectedHost));
    }

    return claims;
  }
}
