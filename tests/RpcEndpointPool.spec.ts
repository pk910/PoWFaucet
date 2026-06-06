import 'mocha';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, awaitSleepPromise } from './common.js';
import { ServiceManager } from '../src/common/ServiceManager.js';
import { FaucetProcess } from '../src/common/FaucetProcess.js';
import { faucetConfig } from '../src/config/FaucetConfig.js';
import { FakeProvider } from './stubs/FakeProvider.js';
import { RpcEndpointPool, RpcEndpointState, IRpcEndpointStatus } from '../src/eth/RpcEndpointPool.js';

// Internal access shim — these tests intentionally exercise private methods to
// keep coverage tight without spinning up the full EthWalletManager pipeline.
type AnyPool = any;

describe("RPC Endpoint Pool", () => {
  let globalStubs;

  beforeEach(() => {
    globalStubs = bindTestStubs();
    loadDefaultTestConfig();
    ServiceManager.GetService(FaucetProcess).hideLogOutput = true;
  });

  afterEach(async () => {
    await unbindTestStubs(globalStubs);
  });

  describe("config normalization", () => {
    it("returns [] for null/undefined", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      expect(pool.normalizeConfig(null)).to.deep.equal([]);
      expect(pool.normalizeConfig(undefined)).to.deep.equal([]);
    });

    it("normalizes a single string URL", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const result = pool.normalizeConfig("http://localhost:8545");
      expect(result).to.have.length(1);
      expect(result[0]).to.deep.equal({ url: "http://localhost:8545", priority: 1, metered: false });
    });

    it("normalizes a list of mixed strings and endpoint objects", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const result = pool.normalizeConfig([
        "http://a/",
        { url: "http://b/", priority: 5, metered: true, name: "primary" },
        { url: "http://c/" },
      ]);
      expect(result).to.have.length(3);
      expect(result[0]).to.deep.equal({ url: "http://a/", priority: 1, metered: false });
      expect(result[1]).to.deep.equal({ url: "http://b/", name: "primary", priority: 5, metered: true });
      expect(result[2]).to.deep.equal({ url: "http://c/", name: undefined, priority: 1, metered: false });
    });

    it("treats a non-array object without `url` as a pre-built provider", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const fp = new FakeProvider();
      const result = pool.normalizeConfig(fp);
      expect(result).to.have.length(1);
      expect(result[0].url).to.equal(fp);
    });

    it("ignores nullish array entries", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const result = pool.normalizeConfig([null, undefined, "http://a/"]);
      expect(result).to.have.length(1);
      expect(result[0].url).to.equal("http://a/");
    });

    it("ignores empty string name (falls through to URL label)", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const item = pool.normalizeItem({ url: "http://x/", name: "" });
      expect(item.name).to.equal(undefined);
    });

    it("returns null for unsupported items (numbers, false)", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      expect(pool.normalizeItem(42)).to.equal(null);
      expect(pool.normalizeItem(false)).to.equal(null);
    });
  });

  describe("URL sanitization", () => {
    it("returns the URL unchanged when no secrets are present", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const url = "https://rpc.example.com/eth/main";
      expect(pool.sanitizeUrl(url)).to.equal(url);
    });

    it("strips userinfo (user:pass@) from URL", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const result = pool.sanitizeUrl("https://alice:hunter2@rpc.example.com/path");
      expect(result).to.not.contain("alice");
      expect(result).to.not.contain("hunter2");
      expect(result).to.contain("rpc.example.com/path");
    });

    it("redacts long path segments that look like API keys", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const result = pool.sanitizeUrl("https://eth-mainnet.g.alchemy.com/v2/AlchemyAPIKey1234567890abcdef");
      expect(result).to.contain("v2");
      // URL constructor percent-encodes the angle brackets in the rebuilt URL.
      expect(result).to.match(/<redacted>|%3Credacted%3E/);
      expect(result).to.not.contain("AlchemyAPIKey1234567890abcdef");
    });

    it("redacts secret-bearing query parameters by name", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const result = pool.sanitizeUrl("https://rpc.example.com/?apiKey=short&other=safe");
      expect(result).to.contain("apiKey=%3Credacted%3E");
      expect(result).to.contain("other=safe");
    });

    it("redacts query parameters whose value looks like a secret regardless of key", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const result = pool.sanitizeUrl("https://rpc.example.com/?something=AlchemyAPIKey1234567890abcdef");
      expect(result).to.contain("something=%3Credacted%3E");
    });

    it("returns non-URL strings unchanged", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      expect(pool.sanitizeUrl("not a url")).to.equal("not a url");
    });

    it("sanitizePath returns empty/root paths unchanged", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      expect(pool.sanitizePath("")).to.equal("");
      expect(pool.sanitizePath("/")).to.equal("/");
    });

    it("sanitizeUrl catches URL parse errors and returns input as-is", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      // The Node URL constructor accepts most strings; force a parse failure
      // by handing in something that will throw on toString during URL serialization.
      const broken: any = { toString: () => { throw new Error("broken"); } };
      expect(pool.sanitizeUrl(broken)).to.equal(broken);
    });

    it("looksLikeSecret rejects short or non-opaque strings", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      expect(pool.looksLikeSecret("")).to.equal(false);
      expect(pool.looksLikeSecret("short")).to.equal(false);
      expect(pool.looksLikeSecret("path-with-dots.in.it")).to.equal(false);
      expect(pool.looksLikeSecret("AlchemyAPIKey1234567890abcdef")).to.equal(true);
    });

    it("sanitizes URLs embedded in error messages", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const msg = "fetch failed for https://alice:hunter2@rpc.example.com/v3/SomeApiKey1234567890";
      const result = pool.sanitizeErrorMessage(msg);
      expect(result).to.not.contain("alice");
      expect(result).to.not.contain("hunter2");
      expect(result).to.not.contain("SomeApiKey1234567890");
      // URL constructor percent-encodes the angle brackets in the rebuilt URL.
      expect(result).to.match(/<redacted>|%3Credacted%3E/);
    });

    it("sanitizeErrorMessage handles empty input", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      expect(pool.sanitizeErrorMessage("")).to.equal("");
      expect(pool.sanitizeErrorMessage(null as any)).to.equal(null);
    });

    it("errorString handles strings, Errors and falsy values", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      expect(pool.errorString(null)).to.equal("");
      expect(pool.errorString("plain")).to.equal("plain");
      expect(pool.errorString(new Error("boom https://user:pw@ex.com/"))).to.contain("ex.com");
      expect(pool.errorString({ toString() { return "objErr"; } })).to.equal("objErr");
    });
  });

  describe("auth header extraction", () => {
    it("returns clean URL and Basic auth header for user:pass URL", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const { cleanUrl, headers } = pool.extractAuth("https://alice:hunter2@rpc.example.com/p");
      expect(cleanUrl).to.not.contain("alice");
      expect(cleanUrl).to.contain("rpc.example.com/p");
      expect(headers.Authorization).to.equal("Basic " + Buffer.from("alice:hunter2").toString("base64"));
    });

    it("returns no headers for URL without auth", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const { headers } = pool.extractAuth("https://rpc.example.com/");
      expect(headers).to.deep.equal({});
    });

    it("returns the original URL when not parseable", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const { cleanUrl, headers } = pool.extractAuth("not a url");
      expect(cleanUrl).to.equal("not a url");
      expect(headers).to.deep.equal({});
    });

    it("decodes percent-encoded auth values", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const { headers } = pool.extractAuth("https://alice:p%40ss@rpc.example.com/");
      expect(headers.Authorization).to.equal("Basic " + Buffer.from("alice:p@ss").toString("base64"));
    });
  });

  describe("provider construction", () => {
    it("returns the input untouched when given a pre-built provider", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const fp = new FakeProvider();
      expect(pool.makeProvider(fp)).to.equal(fp);
    });

    it("creates an HttpProvider for http(s) URLs", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const provider = pool.makeProvider("http://localhost:8545");
      expect(provider.constructor.name).to.equal("HttpProvider");
    });

    it("attaches Authorization headers when URL has userinfo", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const provider = pool.makeProvider("http://u:p@localhost:8545");
      // HttpProvider stores options privately, but we can grab them via field name
      const opts = (provider as any).httpProviderOptions;
      expect(opts?.providerOptions?.headers?.Authorization).to.contain("Basic");
    });

    it("creates a WebSocketProvider for ws:// URLs", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const provider = pool.makeProvider("ws://localhost:8546");
      expect(provider.constructor.name).to.match(/WebSocketProvider|WebsocketProvider/);
      // close immediately so the WS reconnect timer doesn't keep the test alive
      try { provider.disconnect?.(); } catch (_) { /* ignore */ }
    });

    it("routes absolute path URLs to the IPC provider class", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      // IpcProvider validates its URL on construction. A bogus absolute path
      // should reach the IPC code path (the error mentions "Client URL" + "invalid"),
      // not the HTTP/WS code paths (which would 404 / handshake instead).
      let err: any;
      try { pool.makeProvider("/definitely/not/a/socket"); }
      catch (ex) { err = ex; }
      expect(err).to.exist;
      expect(err.toString().toLowerCase()).to.match(/client url|invalid/);
    });
  });

  describe("instrumentation (request counting)", () => {
    it("increments requestCount on each provider.request call", async () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const fp = new FakeProvider();
      fp.injectResponse("eth_blockNumber", "0x10");
      pool.endpoints = [pool.createEndpoint({ url: fp, priority: 1, metered: false })];
      const ep = pool.endpoints[0];
      expect(ep.requestCount).to.equal(0);
      await ep.web3.eth.getBlockNumber();
      expect(ep.requestCount).to.equal(1);
      await ep.web3.eth.getBlockNumber();
      expect(ep.requestCount).to.equal(2);
    });

    it("does not double-wrap an already-instrumented provider", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const fp = new FakeProvider();
      const ep = pool.createEndpoint({ url: fp, priority: 1, metered: false });
      const wrappedRequest = ep.provider.request;
      pool.instrumentProvider(ep); // should be a no-op
      expect(ep.provider.request).to.equal(wrappedRequest);
    });

    it("uses configured name as label, falling back to sanitized URL otherwise", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const epNamed = pool.createEndpoint({ url: "https://alice:pw@rpc.example.com/", name: "my-rpc", priority: 1, metered: false });
      expect(epNamed.label).to.equal("my-rpc");
      const epUnnamed = pool.createEndpoint({ url: "https://alice:pw@rpc.example.com/", priority: 1, metered: false });
      expect(epUnnamed.label).to.not.contain("alice");
    });
  });

  describe("monitoring + readiness", () => {
    it("marks endpoint online and records block height on successful check", async () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const fp = new FakeProvider();
      fp.injectResponse("eth_blockNumber", "0x100");
      pool.endpoints = [pool.createEndpoint({ url: fp, priority: 1, metered: false })];
      await pool.checkEndpoint(pool.endpoints[0]);
      expect(pool.endpoints[0].online).to.equal(true);
      expect(pool.endpoints[0].blockHeight).to.equal(256);
      expect(pool.endpoints[0].lastError).to.equal(undefined);
    });

    it("marks endpoint offline and records lastError on failure", async () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const fp = new FakeProvider();
      fp.injectResponse("eth_blockNumber", () => { throw "rpc kaput"; });
      pool.endpoints = [pool.createEndpoint({ url: fp, priority: 1, metered: false })];
      await pool.checkEndpoint(pool.endpoints[0]);
      expect(pool.endpoints[0].online).to.equal(false);
      expect(pool.endpoints[0].lastError).to.contain("kaput");
    });

    it("transitions online → offline → online and logs both transitions", async () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const fp = new FakeProvider();
      let mode: "ok" | "fail" = "ok";
      fp.injectResponse("eth_blockNumber", () => { if (mode === "fail") throw "down"; return "0x10"; });
      pool.endpoints = [pool.createEndpoint({ url: fp, priority: 1, metered: false })];
      await pool.checkEndpoint(pool.endpoints[0]);
      expect(pool.endpoints[0].online).to.equal(true);
      mode = "fail";
      await pool.checkEndpoint(pool.endpoints[0]);
      expect(pool.endpoints[0].online).to.equal(false);
      mode = "ok";
      await pool.checkEndpoint(pool.endpoints[0]);
      expect(pool.endpoints[0].online).to.equal(true);
    });

    it("marks endpoints lagging behind the head as block-lag offline", async () => {
      faucetConfig.ethRpcMaxBlockHeightDiff = 5;
      const pool = new RpcEndpointPool() as AnyPool;
      const fpFast = new FakeProvider();
      const fpSlow = new FakeProvider();
      fpFast.injectResponse("eth_blockNumber", "0x64"); // 100
      fpSlow.injectResponse("eth_blockNumber", "0x32"); // 50
      pool.endpoints = [
        pool.createEndpoint({ url: fpFast, priority: 1, metered: false }),
        pool.createEndpoint({ url: fpSlow, priority: 1, metered: false }),
      ];
      await pool.checkEndpoint(pool.endpoints[0]);
      await pool.checkEndpoint(pool.endpoints[1]);
      expect(pool.endpoints[0].blockLagOffline).to.equal(false);
      expect(pool.endpoints[1].blockLagOffline).to.equal(true);
    });

    it("clears block-lag flag when the slow endpoint catches up", async () => {
      faucetConfig.ethRpcMaxBlockHeightDiff = 5;
      const pool = new RpcEndpointPool() as AnyPool;
      const fpFast = new FakeProvider();
      const fpSlow = new FakeProvider();
      let slowHeight = "0x32";
      fpFast.injectResponse("eth_blockNumber", "0x64");
      fpSlow.injectResponse("eth_blockNumber", () => slowHeight);
      pool.endpoints = [
        pool.createEndpoint({ url: fpFast, priority: 1, metered: false }),
        pool.createEndpoint({ url: fpSlow, priority: 1, metered: false }),
      ];
      await pool.checkEndpoint(pool.endpoints[0]);
      await pool.checkEndpoint(pool.endpoints[1]);
      expect(pool.endpoints[1].blockLagOffline).to.equal(true);
      slowHeight = "0x63"; // 99
      await pool.checkEndpoint(pool.endpoints[1]);
      expect(pool.endpoints[1].blockLagOffline).to.equal(false);
    });

    it("only re-checks metered endpoints after their longer interval elapses", async () => {
      faucetConfig.ethRpcMonitorInterval = 5;
      faucetConfig.ethRpcMonitorMeteredInterval = 3600;
      const pool = new RpcEndpointPool() as AnyPool;
      const fpHot = new FakeProvider();
      const fpMetered = new FakeProvider();
      fpHot.injectResponse("eth_blockNumber", "0x10");
      fpMetered.injectResponse("eth_blockNumber", "0x10");
      pool.endpoints = [
        pool.createEndpoint({ url: fpHot, priority: 1, metered: false }),
        pool.createEndpoint({ url: fpMetered, priority: 1, metered: true }),
      ];
      // Pretend both were checked one minute ago.
      const oneMinuteAgo = Math.floor(Date.now() / 1000) - 60;
      pool.endpoints[0].lastCheck = oneMinuteAgo;
      pool.endpoints[1].lastCheck = oneMinuteAgo;
      const hotBefore = pool.endpoints[0].requestCount;
      const meteredBefore = pool.endpoints[1].requestCount;
      await pool.runMonitorTick();
      // Wait one tick for the fire-and-forget checkEndpoint to settle.
      await awaitSleepPromise(50, () => false);
      expect(pool.endpoints[0].requestCount).to.equal(hotBefore + 1, "hot endpoint should be polled");
      expect(pool.endpoints[1].requestCount).to.equal(meteredBefore, "metered endpoint should NOT be polled yet");
    });
  });

  describe("getReadyEndpoints / getActiveWeb3 / getStatusList", () => {
    function makePool(): { pool: AnyPool, eps: RpcEndpointState[], providers: FakeProvider[] } {
      const pool = new RpcEndpointPool() as AnyPool;
      const providers = [new FakeProvider(), new FakeProvider(), new FakeProvider()];
      providers.forEach((p) => p.injectResponse("eth_blockNumber", "0x10"));
      pool.endpoints = [
        pool.createEndpoint({ url: providers[0], name: "low", priority: 1, metered: false }),
        pool.createEndpoint({ url: providers[1], name: "high", priority: 10, metered: false }),
        pool.createEndpoint({ url: providers[2], name: "mid", priority: 5, metered: true }),
      ];
      return { pool, eps: pool.endpoints, providers };
    }

    it("getReadyEndpoints returns only ready endpoints sorted by priority desc", () => {
      const { pool, eps } = makePool();
      eps.forEach((ep) => { ep.online = true; });
      eps[2].blockLagOffline = true; // mid lagging
      const ready = pool.getReadyEndpoints();
      expect(ready.map((ep) => ep.label)).to.deep.equal(["high", "low"]);
    });

    it("getActiveWeb3 falls back to the first endpoint if none are ready", () => {
      const { pool, eps } = makePool();
      // none online
      const active = pool.getActiveWeb3();
      expect(active).to.equal(eps[0].web3);
    });

    it("getActiveWeb3 returns null when there are no endpoints", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      pool.endpoints = [];
      expect(pool.getActiveWeb3()).to.equal(null);
    });

    it("hasReadyEndpoint reflects readiness", () => {
      const { pool, eps } = makePool();
      expect(pool.hasReadyEndpoint()).to.equal(false);
      eps[0].online = true;
      expect(pool.hasReadyEndpoint()).to.equal(true);
    });

    it("getStatusList orders ready > online-but-lagging > offline, then by priority", () => {
      const { pool, eps } = makePool();
      eps[0].online = true; // low - ready
      eps[1].online = true; eps[1].blockLagOffline = true; // high - lagging
      eps[2].online = false; // mid - offline
      const list = pool.getStatusList();
      expect(list[0].url).to.equal("low");
      expect(list[0].ready).to.equal(true);
      expect(list[1].url).to.equal("high");
      expect(list[1].online).to.equal(true);
      expect(list[1].blockLag).to.equal(true);
      expect(list[2].url).to.equal("mid");
      expect(list[2].online).to.equal(false);
    });

    it("getStatusList sorts by priority within a tier", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const a = new FakeProvider(), b = new FakeProvider();
      pool.endpoints = [
        pool.createEndpoint({ url: a, name: "a", priority: 1, metered: false }),
        pool.createEndpoint({ url: b, name: "b", priority: 9, metered: false }),
      ];
      pool.endpoints.forEach((ep) => { ep.online = true; });
      const list = pool.getStatusList();
      expect(list.map((x) => x.url)).to.deep.equal(["b", "a"]);
    });

    it("getStatusList exposes the request counter and last error", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const fp = new FakeProvider();
      pool.endpoints = [pool.createEndpoint({ url: fp, name: "ep", priority: 1, metered: false })];
      pool.endpoints[0].requestCount = 7;
      pool.endpoints[0].lastError = "boom";
      const status = pool.getStatusList()[0];
      expect(status.requestCount).to.equal(7);
      expect(status.lastError).to.equal("boom");
    });
  });

  describe("broadcastSendRawTransaction", () => {
    it("submits to top-N priority ready endpoints and returns the first success", async () => {
      faucetConfig.ethTxBroadcastCount = 2;
      const pool = new RpcEndpointPool() as AnyPool;
      const a = new FakeProvider(); const b = new FakeProvider(); const c = new FakeProvider();
      const aReq: any[] = []; const bReq: any[] = []; const cReq: any[] = [];
      a.injectResponse("eth_sendRawTransaction", (p) => { aReq.push(p); return "0xa"; });
      b.injectResponse("eth_sendRawTransaction", (p) => { bReq.push(p); return "0xb"; });
      c.injectResponse("eth_sendRawTransaction", (p) => { cReq.push(p); return "0xc"; });
      pool.endpoints = [
        pool.createEndpoint({ url: a, priority: 10, metered: false }),
        pool.createEndpoint({ url: b, priority: 5, metered: false }),
        pool.createEndpoint({ url: c, priority: 1, metered: false }),
      ];
      pool.endpoints.forEach((ep) => { ep.online = true; });
      const hash = await pool.broadcastSendRawTransaction("0xdeadbeef");
      expect(hash).to.equal("0xa");
      expect(aReq).to.have.length(1);
      expect(bReq).to.have.length(1);
      expect(cReq).to.have.length(0, "should NOT broadcast to lowest-priority endpoint");
    });

    it("ignores per-endpoint failures as long as one submission succeeded", async () => {
      faucetConfig.ethTxBroadcastCount = 2;
      const pool = new RpcEndpointPool() as AnyPool;
      const a = new FakeProvider(); const b = new FakeProvider();
      a.injectResponse("eth_sendRawTransaction", () => { throw new Error("already known"); });
      b.injectResponse("eth_sendRawTransaction", "0xbb");
      pool.endpoints = [
        pool.createEndpoint({ url: a, priority: 10, metered: false }),
        pool.createEndpoint({ url: b, priority: 5, metered: false }),
      ];
      pool.endpoints.forEach((ep) => { ep.online = true; });
      const hash = await pool.broadcastSendRawTransaction("0xdeadbeef");
      expect(hash).to.equal("0xbb");
    });

    it("rethrows the first error when every submission fails", async () => {
      faucetConfig.ethTxBroadcastCount = 2;
      const pool = new RpcEndpointPool() as AnyPool;
      const a = new FakeProvider(); const b = new FakeProvider();
      a.injectResponse("eth_sendRawTransaction", () => { throw new Error("first"); });
      b.injectResponse("eth_sendRawTransaction", () => { throw new Error("second"); });
      pool.endpoints = [
        pool.createEndpoint({ url: a, priority: 10, metered: false }),
        pool.createEndpoint({ url: b, priority: 5, metered: false }),
      ];
      pool.endpoints.forEach((ep) => { ep.online = true; });
      let err: any;
      try { await pool.broadcastSendRawTransaction("0xdeadbeef"); }
      catch (ex) { err = ex; }
      expect(err).to.exist;
      expect(err.toString()).to.contain("first");
    });

    it("falls back to all endpoints when none are ready", async () => {
      faucetConfig.ethTxBroadcastCount = 1;
      const pool = new RpcEndpointPool() as AnyPool;
      const a = new FakeProvider();
      a.injectResponse("eth_sendRawTransaction", "0xfa11");
      pool.endpoints = [pool.createEndpoint({ url: a, priority: 1, metered: false })];
      // intentionally not setting online=true
      const hash = await pool.broadcastSendRawTransaction("0xdeadbeef");
      expect(hash).to.equal("0xfa11");
    });

    it("throws when there are no endpoints configured at all", async () => {
      const pool = new RpcEndpointPool() as AnyPool;
      pool.endpoints = [];
      let err: any;
      try { await pool.broadcastSendRawTransaction("0x"); }
      catch (ex) { err = ex; }
      expect(err.toString()).to.contain("no RPC endpoints");
    });
  });

  describe("lifecycle", () => {
    it("initialize → dispose tears down providers and stops the monitor", async () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const fp = new FakeProvider();
      fp.injectResponse("eth_blockNumber", "0x10");
      pool.initialize(fp);
      expect(pool.endpoints).to.have.length(1);
      expect(pool.monitorInterval).to.exist;
      pool.dispose();
      expect(pool.disposed).to.equal(true);
      expect(pool.monitorInterval).to.equal(null);
      expect(pool.endpoints).to.have.length(0);
    });

    it("re-initialize replaces the previous endpoint set", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const a = new FakeProvider(); const b = new FakeProvider();
      pool.initialize(a);
      const firstEndpoints = pool.endpoints;
      pool.initialize([a, b]);
      expect(pool.endpoints).to.have.length(2);
      expect(pool.endpoints).to.not.equal(firstEndpoints);
      pool.dispose();
    });

    it("calls disconnect on providers that support it", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const fp: any = { request: () => Promise.resolve({}), on: () => {} };
      let disconnected = false;
      fp.disconnect = () => { disconnected = true; };
      pool.endpoints = [pool.createEndpoint({ url: fp, priority: 1, metered: false })];
      pool.disposeEndpoints();
      expect(disconnected).to.equal(true);
      expect(pool.endpoints).to.have.length(0);
    });

    it("disposeEndpoints tolerates providers without disconnect", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const fp: any = { request: () => Promise.resolve({}), on: () => {} };
      pool.endpoints = [pool.createEndpoint({ url: fp, priority: 1, metered: false })];
      expect(() => pool.disposeEndpoints()).to.not.throw();
    });
  });

  describe("provider event handling", () => {
    it("attachProviderHandlers sets endpoint offline on `error` event", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const handlers: Record<string, Function> = {};
      const fakeProv: any = {
        on: (ev: string, cb: Function) => { handlers[ev] = cb; },
        request: () => Promise.resolve({}),
      };
      pool.endpoints = [pool.createEndpoint({ url: fakeProv, priority: 1, metered: false })];
      const ep = pool.endpoints[0];
      ep.online = true;
      handlers.error?.(new Error("boom"));
      expect(ep.online).to.equal(false);
    });

    it("attachProviderHandlers schedules a recreate on `end` event", async () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const handlers: Record<string, Function> = {};
      const fakeProv: any = {
        on: (ev: string, cb: Function) => { handlers[ev] = cb; },
        request: () => Promise.resolve({}),
      };
      pool.endpoints = [pool.createEndpoint({ url: fakeProv, priority: 1, metered: false })];
      const ep = pool.endpoints[0];
      ep.online = true;
      // Stub recreateProvider to verify it's called and avoid the real reconnect.
      let recreateCalls = 0;
      pool.recreateProvider = () => { recreateCalls++; };
      handlers.end?.();
      expect(ep.online).to.equal(false);
      // The end handler defers via setTimeout; wait briefly.
      await awaitSleepPromise(2200, () => recreateCalls > 0);
      expect(recreateCalls).to.be.greaterThan(0);
    }).timeout(5000);

    it("recreateProvider rebuilds the provider and re-instruments it", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const fpA = new FakeProvider();
      const fpB = new FakeProvider();
      pool.endpoints = [pool.createEndpoint({ url: fpA, priority: 1, metered: false })];
      const ep = pool.endpoints[0];
      // Swap the configured URL to a different pre-built provider, then trigger recreate.
      ep.config.url = fpB;
      pool.recreateProvider(ep);
      expect(ep.provider).to.equal(fpB);
    });

    it("recreateProvider is a no-op when the pool is disposed", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const fpA = new FakeProvider();
      pool.endpoints = [pool.createEndpoint({ url: fpA, priority: 1, metered: false })];
      const ep = pool.endpoints[0];
      pool.disposed = true;
      const before = ep.provider;
      pool.recreateProvider(ep);
      expect(ep.provider).to.equal(before);
    });

    it("recreateProvider logs and continues when reconstruction throws", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const fp = new FakeProvider();
      pool.endpoints = [pool.createEndpoint({ url: fp, priority: 1, metered: false })];
      const ep = pool.endpoints[0];
      // Make makeProvider throw to exercise the catch branch.
      pool.makeProvider = () => { throw new Error("nope"); };
      expect(() => pool.recreateProvider(ep)).to.not.throw();
    });

    it("attachProviderHandlers swallows errors from providers without .on", () => {
      const pool = new RpcEndpointPool() as AnyPool;
      const fp: any = { request: () => Promise.resolve({}) };
      pool.endpoints = [pool.createEndpoint({ url: fp, priority: 1, metered: false })];
      expect(() => pool.attachProviderHandlers(pool.endpoints[0])).to.not.throw();
    });
  });
});
