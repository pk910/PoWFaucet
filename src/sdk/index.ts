/**
 * The faucet's module SDK.
 *
 * A module is a package the faucet loads at startup from `<datadir>/modules/<name>/`; it
 * brings backend classes, worker classes, client assets and, if it has one, a native binary.
 * This module is the entire surface it may build against - `PLAN_PLUGIN_ARCHITECTURE.md`
 * §3, phase 1.
 *
 * Two rules make that surface worth having:
 *
 * - **One of everything.** The SDK hands a module the *live* objects, not copies: one
 *   `ServiceManager`, one `BaseModule` class, one `ModuleHookAction` enum. A module that
 *   bundled its own copy would register hooks the faucet never calls and fail in ways that
 *   read like the faucet being broken. `IFaucetSdk` is passed to `init()` for exactly this
 *   reason - a module takes what it needs from the object it is given.
 * - **Narrow on purpose.** Everything re-exported here is something a module cannot do
 *   without. What is missing is missing deliberately: `FaucetSession`'s mutators beyond the
 *   module hooks, `SessionManager`, the database layer and the PoW module are the faucet's
 *   own and are open points rather than surface (QUERY_P1, "Open points, not decisions").
 *
 * The surface's proof used to be that a module compiled in against it and imported nothing
 * else. Now a module lives in its own package and imports only from here - the same proof, with the compiler no longer able to paper over a gap through a
 * relative path into the faucet's tree.
 *
 * What is *not* here is as deliberate as what is. This surface knows nothing about what a module
 * does: no rooms, no players, no protocol of its own. The machinery one kind of module happens to
 * need - a gateway worker, a supervised child process, a wire protocol - belongs to that module,
 * and a second module of the same kind takes it from a shared one when there is a second (D4:
 * extensible, not pre-built).
 */

// ===================================================================================
// the module system
// ===================================================================================

export { BaseModule } from "../modules/BaseModule.js";
export type { IBaseModuleConfig } from "../modules/BaseModule.js";
export { ModuleHookAction } from "../modules/ModuleManager.js";
export type { ModuleHookRegistration } from "../modules/ModuleManager.js";

// ===================================================================================
// the services a module talks to
// ===================================================================================

export { ServiceManager } from "../common/ServiceManager.js";
export { FaucetProcess, FaucetLogLevel } from "../common/FaucetProcess.js";
export { FaucetWorkers } from "../common/FaucetWorker.js";
export type { IFaucetChildProcess } from "../common/FaucetWorker.js";
export { FaucetStatsLog } from "../services/FaucetStatsLog.js";
export { FaucetHttpServer } from "../webserv/FaucetHttpServer.js";

// ===================================================================================
// sessions, as much of them as a module hook needs
// ===================================================================================

export { FaucetSession, FaucetSessionStatus } from "../session/FaucetSession.js";
export type { ISessionRewardFactor } from "../session/SessionRewardFactor.js";
export { FaucetError } from "../common/FaucetError.js";

// The session a module was told about, by id - not `SessionManager`, which stays the faucet's.
export { getSession } from "./sessions.js";

// ===================================================================================
// the config, the build, and the few utilities a module cannot reimplement
// ===================================================================================

// What moving a module out proved was missing. Each of these was reached through a relative
// path into the faucet's tree by a module while it lived there, and each one a module cannot
// write for itself: the config object and its `~app`/`~datadir` path syntax; the build manifest,
// which is how a module tells whether the engine it is running is the one this deploy describes;
// and three utilities that touch internals - the http upgrade's socket buffer, a child process's
// own resource usage, and the faucet's address/ip hashing, which must produce the *same* hash as
// the core or a module's records do not line up with the faucet's.
export { faucetConfig, resolveRelativePath } from "../config/FaucetConfig.js";
export { getHashedAddr, getHashedIp } from "../utils/HashedInfo.js";
export { SocketCapture } from "../utils/SocketCapture.js";
export { PromiseDfd } from "../utils/PromiseDfd.js";
export { ProcessLoadTracker } from "../utils/ProcessLoadTracker.js";

// ===================================================================================
// the module contract itself
// ===================================================================================

export type { IModulePackage, IFaucetSdk, IModuleManifest, IModulePackageMap } from "./modulePackage.js";
export { MODULE_API_VERSION } from "./modulePackage.js";
