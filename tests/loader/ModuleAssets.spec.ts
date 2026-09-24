import 'mocha';
import * as fs from 'node:fs';
import * as http from 'node:http';
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
import { FaucetWebApi } from '../../src/webserv/FaucetWebApi.js';
import { ModuleLoader } from '../../src/loader/ModuleLoader.js';

/**
 * A module's client half, over a real socket.
 *
 * The traversal case is the reason this is a test rather than a read-through: a module
 * directory is operator-supplied, `/modules/<name>/` is a public url, and `..` in a url is
 * the oldest trick there is. The fixture keeps a file outside `client/` precisely so the
 * test can try to fetch it.
 */
describe("module client assets", () => {
  let globalStubs;
  let tempDirs: string[] = [];
  let registered: string[] = [];
  let keySeq = 0;
  const FIXTURE = path.resolve("tests/fixtures/echo");

  beforeEach(async () => {
    globalStubs = bindTestStubs();
    loadDefaultTestConfig();
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
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
  function fixture(extra?: Record<string, any>): string {
    let suffix = "-a" + (++keySeq);
    let dir = fs.mkdtempSync(path.join(os.tmpdir(), "powfaucet-module-"));
    tempDirs.push(dir);
    fs.cpSync(FIXTURE, dir, { recursive: true });
    let manifest = JSON.parse(fs.readFileSync(path.join(dir, "module.json"), "utf8"));
    manifest.modules = { ["echo" + suffix]: "EchoModule" };
    manifest.workers = { ["echo-worker" + suffix]: "EchoWorker" };
    if(extra)
      Object.assign(manifest, extra);
    fs.writeFileSync(path.join(dir, "module.json"), JSON.stringify(manifest));
    registered.push("echo" + suffix);
    return dir;
  }

  function get(port: number, url: string,
               headers: any = {}): Promise<{status: number, headers: any, body: string, raw: Buffer}> {
    return request(port, "GET", url, headers);
  }

  function request(port: number, method: string, url: string,
                   headers: any = {}): Promise<{status: number, headers: any, body: string, raw: Buffer}> {
    return new Promise((resolve, reject) => {
      let req = http.request({ host: "127.0.0.1", port: port, path: url, method: method,
                               headers: headers }, (rsp) => {
        let chunks: Buffer[] = [];
        rsp.on("data", (chunk) => chunks.push(chunk));
        rsp.on("end", () => {
          let raw = Buffer.concat(chunks);
          resolve({ status: rsp.statusCode, headers: rsp.headers, body: raw.toString("utf8"), raw: raw });
        });
      });
      req.on("error", reject);
      req.end();
    });
  }

  async function serveWithModule(extra?: Record<string, any>): Promise<number> {
    await ServiceManager.GetService(ModuleLoader).loadAll(os.tmpdir(), [fixture(extra)]);
    await ServiceManager.GetService(ModuleManager).initialize();
    let server = ServiceManager.GetService(FaucetHttpServer);
    server.initialize();
    return server.getListenPort();
  }

  /**
   * The isolation headers, on a module's assets as much as on the page.
   *
   * This is not a header-tidiness case. With `crossOriginIsolation: "credentialless"` - which a
   * module needs for `SharedArrayBuffer` - Chrome refuses a *worker script* that does not carry
   * them (`ERR_BLOCKED_BY_RESPONSE`), so the module never starts and nothing else in the page
   * fails: there is no error to trace back to a missing response header. This route was the only
   * one in the server that skipped them, and it was diagnosed from scratch twice before it was
   * found.
   *
   * Asserted against `/js/`'s own response rather than against two literals, because the claim is
   * that a module's asset is treated like the faucet's own asset, and a change to the policy should
   * move both or fail here.
   */
  it("serves a module's assets with the same isolation headers as the faucet's own", async () => {
    faucetConfig.crossOriginIsolation = "credentialless";
    // a static root of our own with one file in it, so the comparison is against a real 200 from the
    // faucet's own asset route: pointing at the repository's `static/` would compare against a 404
    // on a machine that has not built the client, and a 404 carries no headers to compare
    let staticDir = fs.mkdtempSync(path.join(os.tmpdir(), "powfaucet-static-"));
    tempDirs.push(staticDir);
    fs.mkdirSync(path.join(staticDir, "js"));
    fs.writeFileSync(path.join(staticDir, "js", "reference.js"), "// the faucet's own asset\n");
    faucetConfig.staticPath = staticDir;

    let port = await serveWithModule();

    let mod = await get(port, "/modules/echo/module.js");
    expect(mod.status).to.equal(200, "the module script was not served");
    expect(mod.headers["cross-origin-embedder-policy"]).to.equal("credentialless",
      "a module's asset is not isolated: a worker script served like this is blocked outright");
    expect(mod.headers["cross-origin-opener-policy"]).to.equal("same-origin", "COOP missing");

    let own = await get(port, "/js/reference.js");
    expect(own.status).to.equal(200, "the reference asset was not served, so there is nothing to compare");
    expect(mod.headers["cross-origin-embedder-policy"]).to.equal(own.headers["cross-origin-embedder-policy"],
      "COEP differs from the faucet's own assets");
    expect(mod.headers["cross-origin-opener-policy"]).to.equal(own.headers["cross-origin-opener-policy"],
      "COOP differs from the faucet's own assets");
  });

  it("leaves the headers off when isolation is off", async () => {
    faucetConfig.crossOriginIsolation = "off";
    let port = await serveWithModule();
    let rsp = await get(port, "/modules/echo/module.js");
    expect(rsp.status).to.equal(200, "the module script was not served");
    expect(rsp.headers["cross-origin-embedder-policy"]).to.equal(undefined,
      "an unisolated faucet must not isolate a module's assets either");
  });

  it("serves a module's client file", async () => {
    let port = await serveWithModule();
    let rsp = await get(port, "/modules/echo/module.js");
    expect(rsp.status).to.equal(200, "the module script was not served");
    expect(rsp.body).to.contain("__echoModuleLoaded", "wrong file");
    expect(rsp.headers["content-type"]).to.equal("application/javascript", "wrong content type");
  });

  /**
   * Everything under `client/`, not only what the manifest names.
   *
   * A module's page fetches files the manifest never mentions: webpack's split chunks by their
   * hashed names, and a wasm by `<name>.<version>.wasm`, where the version comes from the module's
   * own binary at run time. The first module ship broke on exactly this - the client asked for a
   * wasm and got a 404, so the simulation never started and every join timed out - so the rule is
   * asserted here rather than left to the manifest.
   */
  it("serves a chunk and a wasm the manifest never names", async () => {
    let port = await serveWithModule();

    let chunk = await get(port, "/modules/echo/742.module.js?v=1.0.0");
    expect(chunk.status).to.equal(200, "a webpack chunk is fetched by name and must be served");
    expect(chunk.body).to.contain("__echoChunkLoaded", "wrong file");
    expect(chunk.headers["content-type"]).to.equal("application/javascript", "wrong content type");

    let wasm = await get(port, "/modules/echo/echo-sim.wasm?v=1.0.0");
    expect(wasm.status).to.equal(200, "a module's wasm must be served or its client cannot start");
    expect(wasm.headers["content-type"]).to.equal("application/wasm",
      "a wasm served as anything else is refused by the browser's streaming compiler");
    expect(wasm.raw.subarray(0, 4).toString("latin1")).to.equal("\u0000asm", "that is not a wasm module");
  });

  /**
   * And the compressed sibling, because the simulation is the largest thing the page fetches.
   *
   * A module's package step writes `.gz` and `.br` beside the wasm; the faucet serves whichever the
   * client accepts, with the file's own content type - an encoding is what the body is wrapped in,
   * not what it is. Asking for the sibling *directly* is refused, or a cache would store a
   * br-encoded body under a name that promises a plain one.
   */
  it("hands over a precompressed sibling, and refuses one asked for by name", async () => {
    let port = await serveWithModule();

    let brotli = await get(port, "/modules/echo/echo-sim.wasm?v=1.0.0", { "accept-encoding": "br" });
    expect(brotli.status).to.equal(200);
    expect(brotli.headers["content-encoding"]).to.equal("br", "the .br sibling was not used");
    expect(brotli.headers["content-type"]).to.equal("application/wasm", "the type must stay the file's own");
    expect(brotli.headers["vary"]).to.equal("Accept-Encoding",
      "without Vary a cache can hand this body to a client that cannot read it");

    let plain = await get(port, "/modules/echo/echo-sim.wasm?v=1.0.0", { "accept-encoding": "identity" });
    expect(plain.status).to.equal(200);
    expect(plain.headers["content-encoding"]).to.equal(undefined, "a client that took no encoding got one");

    let direct = await get(port, "/modules/echo/echo-sim.wasm.br?v=1.0.0");
    expect(direct.status).to.equal(404, "the sibling must not be addressable under its own name");
  });

  /**
   * The rest of what the faucet's static tree used to do for a wasm, now that only a module has one.
   *
   * These came from `FaucetHttpServer.spec`'s `precompressed wasm delivery`, which served a wasm out of
   * `static/js` with its siblings. The faucet builds no wasm and must hold no module's asset
   * in its own tree, so the behaviour - and these cases - belong here.
   */
  it("takes gzip when that is all the client can read", async () => {
    let port = await serveWithModule();
    let rsp = await get(port, "/modules/echo/echo-sim.wasm?v=1.0.0", { "accept-encoding": "gzip" });
    expect(rsp.status).to.equal(200);
    expect(rsp.headers["content-encoding"]).to.equal("gzip", "the .gz sibling was not used");
    expect(rsp.headers["content-type"]).to.equal("application/wasm");
  });

  it("honours a q=0 refusal", async () => {
    let port = await serveWithModule();
    // "br;q=0" is a refusal, not an offer - a client that says so and gets brotli anyway cannot
    // decode the body it was sent
    let rsp = await get(port, "/modules/echo/echo-sim.wasm?v=1.0.0", { "accept-encoding": "br;q=0, gzip" });
    expect(rsp.status).to.equal(200);
    expect(rsp.headers["content-encoding"]).to.equal("gzip", "a refused encoding was used anyway");
  });

  it("serves the plain file when the module shipped no sibling", async () => {
    let port = await serveWithModule();
    let rsp = await get(port, "/modules/echo/module.js?v=1.0.0", { "accept-encoding": "br, gzip" });
    expect(rsp.status).to.equal(200);
    expect(rsp.headers["content-encoding"]).to.equal(undefined,
      "there is no sibling for this one, so nothing may claim an encoding");
    expect(rsp.headers["vary"]).to.equal("Accept-Encoding",
      "Vary is set either way, or a cache can serve this body to a client that asked differently");
  });

  /**
   * A HEAD has to take the same branch a GET takes.
   *
   * The point of a HEAD on an asset this size is to learn its encoding and length without pulling it,
   * so a HEAD that skips the sibling lookup reports the plain length for a body the GET would send
   * compressed - and a client that trusts it truncates.
   */
  it("answers HEAD the way it would answer GET", async () => {
    let port = await serveWithModule();
    let get200 = await get(port, "/modules/echo/echo-sim.wasm?v=1.0.0", { "accept-encoding": "br" });
    let head = await request(port, "HEAD", "/modules/echo/echo-sim.wasm?v=1.0.0", { "accept-encoding": "br" });
    expect(head.status).to.equal(200, "HEAD status");
    expect(head.body.length).to.equal(0, "HEAD returned a body");
    expect(head.headers["content-encoding"]).to.equal(get200.headers["content-encoding"],
      "HEAD did not report the encoding the GET used");
    expect(head.headers["content-length"]).to.equal(get200.headers["content-length"],
      "HEAD must report the length a GET would send");
    expect(head.headers["content-type"]).to.equal(get200.headers["content-type"]);
    expect(head.headers["vary"]).to.equal("Accept-Encoding");
  });

  it("caches only what carries a version", async () => {
    let port = await serveWithModule();

    let bare = await get(port, "/modules/echo/module.css");
    expect(bare.headers["cache-control"]).to.equal("no-cache",
      "an unversioned url says nothing about which build it is, so it must not be cached");

    let versioned = await get(port, "/modules/echo/module.css?v=1.0.0");
    expect(versioned.headers["cache-control"]).to.equal("public, max-age=31536000, immutable",
      "a versioned url is the cache key; it should be immutable");
    expect(versioned.headers["content-type"]).to.equal("text/css", "wrong content type");
  });

  /**
   * The one that matters. `/modules/echo/../secret.txt` and its encoded form must not
   * reach a file outside the module's `client/` directory.
   */
  it("refuses to walk out of the module's client directory", async () => {
    let port = await serveWithModule();

    for(let attempt of ["/modules/echo/../secret.txt", "/modules/echo/%2e%2e/secret.txt",
                        "/modules/echo/client/../../secret.txt"]) {
      let rsp = await get(port, attempt);
      expect(rsp.body).to.not.contain("SECRET", "served a file outside client/ for " + attempt);
      expect(rsp.status).to.not.equal(200, attempt + " reached something it should not have");
    }
  });

  it("an unknown module name falls through rather than serving anything", async () => {
    let port = await serveWithModule();
    let rsp = await get(port, "/modules/not-a-module/module.js");
    expect(rsp.status).to.not.equal(200, "a name no module registered must not resolve");
  });

  it("the client config lists the module and its assets", async () => {
    await serveWithModule();
    let config = ServiceManager.GetService(FaucetWebApi).onGetFaucetConfig();
    // `modulePackages`, not `modules`: the same payload carries the per-module *config* under
    // `modules`, and the two cannot share a key (PLAN_MODULE_SPLIT ss.2).
    expect(Array.isArray(config.modulePackages)).to.equal(true,
      "no modulePackages array in the client config");
    let echo = config.modulePackages.find((entry) => entry.name === "echo");
    expect(!!echo).to.equal(true, "the loaded module is not in the client config");
    expect(echo.version).to.equal("1.0.0", "version mismatch - it is the cache key");
    // and what the package says it was built as, when it says anything: the only way a client that
    // will be *refused* for not matching a module's build can ask what that build is first. The
    // fixture's manifest carries none, so the field is absent rather than invented.
    expect("build" in echo ? echo.build : undefined).to.equal(undefined,
      "a build was published for a package that declares none");
    // a url the client can fetch, not the manifest's on-disk path
    expect(echo.script).to.equal("/modules/echo/module.js?v=1.0.0", "script url mismatch");
    expect(echo.css).to.equal("/modules/echo/module.css?v=1.0.0", "css url mismatch");

    // and it really is fetchable, cached, and the right file - the point of publishing it
    let port = ServiceManager.GetService(FaucetHttpServer).getListenPort();
    let fetched = await get(port, echo.script);
    expect(fetched.status).to.equal(200, "the url the config publishes does not resolve");
    expect(fetched.body).to.contain("__echoModuleLoaded", "it resolves to the wrong file");
    expect(fetched.headers["cache-control"]).to.contain("immutable",
      "the published url carries ?v= so it should come back immutable");
  });

  it("puts the module's tags into the index page", async () => {
    let port = await serveWithModule();
    let index = await get(port, "/");
    expect(index.status).to.equal(200, "the index page was not served");

    // deferred, not async: deferred scripts run in document order and before
    // DOMContentLoaded, which is what the client waits for before its first render
    expect(index.body).to.contain('<script defer src="/modules/echo/module.js?v=1.0.0"></script>',
      "the module script is not in the index page");
    expect(index.body).to.contain('href="/modules/echo/module.css?v=1.0.0"',
      "the module stylesheet is not in the index page");
    expect(index.body.indexOf("/modules/echo/module.css")).to.be.lessThan(index.body.indexOf("</head>"),
      "the stylesheet belongs in <head>, before the page is drawn");
    expect(index.body.indexOf("/js/powfaucet.js")).to.be.lessThan(index.body.indexOf("/modules/echo/module.js"),
      "a module reads the sdk off the global, so the faucet bundle has to come first");
  });

  it("leaves the index page alone when no module ships a client half", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let server = ServiceManager.GetService(FaucetHttpServer);
    server.initialize();
    let index = await get(server.getListenPort(), "/");
    expect(index.status).to.equal(200, "the index page was not served");
    expect(index.body).to.not.contain("/modules/", "nothing should have been injected");
  });
});
