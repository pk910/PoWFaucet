import 'mocha';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig } from '../common.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetDatabase } from '../../src/db/FaucetDatabase.js';
import { FaucetWorkers } from '../../src/common/FaucetWorker.js';
import { ModuleLoader } from '../../src/loader/ModuleLoader.js';
import { MODULE_CLASSES } from '../../src/modules/modules.js';

/**
 * A module's worker, in the process that actually has to be it.
 *
 * Registering a worker class and *running* one are two different processes, and until the loader only the
 * first was ever checked: the echo fixture declared `echo-worker`, the suite asserted the key was
 * registered, and no child was ever spawned. The day a worker the faucet used to carry became an
 * installed module's, a faucet with that module enabled failed to initialise with
 *
 *     Faucet initialization failed: unknown worker class-key '<the module's worker>'
 *
 * because a forked child loads no modules and a key is all it used to be told. So this spec checks
 * the two halves of the fix where they live: the registration records where the class came from, and
 * a child handed that - on its own command line, as `fork` passes it - loads the class and says so
 * from inside its own process.
 */
// The compiled spec lives in `dist-test/tests/loader/`, and the fixture is not compiled - it is a
// module package on disk, which is the point of it - so both paths are taken from the repository
// root three levels up, the way `ModuleClient.spec.ts` does it. `app.js` *is* compiled, and the
// child is forked against the compiled entry because that is what a faucet forks.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FIXTURE = path.join(REPO_ROOT, "tests", "fixtures", "echo");
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "app.js");

describe("a module's worker", () => {
  let globalStubs;
  let datadir: string;
  let temps: string[] = [];
  let registered: string[] = [];
  let keySeq = 0;

  beforeEach(async () => {
    globalStubs = bindTestStubs();
    loadDefaultTestConfig();
    await ServiceManager.GetService(FaucetDatabase).initialize();
    datadir = fs.mkdtempSync(path.join(os.tmpdir(), "powfaucet-worker-"));
  });
  afterEach(async () => {
    // The registries are process-global and a registration cannot be undone - a faucet never
    // unloads a module - so what a test registered has to be taken back out here or the next spec
    // in this process inherits it. Leaving `echo` in `MODULE_CLASSES` made `ModuleManager`'s
    // "load & unload every module" try to configure a fixture, which is a failure in a test that
    // has nothing to do with this one.
    registered.forEach((key) => { delete MODULE_CLASSES[key]; });
    registered = [];
    await ServiceManager.GetService(FaucetDatabase).closeDatabase();
    await unbindTestStubs(globalStubs);
    await ServiceManager.DisposeAllServices();
    temps.forEach((dir) => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch(ex) { /* gone */ } });
    temps = [];
    fs.rmSync(datadir, { recursive: true, force: true });
  });

  /**
   * A copy of the fixture under keys nothing else in this process uses.
   *
   * The prefix is this file's own, not just a counter: a **worker** key can never be unregistered
   * (`WORKER_CLASSES` has no removal, deliberately - a faucet never unloads a module), so two specs
   * in one mocha process that invent the same names collide on the second one. `ModuleLoader.spec`
   * numbers its fixtures `echo-1`, `echo-worker-1`, … and this spec loading `echo-worker-1` after it
   * was refused with "already registered" - passing alone, failing in the suite.
   */
  function fixture(): { dir: string, moduleKey: string, workerKey: string } {
    let suffix = "-wkr" + (++keySeq);
    let dir = fs.mkdtempSync(path.join(os.tmpdir(), "powfaucet-worker-pkg-"));
    temps.push(dir);
    fs.cpSync(FIXTURE, dir, { recursive: true });
    let manifest = JSON.parse(fs.readFileSync(path.join(dir, "module.json"), "utf8"));
    manifest.modules = { ["echo" + suffix]: "EchoModule" };
    manifest.workers = { ["echo-worker" + suffix]: "EchoWorker" };
    fs.writeFileSync(path.join(dir, "module.json"), JSON.stringify(manifest, null, 2));
    registered.push("echo" + suffix);
    return { dir: dir, moduleKey: "echo" + suffix, workerKey: "echo-worker" + suffix };
  }

  it("registers with where its class came from, not only its key", async () => {
    let made = fixture();
    let loader = new ModuleLoader();
    let loaded = await loader.loadAll(datadir, [made.dir]);
    expect(loaded.length).to.equal(1, "the fixture should load");

    let source = FaucetWorkers.getWorkerSource(made.workerKey);
    expect(!!source).to.equal(true, "the worker registered without a source, so no child can be it");
    expect(source.backend).to.equal(path.join(made.dir, "backend.cjs"),
      "the source must name the backend file the class is in");
    expect(source.export).to.equal("EchoWorker", "and the export inside it");
  });

  it("is what a child process spawned for it actually becomes", async () => {
    // The real path: this is the command line `createChildProcess` builds, run against the compiled
    // entry, in a process that has loaded no modules. A message from inside it is the only proof.
    let child = fork(APP, ["worker", "echo-worker", path.join(FIXTURE, "backend.cjs"), "EchoWorker"],
                     { silent: true });
    let said = await new Promise<any>((resolve) => {
      let output = "";
      child.stderr?.on("data", (chunk) => output += chunk);
      child.stdout?.on("data", (chunk) => output += chunk);
      child.on("message", (message) => resolve(message));
      child.on("exit", (code) => resolve({ exited: code, output: output }));
      setTimeout(() => resolve({ timedOut: true, output: output }), 30000);
    });
    child.kill();

    expect(said.action).to.equal("echo-worker",
      "the child did not become the module's worker: " + JSON.stringify(said));
    expect(said.pid).to.not.equal(process.pid, "that message came from this process, not a child");
  });

  it("says what it needs when nothing tells it where the class is", async () => {
    let failed: string = null;
    try {
      await FaucetWorkers.loadWorkerClass("not-compiled-in");
    } catch(ex) {
      failed = String(ex.message || ex);
    }
    expect(failed).to.match(/unknown worker class-key 'not-compiled-in'/,
      "an unknown key must name itself, whatever else is wrong");
    expect(failed).to.match(/where it comes from/,
      "and say that the missing part is the source, which is the thing a child is told");
  });
});
