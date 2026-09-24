import 'mocha';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig } from '../common.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetProcess } from '../../src/common/FaucetProcess.js';
import { FaucetWorkers } from '../../src/common/FaucetWorker.js';
import { MODULE_CLASSES } from '../../src/modules/modules.js';
import { ModuleLoader } from '../../src/loader/ModuleLoader.js';
import { createRequire } from 'node:module';

/**
 * The loader, against a fixture module that is plain CommonJS and is not compiled by this
 * repository's tsconfig - because a real module will not be either.
 *
 * What matters here is less "does it load" than "what does it do when a module is wrong":
 * a faucet that will not start because of a module gives an operator nothing to go on, and
 * a module that half-registers leaves the faucet in a state nobody designed.
 */
describe("ModuleLoader", () => {
  let globalStubs;
  let logLines: {level: any, message: string}[];
  let tempDirs: string[] = [];
  let registered: string[] = [];
  const FIXTURE = path.resolve("tests/fixtures/echo");

  /**
   * Each test gets its own module and worker keys.
   *
   * The registries are process-global and a registration cannot be undone - deliberately,
   * since a faucet never unloads a module. So a fixture reused across tests would collide
   * with itself on the second one, and adding an `unregister` to the production API to
   * make tests convenient would be the tail wagging the dog.
   */
  let keySeq = 0;

  beforeEach(() => {
    globalStubs = bindTestStubs();
    loadDefaultTestConfig();
    logLines = [];
    let process = ServiceManager.GetService(FaucetProcess);
    (process as any).emitLog = (level: any, message: string) => logLines.push({ level, message });
  });

  afterEach(async () => {
    registered.forEach((key) => { delete MODULE_CLASSES[key]; });
    registered = [];
    tempDirs.forEach((dir) => {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch(ex) { /* gone */ }
    });
    tempDirs = [];
    await ServiceManager.DisposeAllServices();
    await unbindTestStubs(globalStubs);
  });

  /** A copy of the fixture with unique keys, and whatever else a test wants changed. */
  function fixture(changes: any = {}): {dir: string, moduleKey: string, workerKey: string} {
    let suffix = "-" + (++keySeq);
    let moduleKey = "echo" + suffix;
    let workerKey = "echo-worker" + suffix;

    let dir = fs.mkdtempSync(path.join(os.tmpdir(), "powfaucet-module-"));
    tempDirs.push(dir);
    fs.cpSync(FIXTURE, dir, { recursive: true });


    let manifest = JSON.parse(fs.readFileSync(path.join(dir, "module.json"), "utf8"));
    manifest.modules = { [moduleKey]: "EchoModule" };
    manifest.workers = { [workerKey]: "EchoWorker" };
    Object.assign(manifest, changes);
    for(let key in changes) {
      if(changes[key] === undefined)
        delete manifest[key];
    }
    fs.writeFileSync(path.join(dir, "module.json"), JSON.stringify(manifest));
    registered.push(moduleKey);
    return { dir: dir, moduleKey: moduleKey, workerKey: workerKey };
  }

  function errors(): string[] {
    return logLines.filter((line) => line.level === "ERROR").map((line) => line.message);
  }

  it("loads a module and registers what its manifest names", async () => {
    let made = fixture();
    let loader = new ModuleLoader();
    let loaded = await loader.loadAll(os.tmpdir(), [made.dir]);

    expect(loaded.length).to.equal(1, "the fixture did not load: " + JSON.stringify(errors()));
    expect(loaded[0].manifest.name).to.equal("echo", "manifest name mismatch");
    expect(!!MODULE_CLASSES[made.moduleKey]).to.equal(true, "the module was not registered");
    expect(FaucetWorkers.hasWorkerClass(made.workerKey)).to.equal(true, "the worker was not registered");
  });

  it("hands the module the live sdk, not a description of one", async () => {
    let made = fixture();
    let loader = new ModuleLoader();
    let loaded = await loader.loadAll(os.tmpdir(), [made.dir]);
    expect(loaded.length).to.equal(1, "the fixture did not load: " + JSON.stringify(errors()));

    // the fixture records what it was handed; each copy is its own require cache entry
    let seen = createRequire(import.meta.url)(path.join(made.dir, "backend.cjs")).__seen;
    expect(seen.initCalls > 0).to.equal(true, "init was never called");
    expect(seen.apiVersion).to.equal(1, "the module was told the wrong api version");
    expect(seen.moduleDir).to.equal(made.dir, "the module was not told where it lives");
    // {os}/{arch} resolved against a binary that is really there
    if(process.platform === "linux" && process.arch === "x64")
    expect(logLines.some((line) => line.message.indexOf("[echo] echo module initialised") !== -1))
      .to.equal(true, "the module's log did not reach the faucet's: " + JSON.stringify(logLines.map((l) => l.message)));
  });

  it("skips a module built against another api version, and keeps going", async () => {
    let bad = fixture({ apiVersion: 99, name: "wrongapi" });
    let good = fixture();
    let loader = new ModuleLoader();
    let loaded = await loader.loadAll(os.tmpdir(), [bad.dir, good.dir]);

    expect(loaded.length).to.equal(1, "the good module should still have loaded");
    expect(loaded[0].manifest.name).to.equal("echo", "the wrong module loaded instead");
    expect(errors().some((message) => message.indexOf("module api 99") !== -1))
      .to.equal(true, "the mismatch was not reported: " + JSON.stringify(errors()));
  });

  it("calls an unbuilt module unbuilt, at INFO, and still loads the others", async () => {
    /**
     * A source tree without its build is **not** a fault.
     *
     * A module checkout under `modules/` is a tracked scaffold - manifest and sources in the tree, no
     * `backend.cjs` until somebody runs its build - so every local `check-modules`, including the one
     * inside `deploy-test.sh pack`, printed a red line about a thing that is fine.
     * ERROR is for a module that is wrong; this one is merely unbuilt, and the difference is exactly
     * whether the file the manifest names is there.
     */
    let unbuilt = fixture({ name: "unbuilt" });
    fs.rmSync(path.resolve(unbuilt.dir, "backend.cjs"), { force: true });
    let good = fixture();
    let loader = new ModuleLoader();
    let loaded = await loader.loadAll(os.tmpdir(), [unbuilt.dir, good.dir]);

    expect(loaded.length).to.equal(1, "the built module should still have loaded");
    expect(errors().some((message) => message.indexOf("unbuilt") !== -1)).to.equal(false,
      "an unbuilt module was reported as an error: " + JSON.stringify(errors()));
    let infos = logLines.filter((line) => line.level === "INFO").map((line) => line.message);
    let said = infos.filter((message) => message.indexOf("is not built") !== -1);
    expect(said.length).to.equal(1, "expected one INFO line about the unbuilt module, got " +
      JSON.stringify(infos));
    expect(said[0]).to.contain("backend.cjs", "the line does not name the file that is missing");
  });

  it("still calls a module with a broken backend an error, not merely unbuilt", async () => {
    // The other side of the same line: the file exists and does not export a module. That is wrong
    // rather than unfinished, and must stay at ERROR.
    let broken = fixture({ name: "brokenexport" });
    fs.writeFileSync(path.resolve(broken.dir, "backend.cjs"), "module.exports = { nope: true };\n");
    let loader = new ModuleLoader();
    await loader.loadAll(os.tmpdir(), [broken.dir]);

    expect(errors().some((message) => message.indexOf("brokenexport") !== -1)).to.equal(true,
      "a module with a backend that exports nothing was not an error: " + JSON.stringify(errors()));
  });

  it("refuses a module that would shadow a core worker key", async () => {
    let made = fixture({ name: "shadow", workers: { "pow-validator": "EchoWorker" } });
    let loader = new ModuleLoader();
    let loaded = await loader.loadAll(os.tmpdir(), [made.dir]);

    expect(loaded.length).to.equal(0, "a module must not take over a core worker");
    expect(errors().some((message) => message.indexOf("pow-validator") !== -1))
      .to.equal(true, "the clash was not named: " + JSON.stringify(errors()));
    // and nothing of it stuck
    expect(!!MODULE_CLASSES[made.moduleKey]).to.equal(false,
      "the module registered its module before failing on the worker - a half-loaded module");
  });

  it("reports a broken manifest instead of throwing", async () => {
    let dir = fs.mkdtempSync(path.join(os.tmpdir(), "powfaucet-module-"));
    tempDirs.push(dir);
    fs.writeFileSync(path.join(dir, "module.json"), "{ not json");

    let loader = new ModuleLoader();
    let loaded = await loader.loadAll(os.tmpdir(), [dir]);
    expect(loaded.length).to.equal(0, "a broken manifest must not load");
    expect(errors().length > 0).to.equal(true, "nothing was logged about it");
  });

  it("finds a module beside the program, which is what makes the three formats one rule", async () => {
    /**
     * Source (a): `<program dir>/modules/`, the directory the artifact ships with.
     *
     * This is the source that makes raw dist, the bundle and the executable **one** loader rule
     * (PLAN_MODULE_SPLIT ss.4): `dist/modules/` when started as `node dist/app.js`, `bundle/modules/`
     * from the bundle, the extraction cache from the executable. The program dir is taken from
     * `process.argv[1]` - the file the operator started - and not `__dirname`, which inside the bundle
     * is wherever webpack put the chunk.
     */
    let program = fs.mkdtempSync(path.join(os.tmpdir(), "powfaucet-program-"));
    tempDirs.push(program);
    fs.mkdirSync(path.join(program, "modules"), { recursive: true });
    let made = fixture();
    fs.cpSync(made.dir, path.join(program, "modules", "echo"), { recursive: true });

    let argvWas = process.argv[1];
    process.argv[1] = path.join(program, "app.js");
    try {
      let loader = new ModuleLoader();
      let loaded = await loader.loadAll(fs.mkdtempSync(path.join(os.tmpdir(), "powfaucet-empty-")));
      expect(loaded.length).to.equal(1,
        "a module beside the program should load with no config and no datadir copy: " +
        JSON.stringify(errors()));
      expect(loaded[0].manifest.name).to.equal("echo");
    }
    finally {
      process.argv[1] = argvWas;
    }
  });

  it("lets a later source shadow an earlier one, and says which it shadowed", async () => {
    /**
     * Two copies of one module on a disk is exactly the state in which a person spends an hour reading
     * the wrong file, so the rule is fixed and it is announced: program dir, then datadir, then
     * `modulePaths` - **later wins**, because an operator who drops a build into the datadir or points
     * the config at a working tree means the copy they just put there.
     */
    let program = fs.mkdtempSync(path.join(os.tmpdir(), "powfaucet-program-"));
    let datadir = fs.mkdtempSync(path.join(os.tmpdir(), "powfaucet-datadir-"));
    tempDirs.push(program, datadir);
    fs.mkdirSync(path.join(program, "modules"), { recursive: true });
    fs.mkdirSync(path.join(datadir, "modules"), { recursive: true });

    let older = fixture();
    let newer = fixture();
    // same module name from both sources, different versions so the winner is identifiable
    for(let [src, dst, version] of [[older.dir, path.join(program, "modules", "echo"), "1.0.0"],
                                    [newer.dir, path.join(datadir, "modules", "echo"), "2.0.0"]] as any) {
      fs.cpSync(src, dst, { recursive: true });
      let manifestPath = path.join(dst, "module.json");
      let manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      manifest.version = version;
      // one name, or there is nothing to shadow
      manifest.name = "echo";
      fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    }

    let argvWas = process.argv[1];
    process.argv[1] = path.join(program, "app.js");
    try {
      let loader = new ModuleLoader();
      let loaded = await loader.loadAll(datadir);
      expect(loaded.length).to.equal(1, "one name must load once, not twice");
      expect(loaded[0].manifest.version).to.equal("2.0.0",
        "the datadir copy should have won: got " + loaded[0].manifest.version);
      let infos = logLines.filter((line) => line.level === "INFO").map((line) => line.message);
      let shadow = infos.filter((line) => line.indexOf("shadows") !== -1);
      expect(shadow.length).to.equal(1, "expected one shadowing line, got " + JSON.stringify(infos));
      expect(shadow[0]).to.contain("the datadir", "it does not say which source won");
      expect(shadow[0]).to.contain("the program directory", "it does not say which was shadowed");
    }
    finally {
      process.argv[1] = argvWas;
    }
  });

  it("does not let an unloadable copy hide a loadable one", async () => {
    /**
     * The case that caught itself on the first real run.
     *
     * The plan puts module *sources* at `modules/<name>/` in the repo, and the loader's second source is
     * `<datadir>/modules/` - and in development the datadir is the repo root, so those are the same
     * directory. The unbuilt source tree has a `module.json`, so it won on being later, then refused to
     * load for want of a `backend.cjs`, and the built copy never got a turn: "0 module(s) loaded" with
     * the real module sitting in `dist/modules/`.
     *
     * So the order is a *preference*. The newest copy is tried first; if it cannot load, the next is,
     * and the fallback is announced at WARNING because "your newer copy was skipped and an older one is
     * running" is not something to find out later.
     */
    let program = fs.mkdtempSync(path.join(os.tmpdir(), "powfaucet-program-"));
    let datadir = fs.mkdtempSync(path.join(os.tmpdir(), "powfaucet-datadir-"));
    tempDirs.push(program, datadir);
    fs.mkdirSync(path.join(program, "modules"), { recursive: true });
    fs.mkdirSync(path.join(datadir, "modules"), { recursive: true });

    // the good copy beside the program...
    let good = fixture();
    fs.cpSync(good.dir, path.join(program, "modules", "echo"), { recursive: true });
    // ...and an unbuilt source tree of the same name in the datadir, which is what a repo checkout is
    let unbuilt = path.join(datadir, "modules", "echo");
    fs.mkdirSync(unbuilt, { recursive: true });
    fs.cpSync(path.join(good.dir, "module.json"), path.join(unbuilt, "module.json"));
    // no backend.cjs: exactly the state of a module whose sources are here and whose build is not

    let argvWas = process.argv[1];
    process.argv[1] = path.join(program, "app.js");
    try {
      let loader = new ModuleLoader();
      let loaded = await loader.loadAll(datadir);
      expect(loaded.length).to.equal(1,
        "the built copy should have loaded after the unbuilt one was skipped: " +
        JSON.stringify(errors()) + " / " + JSON.stringify(logLines.map((l) => l.message)));
      let warnings = logLines.filter((line) => line.level === "WARNING").map((line) => line.message);
      expect(warnings.some((line) => line.indexOf("could not be loaded") !== -1)).to.equal(true,
        "the fallback was silent: " + JSON.stringify(warnings));
    }
    finally {
      process.argv[1] = argvWas;
    }
  });

  it("finds modules under <datadir>/modules without being told", async () => {
    let datadir = fs.mkdtempSync(path.join(os.tmpdir(), "powfaucet-datadir-"));
    tempDirs.push(datadir);
    fs.mkdirSync(path.join(datadir, "modules"), { recursive: true });
    let made = fixture();
    fs.cpSync(made.dir, path.join(datadir, "modules", "echo"), { recursive: true });

    let loader = new ModuleLoader();
    let loaded = await loader.loadAll(datadir);
    expect(loaded.length).to.equal(1, "a module in the datadir should load without config: " +
      JSON.stringify(errors()));
  });


  /**
   * The check a package gets while the module key it carries is still compiled in: everything a
   * load does, except the registration that would be refused for the right reason.
   */
  it("inspects a module without registering anything", async () => {
    let made = fixture();
    let loader = new ModuleLoader();
    let inspected = await loader.inspectAll(os.tmpdir(), [made.dir]);

    expect(inspected.length).to.equal(1, "the fixture did not pass inspection: " + JSON.stringify(errors()));
    expect(!!MODULE_CLASSES[made.moduleKey]).to.equal(false, "inspection registered the module");
    expect(FaucetWorkers.hasWorkerClass(made.workerKey)).to.equal(false, "inspection registered the worker");
    expect(loader.getLoaded().length).to.equal(0, "an inspected module must not count as loaded");
  });

  it("reports an export the manifest names and the backend does not have", async () => {
    let made = fixture({ modules: { "echo-missing": "NotExported" } });
    let loader = new ModuleLoader();
    let inspected = await loader.inspectAll(os.tmpdir(), [made.dir]);
    expect(inspected.length).to.equal(0, "a manifest naming a missing export must not pass");
    expect(errors().some((message) => message.indexOf("NotExported") !== -1))
      .to.equal(true, "the missing export was not named: " + JSON.stringify(errors()));
  });

  /** What `check-modules <dir>` relies on: these paths and nothing scanned. */
  it("loads only what it was handed when there is no datadir", async () => {
    let datadir = fs.mkdtempSync(path.join(os.tmpdir(), "powfaucet-datadir-"));
    tempDirs.push(datadir);
    fs.mkdirSync(path.join(datadir, "modules"), { recursive: true });
    let inDatadir = fixture({ name: "notasked" });
    fs.cpSync(inDatadir.dir, path.join(datadir, "modules", "notasked"), { recursive: true });
    let asked = fixture();

    let loader = new ModuleLoader();
    let loaded = await loader.loadAll(null, [asked.dir]);
    expect(loaded.length).to.equal(1, "exactly the one it was handed should load: " +
      JSON.stringify(errors()));
    expect(loaded[0].manifest.name).to.equal("echo", "it loaded something it was not asked for");
  });
});
