import 'mocha';
import { expect } from 'chai';
import * as sdk from '../../src/sdk/index.js';

/**
 * What a module may build against, checked from the core's side.
 *
 * The first deliverable was a property: a module consumed the SDK surface and nothing behind it,
 * so that moving it out would be a build change rather than a rewrite. Moving it out collected on
 * that - a module lives in its own package now, and the compiler enforces what this file used to
 * scan for, because a relative path from a module into the faucet's tree no longer resolves at all.
 *
 * So what is left here is the other half, and it is the half that can still rot: the surface has to
 * *carry* what a module cannot write for itself, and it must not hand over the faucet's internals.
 * Both directions are asserted, because both have been wrong - the move found seven things the module
 * host had been reaching around the surface for, and the surface still deliberately withholds
 * `SessionManager`, the database and the PoW module.
 */
describe("the module SDK surface", () => {

  /**
   * One kind of module's host machinery is not the faucet's surface any more.
   *
   * A third specifier re-exported the host directory while that code lived here. Both are in
   * the module that needed it now, and a module that wants such machinery takes it from the
   * module that has it - a platform that ships one kind of module's host has a favourite kind of
   * module. A module asking for the old specifier gets an ordinary
   * "cannot find module", which is the truth; the loader stopped injecting that specifier.
   */
  it("does not hand out one kind of module's host machinery", () => {
    let hostLike = Object.keys(sdk).filter((key) => /host/i.test(key));
    expect(hostLike).to.deep.equal([],
      "the sdk carries host machinery again: that belongs to the module that needs it");
  });

  /**
   * The seven the move found.
   *
   * Each of these was reached through a relative path into the faucet's tree by that machinery while
   * it lived inside it, and each is something a module genuinely cannot write for itself: the
   * config object and its `~app`/`~datadir` path syntax; the build manifest, which is how a module
   * tells whether the engine it runs is the one this deploy describes; the faucet's own address and
   * ip hashing, which has to produce the *same* hash as the core or a module's records do not line
   * up with the faucet's; and three utilities that touch internals - the http upgrade's socket
   * buffer, a child process's resource usage, and a deferred.
   *
   * Named one by one so that removing one fails here, in the repository that owns the surface,
   * rather than in a module this repository no longer compiles.
   */
  it("carries what a module cannot write for itself", () => {
    expect(typeof sdk.faucetConfig).to.equal("object", "faucetConfig missing");
    expect(typeof sdk.resolveRelativePath).to.equal("function", "resolveRelativePath missing");
    expect(typeof sdk.getHashedAddr).to.equal("function", "getHashedAddr missing");
    expect(typeof sdk.getHashedIp).to.equal("function", "getHashedIp missing");
    expect(typeof sdk.SocketCapture).to.equal("function", "SocketCapture missing");
    expect(typeof sdk.ProcessLoadTracker).to.equal("function", "ProcessLoadTracker missing");
    expect(typeof sdk.PromiseDfd).to.equal("function", "PromiseDfd missing");
  });

  /**
   * And the session lookup *without* the session manager.
   *
   * A module serving its own socket is handed a session id and has to turn it into a session -
   * one call, which is why `getSession` is on the surface. `SessionManager` itself owns creation,
   * expiry and persistence and stays off it: a module can read the session it was told about, and
   * cannot enumerate, create or end one.
   */
  it("hands out a session lookup and not the session manager", () => {
    expect(typeof sdk.getSession).to.equal("function", "getSession missing");
    expect((sdk as any).SessionManager).to.equal(undefined,
      "SessionManager is the faucet's own (PLAN_PLUGIN_ARCHITECTURE, \"open points, not surface\")");
    expect((sdk as any).FaucetDatabase).to.equal(undefined, "the database layer is not surface");
  });

  it("the module and service surface a module registers against", () => {
    expect(typeof sdk.BaseModule).to.equal("function", "BaseModule missing");
    expect(typeof sdk.ModuleHookAction).to.equal("object", "ModuleHookAction missing");
    expect(typeof sdk.ServiceManager).to.equal("function", "ServiceManager missing");
    expect(typeof sdk.FaucetProcess).to.equal("function", "FaucetProcess missing");
    expect(typeof sdk.FaucetWorkers).to.equal("function", "FaucetWorkers missing");
    expect(typeof sdk.FaucetStatsLog).to.equal("function", "FaucetStatsLog missing");
    expect(typeof sdk.FaucetHttpServer).to.equal("function", "FaucetHttpServer missing");
    expect(typeof sdk.FaucetSession).to.equal("function", "FaucetSession missing");
    expect(typeof sdk.FaucetError).to.equal("function", "FaucetError missing");
    expect(sdk.MODULE_API_VERSION).to.equal(1, "the module api version is part of the contract");
  });

  /**
   * The SDK is what a module imports, so it must not drag the faucet's world in when it is
   * merely type-checked against. More practically: `src/sdk/index.ts` is imported by
   * a module class, which `modules.ts` imports, which the service layer reaches - the
   * cycle that has already cost one "cannot access before initialization" this week. A
   * surface that computes nothing at import time cannot repeat it.
   */
  it("importing the SDK evaluates no faucet state", async () => {
    let fresh = await import("../../src/sdk/index.js?fresh=" + Date.now());
    expect(typeof fresh.BaseModule).to.equal("function", "the SDK did not load on its own");
    // the newest members of the surface are re-exported from four different corners of the faucet,
    // which is exactly how an import-time cycle gets back in
    expect(typeof (fresh as any).getSession).to.equal("function", "the session lookup did not load");
    expect(typeof (fresh as any).SocketCapture).to.equal("function", "the socket capture did not load");
  });
});
