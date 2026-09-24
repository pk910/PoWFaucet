/**
 * What a module's own specs may use of the faucet - the test-time counterpart of `src/sdk`.
 *
 * A module package's server half is written against the SDK, and that surface is narrow on purpose. Its
 * **specs** are not module consumers: they boot a real faucet in the test process - the database, the
 * module manager, the session manager, the http server - because a module that is only ever exercised
 * against a mock is a module whose first real faucet is production. They therefore reach for things the
 * SDK deliberately does not offer.
 *
 * Until now they reached for them by *relative path*: `../../../../../src/db/FaucetDatabase.js` from
 * `modules/<name>/tests/server/host/`, which is five levels of assumption that the module lives inside a
 * faucet checkout. After the cutover it does not have to, and tsc cannot redirect a
 * relative specifier - only a bare name. So this file is the bare name: one place that says what a
 * module's spec may touch, which is also the first time that list has been written down anywhere.
 *
 * It is compiled into `sdk-dist/testing/` by the SDK build, which is what makes the types line up: every
 * declaration a spec sees comes from the same emit as the ones the module's own code compiles against.
 * A module resolves it as `@powfaucet/faucet-testing`, shimmed into its compiled test tree beside the SDK
 * shim - the same mechanism, for the same reason: one instance of the faucet's objects, not two.
 *
 * **Nothing on a running faucet's path imports it**: `src/app.ts` does not reach it, so it is not in the
 * bundle, and the only thing that loads it is a spec.
 *
 * Adding to it is a decision, not a convenience: everything here is something a module's spec can do to a
 * faucet, and the reason the SDK does not export it is usually still a good reason at run time.
 */

// the harness itself: stubs for what a test must not really do, and the config a test starts from
export { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, awaitSleepPromise } from './harness.js';

// the faucet a spec boots. `FaucetDatabase` and `SessionManager` are what make a session real; the
// module manager and the class registry are how a module gets loaded without a package on disk; the web
// api is how a spec reads what the page would be told.
export { FaucetDatabase, FaucetDbDriver } from '../db/FaucetDatabase.js';
export { SessionManager } from '../session/SessionManager.js';
export { ModuleManager } from '../modules/ModuleManager.js';
export { MODULE_CLASSES, registerModuleClass } from '../modules/modules.js';
export { FaucetWebApi } from '../webserv/FaucetWebApi.js';

// small utilities a spec uses that the SDK has no reason to carry
export { sleepPromise } from '../utils/PromiseUtils.js';
export { HASHED_ADDR_LENGTH } from '../utils/HashedInfo.js';
