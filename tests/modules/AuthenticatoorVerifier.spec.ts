import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { exportJWK, generateKeyPair, SignJWT, KeyObject } from 'jose';
import { FetchUtil } from '../../src/utils/FetchUtil.js';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig } from '../common.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { AuthenticatoorVerifier, matchHost } from '../../src/modules/authenticatoor/AuthenticatoorVerifier.js';

interface IFakeFetchResponse {
  url: RegExp;
  rsp?: any;
  json?: any;
  fail?: boolean;
  calls: { url: string; opts: any }[];
}

const AUTH_URL = "http://auth.test.local";
const ISSUER = AUTH_URL;
const AUDIENCE = "faucet.test.local";
const KID = "test-key-1";

describe("Faucet module: authenticatoor (verifier)", () => {
  let globalStubs: any;
  let fakeFetchResponses: IFakeFetchResponse[];
  let privateKey: KeyObject;
  let publicJWK: any;

  before(async () => {
    let kp = await generateKeyPair("RS256", { extractable: true });
    privateKey = kp.privateKey as KeyObject;
    publicJWK = await exportJWK(kp.publicKey);
    publicJWK.kid = KID;
    publicJWK.alg = "RS256";
    publicJWK.use = "sig";
  });

  beforeEach(async () => {
    fakeFetchResponses = [];
    globalStubs = bindTestStubs({
      "fetch": sinon.stub(FetchUtil, "fetch").callsFake(fakeFetch),
    });
    loadDefaultTestConfig();

    addFakeFetchResponse({
      url: /\.well-known\/openid-configuration$/,
      json: {
        issuer: ISSUER,
        jwks_uri: AUTH_URL + "/jwks.json",
      },
      calls: [],
    });
    addFakeFetchResponse({
      url: /\/jwks\.json$/,
      json: { keys: [publicJWK] },
      calls: [],
    });
  });

  afterEach(async () => {
    await ServiceManager.DisposeAllServices();
    await unbindTestStubs(globalStubs);
  });

  function fakeFetch(url: any): Promise<any> {
    for(let i = 0; i < fakeFetchResponses.length; i++) {
      if(fakeFetchResponses[i].url.test(url)) {
        if(!fakeFetchResponses[i].calls)
          fakeFetchResponses[i].calls = [];
        fakeFetchResponses[i].calls.push({ url: url, opts: undefined });
        if(fakeFetchResponses[i].fail)
          return Promise.reject(fakeFetchResponses[i].rsp);
        return Promise.resolve(fakeFetchResponses[i].rsp);
      }
    }
    return Promise.reject("no fake response for " + url);
  }

  function addFakeFetchResponse(opts: IFakeFetchResponse): IFakeFetchResponse {
    if(opts.json && !opts.rsp) {
      opts.rsp = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(opts.json),
      };
    }
    fakeFetchResponses.push(opts);
    return opts;
  }

  async function mintToken(claims: { sub?: string, email?: string, aud?: string, iss?: string, exp?: number, scope?: string }): Promise<string> {
    let signer = new SignJWT({
      email: claims.email,
      scope: claims.scope,
    })
      .setProtectedHeader({ alg: "RS256", kid: KID })
      .setIssuer(claims.iss ?? ISSUER)
      .setAudience(claims.aud ?? AUDIENCE)
      .setSubject(claims.sub ?? "alice@example.com")
      .setIssuedAt()
      .setExpirationTime(claims.exp ?? Math.floor(Date.now() / 1000) + 1800);
    return signer.sign(privateKey);
  }

  it("Verify valid token", async () => {
    let token = await mintToken({ email: "alice@example.com" });
    let verifier = new AuthenticatoorVerifier(AUTH_URL, AUDIENCE);
    let claims = await verifier.verify(token);
    expect(claims.email).to.equal("alice@example.com", "claims.email mismatch");
    expect(claims.sub).to.equal("alice@example.com", "claims.sub mismatch");
    expect(claims.iss).to.equal(ISSUER, "claims.iss mismatch");
  });

  it("Verify caches discovery (one fetch per JWKS lookup, not per verify)", async () => {
    let discovery = fakeFetchResponses[0];
    let verifier = new AuthenticatoorVerifier(AUTH_URL, AUDIENCE);
    let token1 = await mintToken({ email: "alice@example.com" });
    let token2 = await mintToken({ email: "bob@example.com" });
    await verifier.verify(token1);
    await verifier.verify(token2);
    expect(discovery.calls.length).to.equal(1, "discovery should only be fetched once");
  });

  it("Reject token with wrong audience", async () => {
    let token = await mintToken({ email: "alice@example.com", aud: "other.audience" });
    let verifier = new AuthenticatoorVerifier(AUTH_URL, AUDIENCE);
    let err: Error | null = null;
    try { await verifier.verify(token); } catch(ex) { err = ex; }
    expect(err).to.not.equal(null, "no error thrown");
    expect(err?.message.toLowerCase()).to.match(/aud/, "expected aud-related error");
  });

  it("Reject token with wrong issuer", async () => {
    let token = await mintToken({ email: "alice@example.com", iss: "https://other.issuer" });
    let verifier = new AuthenticatoorVerifier(AUTH_URL, AUDIENCE);
    let err: Error | null = null;
    try { await verifier.verify(token); } catch(ex) { err = ex; }
    expect(err).to.not.equal(null, "no error thrown");
    expect(err?.message.toLowerCase()).to.match(/iss/, "expected iss-related error");
  });

  it("Reject expired token", async () => {
    let token = await mintToken({ email: "alice@example.com", exp: Math.floor(Date.now() / 1000) - 60 });
    let verifier = new AuthenticatoorVerifier(AUTH_URL, AUDIENCE);
    let err: Error | null = null;
    try { await verifier.verify(token); } catch(ex) { err = ex; }
    expect(err).to.not.equal(null, "no error thrown");
    expect(err?.message.toLowerCase()).to.match(/exp/, "expected exp-related error");
  });

  it("Reject tampered token", async () => {
    let token = await mintToken({ email: "alice@example.com" });
    let tampered = token.slice(0, -8) + "AAAAAAAA";
    let verifier = new AuthenticatoorVerifier(AUTH_URL, AUDIENCE);
    let err: Error | null = null;
    try { await verifier.verify(tampered); } catch(ex) { err = ex; }
    expect(err).to.not.equal(null, "no error thrown");
    expect(err?.message.toLowerCase()).to.match(/signature/, "expected signature error");
  });

  it("Reject when discovery endpoint fails", async () => {
    fakeFetchResponses[0].rsp = { ok: false, status: 502, json: () => Promise.resolve({}) };
    let verifier = new AuthenticatoorVerifier(AUTH_URL, AUDIENCE);
    let err: Error | null = null;
    try { await verifier.verify("any.token"); } catch(ex) { err = ex; }
    expect(err).to.not.equal(null, "no error thrown");
    expect(err?.message).to.match(/discovery failed: HTTP 502/, "expected discovery http error");
  });

  it("Reject when discovery doc is missing fields", async () => {
    fakeFetchResponses[0].rsp = { ok: true, status: 200, json: () => Promise.resolve({}) };
    let verifier = new AuthenticatoorVerifier(AUTH_URL, AUDIENCE);
    let err: Error | null = null;
    try { await verifier.verify("any.token"); } catch(ex) { err = ex; }
    expect(err).to.not.equal(null, "no error thrown");
    expect(err?.message).to.match(/missing issuer or jwks_uri/, "expected missing fields error");
  });

  it("Discovery failure resets so a later verify can retry", async () => {
    fakeFetchResponses[0].rsp = { ok: false, status: 502, json: () => Promise.resolve({}) };
    let verifier = new AuthenticatoorVerifier(AUTH_URL, AUDIENCE);
    let firstErr: Error | null = null;
    try { await verifier.verify("any.token"); } catch(ex) { firstErr = ex; }
    expect(firstErr).to.not.equal(null);

    // Recover discovery and retry — should succeed now.
    fakeFetchResponses[0].rsp = {
      ok: true, status: 200,
      json: () => Promise.resolve({ issuer: ISSUER, jwks_uri: AUTH_URL + "/jwks.json" }),
    };
    let token = await mintToken({ email: "alice@example.com" });
    let claims = await verifier.verify(token);
    expect(claims.email).to.equal("alice@example.com");
  });

  it("Scope check: accepts when scope wildcard matches expectedHost", async () => {
    let token = await mintToken({ email: "alice@example.com", scope: "*.example.com" });
    let verifier = new AuthenticatoorVerifier(AUTH_URL, AUDIENCE, "faucet.example.com");
    let claims = await verifier.verify(token);
    expect(claims.email).to.equal("alice@example.com");
  });

  it("Scope check: rejects when scope wildcard does not match expectedHost", async () => {
    let token = await mintToken({ email: "alice@example.com", scope: "*.other.com" });
    let verifier = new AuthenticatoorVerifier(AUTH_URL, AUDIENCE, "faucet.example.com");
    let err: Error | null = null;
    try { await verifier.verify(token); } catch(ex) { err = ex; }
    expect(err).to.not.equal(null, "no error thrown");
    expect(err?.message).to.match(/scope .* does not match host/, "expected scope mismatch error");
  });

  it("Scope check: tokens without a scope claim are accepted regardless", async () => {
    let token = await mintToken({ email: "alice@example.com" }); // no scope set
    let verifier = new AuthenticatoorVerifier(AUTH_URL, AUDIENCE, "faucet.example.com");
    let claims = await verifier.verify(token);
    expect(claims.email).to.equal("alice@example.com");
    expect(claims.scope).to.equal(undefined, "scope should be unset on this token");
  });

  it("Scope check: when expectedHost unset, scope is not checked", async () => {
    let token = await mintToken({ email: "alice@example.com", scope: "*.totally-different.com" });
    let verifier = new AuthenticatoorVerifier(AUTH_URL, AUDIENCE);
    let claims = await verifier.verify(token);
    expect(claims.email).to.equal("alice@example.com");
  });

  describe("matchHost", () => {
    it("exact match", () => {
      expect(matchHost("foo.bar", "foo.bar")).to.equal(true);
      expect(matchHost("foo.bar", "baz.bar")).to.equal(false);
    });
    it("leading wildcard requires at least one label", () => {
      expect(matchHost("*.foo.bar", "x.foo.bar")).to.equal(true);
      expect(matchHost("*.foo.bar", "x.y.foo.bar")).to.equal(true);
      expect(matchHost("*.foo.bar", "foo.bar")).to.equal(false);
    });
    it("label boundary is enforced (no partial wildcard)", () => {
      expect(matchHost("*.foo.bar", "evil-foo.bar")).to.equal(false);
    });
    it("partial wildcards are not supported", () => {
      expect(matchHost("foo*.bar", "fooz.bar")).to.equal(false);
    });
    it("non-leading wildcards are not supported", () => {
      expect(matchHost("a.*.b", "a.x.b")).to.equal(false);
      expect(matchHost("a.b.*", "a.b.c")).to.equal(false);
    });
    it("'*' alone matches anything", () => {
      expect(matchHost("*", "anything.example.com")).to.equal(true);
      expect(matchHost("*", "x")).to.equal(true);
    });
    it("case-insensitive", () => {
      expect(matchHost("*.Example.COM", "Faucet.example.com")).to.equal(true);
    });
    it("empty pattern or host returns false", () => {
      expect(matchHost("", "foo.bar")).to.equal(false);
      expect(matchHost("foo.bar", "")).to.equal(false);
    });
    it("length mismatch on non-wildcard pattern returns false", () => {
      expect(matchHost("foo.bar", "x.foo.bar")).to.equal(false);
    });
  });

  it("Strips trailing slashes from authUrl", async () => {
    let verifier = new AuthenticatoorVerifier(AUTH_URL + "///", AUDIENCE);
    let token = await mintToken({ email: "alice@example.com" });
    await verifier.verify(token);
    let discoveryCall = fakeFetchResponses[0].calls[0];
    expect(discoveryCall.url).to.equal(AUTH_URL + "/.well-known/openid-configuration",
      "discovery URL should not have double slashes");
  });
});
