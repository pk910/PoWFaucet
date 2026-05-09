import { createRemoteJWKSet, customFetch, jwtVerify, JWTPayload } from "jose";
import { ServiceManager } from "../../common/ServiceManager.js";
import { FaucetLogLevel, FaucetProcess } from "../../common/FaucetProcess.js";
import { FetchUtil } from "../../utils/FetchUtil.js";

export interface IAuthenticatoorClaims extends JWTPayload {
  email?: string;
  scope?: string;
  services?: string;
}

export class AuthenticatoorVerifier {
  private authUrl: string;
  private expectedAudience: string;
  private issuer: string;
  private jwks: ReturnType<typeof createRemoteJWKSet>;
  private discoveryPromise: Promise<void>;

  public constructor(authUrl: string, expectedAudience: string) {
    this.authUrl = authUrl.replace(/\/+$/, "");
    this.expectedAudience = expectedAudience;
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
    return payload as IAuthenticatoorClaims;
  }
}
