import 'mocha';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig } from '../common.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetDatabase } from '../../src/db/FaucetDatabase.js';
import { ModuleManager } from '../../src/modules/ModuleManager.js';
import { MODULE_CLASSES } from '../../src/modules/modules.js';
import { faucetConfig } from '../../src/config/FaucetConfig.js';
import { FaucetHttpServer } from '../../src/webserv/FaucetHttpServer.js';
import { ModuleLoader } from '../../src/loader/ModuleLoader.js';

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..");
const FIXTURE = path.join(REPO_ROOT, "tests", "fixtures", "echo");

/**
 * The one thing about a module's client half that cannot be checked by reading html: that
 * its script really runs, with the sdk already published and before the faucet's first
 * render. Everything hangs off that ordering - a view registered after the first render is
 * one the page has already decided does not exist.
 *
 * Needs a browser, so it lives in the browser suite and skips itself like the rest of it.
 * It needs no native binary, only the client bundle.
 */
describe("module client half in a browser", () => {
  let globalStubs;
  let tempDirs: string[] = [];
  let registered: string[] = [];
  let browser = null;
  let skipReason: string = null;

  before(async function() {
    if(process.env.FAUCET_E2E_BROWSER !== "1")
      skipReason = "set FAUCET_E2E_BROWSER=1 to run the browser suite";
    else if(!fs.existsSync(path.join(REPO_ROOT, "bundle", "manifest.json")))
      skipReason = "no bundle/manifest.json - run 'npm run build-client && npm run bundle'";
    else {
      try {
        let { chromium } = await import("playwright");
        if(!fs.existsSync(chromium.executablePath()))
          skipReason = "chromium is not installed - run 'npx playwright install chromium'";
        else {
          browser = await chromium.launch();
        }
      } catch(ex) {
        skipReason = "playwright is not installed - run 'npm install'";
      }
    }
  });

  after(async () => {
    if(browser)
      await browser.close();
  });

  beforeEach(async () => {
    globalStubs = bindTestStubs();
    loadDefaultTestConfig();
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    // the real bundle, not the copy the node suite makes under dist-test
    faucetConfig.staticPath = path.join(REPO_ROOT, "static");
    await ServiceManager.GetService(FaucetDatabase).initialize();
  });

  afterEach(async () => {
    registered.forEach((key) => { delete MODULE_CLASSES[key]; });
    registered = [];
    tempDirs.forEach((dir) => {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch(ex) { /* gone */ }
    });
    tempDirs = [];
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
  });

  /** The fixture with unique registry keys, since a registration cannot be undone. */
  function fixture(): string {
    let dir = fs.mkdtempSync(path.join(os.tmpdir(), "powfaucet-module-"));
    tempDirs.push(dir);
    fs.cpSync(FIXTURE, dir, { recursive: true });
    let manifest = JSON.parse(fs.readFileSync(path.join(dir, "module.json"), "utf8"));
    manifest.modules = { "echo-browser": "EchoModule" };
    manifest.workers = { "echo-worker-browser": "EchoWorker" };
    fs.writeFileSync(path.join(dir, "module.json"), JSON.stringify(manifest));
    registered.push("echo-browser");
    return dir;
  }

  it("runs the module script with the sdk up and before the first render", async function() {
    if(skipReason)
      return this.skip();

    await ServiceManager.GetService(ModuleLoader).loadAll(os.tmpdir(), [fixture()]);
    await ServiceManager.GetService(ModuleManager).initialize();
    let server = ServiceManager.GetService(FaucetHttpServer);
    server.initialize();

    let page = await browser.newPage();
    let pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push("" + err));
    try {
      await page.goto("http://127.0.0.1:" + server.getListenPort() + "/", { waitUntil: "load" });
      await page.waitForFunction(() => !!(window as any).__echoModuleLoaded, null, { timeout: 30000 });

      let seen = await page.evaluate(() => (window as any).__echoModuleLoaded);
      expect(seen.error).to.equal(null, "the module script failed: " + seen.error);
      expect(seen.sawSdk).to.equal(true, "window.PoWFaucet was not there when the module ran");
      expect(seen.apiVersion).to.equal(1, "the client sdk reports a different module api version");
      expect(typeof seen.version).to.equal("string", "the sdk does not report a client version");
      // the point of the whole arrangement
      expect(seen.renderedBeforeMe).to.equal(false,
        "the faucet had already rendered when the module script ran - a view registered here " +
        "would have been registered too late");
      expect(seen.registered).to.equal(true, "the module's registration did not take");
      expect(seen.singletons?.ok).to.equal(true,
        "checkSingletons called with the faucet's own instances should report them clean, got " +
        JSON.stringify(seen.singletons));

      // and it does render afterwards; the wait must not have swallowed the boot
      await page.waitForFunction(() => !!(window as any).PoWFaucet.page, null, { timeout: 30000 });
      // What survives the first render is now the *slots*: the core has no view of its own
      // registry to look in any more, and a module's own bundle owns
      // whatever it registered with itself.
      let stillRegistered = await page.evaluate(
        () => (window as any).PoWFaucet.ui.getPanels("mining").length > 0);
      expect(stillRegistered).to.equal(true,
        "the panel the module registered did not survive the first render");

      /**
       * ...and the slots it filled.
       *
       * The core page offers `registerPanel` and `registerRoute` and renders
       * whatever is in them; a module uses the same two calls. This
       * case is the one that proves the surface with nothing registered, which is
       * the whole reason the fixture exists.
       */
      expect(seen.panels).to.be.greaterThan(0, "registerPanel did not take");
      expect(seen.routes).to.include("/echodev", "registerRoute did not take");
      expect(seen.devFlag).to.equal(false,
        "the page reported dev mode without a dev query parameter, so a {dev: true} route would" +
        " be mounted for a player");

      /**
       * The routes it registered, rendered by the core page.
       *
       * Navigated **inside the document**: the faucet injects a plugin's script
       * into the page it serves, so a fresh `goto` is a fresh page whose plugin
       * has to load again, and this case is about what the page does with what is
       * already registered. A hash change is what a player's click on a link
       * would be anyway.
       */
      await page.evaluate(() => { location.hash = "/echoplain"; });
      await page.waitForSelector(".echo-plugin-plain", { timeout: 15000 });

      // ...and a `{dev: true}` route only for a developer: not without the flag,
      await page.evaluate(() => { location.hash = "/echodev"; });
      let withoutFlag = await page.waitForSelector(".echo-plugin-route", { timeout: 4000 })
        .then(() => true).catch(() => false);
      expect(withoutFlag).to.equal(false,
        "a {dev: true} route rendered for a page with no dev flag - that route is a developer's" +
        " entry and a player must not reach it");

      // ...and with it, in the place the faucet's own dev URLs put it: after the
      // hash, because the page is a HashRouter and that is where its parameters
      // have always lived (`/#/route?dev=1`).
      await page.evaluate(() => { location.hash = "/echodev?dev=1"; });
      await page.waitForSelector(".echo-plugin-route", { timeout: 15000 });
      let mounted = await page.evaluate(() => !!document.querySelector(".echo-plugin-route"));
      expect(mounted).to.equal(true, "a registered dev route did not render with ?dev=1");
    } finally {
      await page.close();
    }
  });
  /**
   * The module SDK is on the page, and it is what the .d.ts says it is.
   *
   * A module declares React and ReactDOM as externals and takes them from
   * here; anything missing or renamed breaks every module at once, silently, in the browser. Cheap
   * to check, so it is checked (QUERY_P1_CORE_SDK step 3). `src/sdk/sdk.ts` is the surface - there
   * is no second declaration of it to drift from.
   *
   * It lived in an earlier browser spec until the inventory's split: it is
   * about the module surface and not about what a module's client draws, and it needs none at all
   * - which is why it can run against this file's own faucet, with no engine behind it.
   */
  it("publishes the module SDK on window.PoWFaucet", async function() {
    if(skipReason)
      return this.skip();

    await ServiceManager.GetService(ModuleManager).initialize();
    let server = ServiceManager.GetService(FaucetHttpServer);
    server.initialize();

    let page = await browser.newPage();
    try {
      // the SDK is published by the client bundle itself; no module session, nothing to
      // join - which is the point of checking it here
      await page.goto("http://127.0.0.1:" + server.getListenPort() + "/",
                      { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => !!(window as any).PoWFaucet, null, { timeout: 20000 });

      let sdk = await page.evaluate(() => {
        let it = (window as any).PoWFaucet;
        let report = it.checkSingletons ? it.checkSingletons({ React: {} }) : null;
        return {
          apiVersion: it.apiVersion,
          version: typeof it.version,
          react: typeof it.React,
          reactDom: typeof it.ReactDOM,
          ui: typeof it.ui,
          registerPanel: typeof (it.ui || {}).registerPanel,
          registerRoute: typeof (it.ui || {}).registerRoute,
          common: typeof it.common,
          types: typeof it.types,
          checkSingletons: typeof it.checkSingletons,
          cleanReport: it.checkSingletons ? it.checkSingletons() : null,
          copyReport: report,
        };
      }) as any;

      let wanted: Record<string, string> = {
        // React's default export is the namespace object, not a function: this is what the module
        // gets, so this is what is checked.
        version: "string", react: "object", reactDom: "object",
        ui: "object", registerPanel: "function", registerRoute: "function",
        common: "object", types: "object", checkSingletons: "function",
      };
      let missing = Object.keys(wanted).filter((key) => sdk[key] !== wanted[key]);
      if(missing.length > 0)
        throw new Error("the SDK global is not what src/sdk/sdk.ts describes: " +
          missing.map((key) => key + " is " + sdk[key] + ", wanted " + wanted[key]).join(", "));
      if(sdk.apiVersion !== 1)
        throw new Error("apiVersion is " + sdk.apiVersion + ", not 1");
      if(!sdk.cleanReport || sdk.cleanReport.ok !== true)
        throw new Error("checkSingletons() complains about the faucet's own singletons: " +
          JSON.stringify(sdk.cleanReport));
      if(!sdk.copyReport || sdk.copyReport.ok !== false ||
         sdk.copyReport.duplicated.indexOf("React") < 0)
        throw new Error("checkSingletons() did not notice a second React: " +
          JSON.stringify(sdk.copyReport));

      console.log("      SDK: apiVersion " + sdk.apiVersion + ", ui.registerPanel present," +
        " singleton check catches a duplicate React");
    } finally {
      await page.close();
    }
  });
});
