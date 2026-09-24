import 'mocha';
import { expect } from 'chai';
import * as testing from '../../src/testing/index.js';
import * as sdk from '../../src/sdk/index.js';

/**
 * The test-time surface a module's specs may use, and the line between it and the SDK.
 *
 * A module's server half compiles against `src/sdk`, which is narrow on purpose. Its **specs** boot a
 * real faucet - the database, the module manager, the session manager, the web api - and so need things
 * the SDK withholds at run time and should go on withholding. `src/testing/index.ts` is where that is
 * written down; before it, each spec reached five directory levels into this tree by
 * relative path, which is also why nobody could say what the list was.
 *
 * Two directions, because both can rot: the surface has to carry what a spec cannot get from the SDK,
 * and it must not quietly become a second SDK - anything on both is either a mistake here or a sign that
 * the SDK should have it.
 */
describe("the module test-time surface", () => {
  /** Everything a module's specs were reaching into this tree for, by name. */
  const NEEDED = [
    // the harness: what a test must not really do, and the config it starts from
    "bindTestStubs", "unbindTestStubs", "loadDefaultTestConfig", "awaitSleepPromise",
    // the faucet a spec boots
    "FaucetDatabase", "FaucetDbDriver", "SessionManager", "ModuleManager",
    "MODULE_CLASSES", "registerModuleClass", "FaucetWebApi",
    // utilities the SDK has no reason to carry
    "sleepPromise", "HASHED_ADDR_LENGTH",
  ];

  it("carries everything a module's specs cannot get from the SDK", () => {
    let missing = NEEDED.filter((name) => (testing as any)[name] === undefined);
    expect(missing).to.deep.equal([],
      "a module's specs import these by name; each missing one is a spec that cannot compile");
  });

  it("is not a second SDK", () => {
    // If something is on both, the question is which one is wrong: a module that can do it at run time
    // does not need a test-only door, and a module that cannot should not get one through its specs.
    let both = NEEDED.filter((name) => (sdk as any)[name] !== undefined);
    expect(both).to.deep.equal([],
      "these are on the module SDK as well, so the test surface is handing out something a module " +
      "already has - or the SDK is handing out something it meant to withhold");
  });

  it("exports nothing that is not on the list", () => {
    // The other direction, and the one that rots silently: a door added to the surface without being
    // written down here is a door nobody reviewed. `NEEDED` is the contract, so the surface has to equal
    // it - adding to one means adding to the other, on purpose.
    let extra = Object.keys(testing).filter((name) => NEEDED.indexOf(name) === -1);
    expect(extra).to.deep.equal([],
      "the test surface exports " + extra.length + " name(s) that are not on the list: each is something " +
      "a module's specs can do to a faucet that nobody wrote down");
  });
});
