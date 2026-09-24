import 'mocha';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as zlib from 'zlib';
import { WebSocket } from 'ws';
import { bindTestStubs, loadDefaultTestConfig, returnDelayedPromise, unbindTestStubs } from './common.js';
import { ServiceManager } from '../src/common/ServiceManager.js';
import { FaucetWebApi } from '../src/webserv/FaucetWebApi.js';
import { IncomingHttpHeaders, IncomingMessage } from 'http';
import { PromiseDfd } from '../src/utils/PromiseDfd.js';
import { FaucetDatabase } from '../src/db/FaucetDatabase.js';
import { ModuleManager } from '../src/modules/ModuleManager.js';
import { faucetConfig, resolveRelativePath } from '../src/config/FaucetConfig.js';
import { FaucetHttpResponse, FaucetHttpServer } from '../src/webserv/FaucetHttpServer.js';
import { EthClaimManager } from '../src/eth/EthClaimManager.js';
import { sha256 } from '../src/utils/CryptoUtils.js';
import { FaucetProcess } from '../src/common/FaucetProcess.js';
import { FetchUtil } from '../src/utils/FetchUtil.js';

describe("Faucet Web Server", () => {
  /** files these tests wrote into the real static folder, removed after each one */
  let temporaryFiles: (() => void)[] = [];
  afterEach(() => {
    temporaryFiles.forEach((remove) => remove());
    temporaryFiles = [];
  });

  let globalStubs;

  beforeEach(async () => {
    globalStubs = bindTestStubs({});
    loadDefaultTestConfig();
    await ServiceManager.GetService(FaucetDatabase).initialize();
    await ServiceManager.GetService(ModuleManager).initialize();
  });
  afterEach(async () => {
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
  });

  it("generate SEO index.html", async () => {
    faucetConfig.faucetTitle = "test_title_" + Math.floor(Math.random() * 99999999).toString();
    faucetConfig.buildSeoIndex = true;
    faucetConfig.serverPort = 0;

    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    webServer.initialize();
    let seoFile = path.join(faucetConfig.staticPath, "index.seo.html");
    expect(fs.existsSync(seoFile), "seo file not found");
    let seoContent = fs.readFileSync(seoFile, "utf8");
    expect(seoContent).contains(faucetConfig.faucetTitle, "uncustomized seo index");

    // drop & check re-generation after config refresh
    fs.unlinkSync(seoFile);
    ServiceManager.GetService(FaucetProcess).emit("reload");
    expect(fs.existsSync(seoFile), "seo file not found after refresh");
  });

  it("check basic http call", async () => {
    faucetConfig.faucetTitle = "test_title_" + Math.floor(Math.random() * 99999999).toString();
    faucetConfig.buildSeoMeta = {
      "test1": "1234567890"
    };
    faucetConfig.buildSeoIndex = true;
    faucetConfig.serverPort = 0;
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    let listenPort = webServer.getListenPort();
    let indexData = await FetchUtil.fetch("http://localhost:" + listenPort, {method: "GET"}).then((rsp) => rsp.text());
    expect(indexData).contains(faucetConfig.faucetTitle, "not index contents");
  });

  it("check basic http call (without SEO index)", async () => {
    faucetConfig.faucetTitle = "test_title_" + Math.floor(Math.random() * 99999999).toString();
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    let seoFile = path.join(faucetConfig.staticPath, "index.seo.html");
    if(fs.existsSync(seoFile))
      fs.unlinkSync(seoFile);
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    let listenPort = webServer.getListenPort();
    let indexData = await FetchUtil.fetch("http://localhost:" + listenPort, {method: "GET"}).then((rsp) => rsp.text());
    expect(indexData).contains("<!-- pow-faucet-header -->", "not index contents");
  });

  it("rejects invalid static request urls without crashing", async () => {
    faucetConfig.faucetTitle = "test_title_" + Math.floor(Math.random() * 99999999).toString();
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    await returnDelayedPromise(true, null);
    let listenPort = webServer.getListenPort();
    let response = await FetchUtil.fetch("http://localhost:" + listenPort + "//", {method: "GET"});
    expect(response.status).equals(400, "unexpected response status");
    expect(response.statusText).equals("Bad Request", "unexpected response status text");
  });

  it("check api call (GET)", async () => {
    faucetConfig.faucetTitle = "test_title_" + Math.floor(Math.random() * 99999999).toString();
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    let listenPort = webServer.getListenPort();
    let configData = await FetchUtil.fetch("http://localhost:" + listenPort + "/api/getFaucetConfig", {method: "GET"}).then((rsp) => rsp.json());
    expect(!!configData).equals(true, "no api response");
    expect((configData as any).faucetTitle).equals(faucetConfig.faucetTitle, "api response mismatch");
  });

  it("check api call (POST)", async () => {
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    let reqMsg: IncomingMessage = {} as any;
    ServiceManager.GetService(FaucetWebApi).registerApiEndpoint("testEndpoint", async (req, url, body) => {
      reqMsg = req;
      return sha256(body.toString());
    });
    let listenPort = webServer.getListenPort();
    let responseData = await FetchUtil.fetch("http://localhost:" + listenPort + "/api/testEndpoint", {
      method: 'POST',
      body: JSON.stringify({test: 1}),
      headers: {'Content-Type': 'application/json'}
    }).then((rsp) => rsp.text());

    expect(responseData).equals('"1da06016289bd76a5ada4f52fc805ae0c394612f17ec6d0f0c29b636473c8a9d"', "unexpected api response");
    expect(reqMsg.method).equals("POST", "unexpected method");
  });

  it("check api call (POST, body size limit)", async () => {
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    ServiceManager.GetService(FaucetWebApi).registerApiEndpoint("testEndpoint", async (req, url, body) => {
      return "test";
    });
    let listenPort = webServer.getListenPort();
    let error: Error = null as any;
    try {
      let testData = "0123456789".repeat(1024 * 1024);
      await FetchUtil.fetch("http://localhost:" + listenPort + "/api/testEndpoint", {
        method: 'POST',
        body: JSON.stringify({test: testData}),
        headers: {'Content-Type': 'application/json'}
      });
    } catch(ex) {
      error = ex;
    }
    expect(!!error).to.equals(true, "no error thrown");
    expect(error.toString()).to.matches(/socket hang up/, "unexpected error message");
  });

  it("check api call (custom response)", async () => {
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    ServiceManager.GetService(FaucetWebApi).registerApiEndpoint("testEndpoint", async (req, url, body) => {
      return new FaucetHttpResponse(500, "Test Error 4135");
    });
    let listenPort = webServer.getListenPort();
    let testRsp = await FetchUtil.fetch("http://localhost:" + listenPort + "/api/testEndpoint", {method: "GET"});
    expect(testRsp.status).to.equal(500, "unexpected http response code");
    expect(testRsp.statusText).to.matches(/Test Error 4135/, "unexpected http response code");
  });

  it("check api call (rejection)", async () => {
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    ServiceManager.GetService(FaucetWebApi).registerApiEndpoint("testEndpoint", (req, url, body) => {
      return Promise.reject("Test Error 3672");
    });
    let listenPort = webServer.getListenPort();
    let testRsp = await FetchUtil.fetch("http://localhost:" + listenPort + "/api/testEndpoint", {method: "GET"});
    let testRspText = await testRsp.text();
    expect(testRsp.status).to.equal(500, "unexpected http response code");
    expect(testRspText).to.matches(/Test Error 3672/, "unexpected http response code");
  });

  it("check api call (rejection with custom response)", async () => {
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    ServiceManager.GetService(FaucetWebApi).registerApiEndpoint("testEndpoint", async (req, url, body) => {
      throw new FaucetHttpResponse(500, "Test Error 4267");
    });
    let listenPort = webServer.getListenPort();
    let testRsp = await FetchUtil.fetch("http://localhost:" + listenPort + "/api/testEndpoint", {method: "GET"});
    expect(testRsp.status).to.equal(500, "unexpected http response code");
    expect(testRsp.statusText).to.matches(/Test Error 4267/, "unexpected http response code");
  });

  it("check api call (unexpected error)", async () => {
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    ServiceManager.GetService(FaucetWebApi).registerApiEndpoint("testEndpoint", async (req, url, body) => {
      throw "unexpected error";
    });
    let listenPort = webServer.getListenPort();
    let testRsp = await FetchUtil.fetch("http://localhost:" + listenPort + "/api/testEndpoint", {method: "GET"});
    expect(testRsp.status).to.equal(500, "unexpected http response code");
    expect(testRsp.statusText).to.matches(/Internal Server Error/, "unexpected http response code");
  });

  it("check ws call", async () => {
    faucetConfig.faucetTitle = "test_title_" + Math.floor(Math.random() * 99999999).toString();
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    await ServiceManager.GetService(EthClaimManager).initialize();
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    let listenPort = webServer.getListenPort();
    let webSocket = new WebSocket("ws://127.0.0.1:" + listenPort + "/ws/claim");
    let errorDfd = new PromiseDfd<any>();
    webSocket.onmessage = (evt) => {
      let data = JSON.parse(evt.data.toString());
      if(data && data.action === "error")
        errorDfd.resolve(data);
    };
    await new Promise<void>((resolve) => {
      webSocket.onopen = (evt) => {
        resolve();
      };
    });
    let errorResponse = await errorDfd.promise;
    expect(!!errorResponse).equals(true, "no websocket response");
    expect(errorResponse.data.reason).to.matches(/session not found/, "api response mismatch");
    webSocket.close();
  });

  it("check ws call (invalid endpoint)", async () => {
    faucetConfig.faucetTitle = "test_title_" + Math.floor(Math.random() * 99999999).toString();
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    await ServiceManager.GetService(EthClaimManager).initialize();
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    let listenPort = webServer.getListenPort();
    let webSocket = new WebSocket("ws://127.0.0.1:" + listenPort + "/api/test");
    let errorResponse = await new Promise<any>((resolve) => {
      webSocket.onerror = (evt) => {
        resolve(evt);
      };
    });
    expect(!!errorResponse).equals(true, "no websocket error");
  });

  it("check cors api call", async () => {
    faucetConfig.faucetTitle = "test_title_" + Math.floor(Math.random() * 99999999).toString();
    faucetConfig.buildSeoIndex = true;
    faucetConfig.serverPort = 0;
    faucetConfig.corsAllowOrigin = ["https://example.com", "https://example2.com"];
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    let listenPort = webServer.getListenPort();
    let configOptionsRsp = await FetchUtil.fetch(
      "http://localhost:" + listenPort + "/api/getFaucetConfig", 
      {
        method: "OPTIONS",
        headers: {
          "Origin": "https://example.com"
        }
      }
    )
    expect(configOptionsRsp.headers.get("access-control-allow-origin")).equals("https://example.com", "access-control-allow-origin mismatch");
    expect(configOptionsRsp.headers.get("access-control-allow-methods")).equals("GET, POST", "access-control-allow-methods mismatch");

    let configRsp = await FetchUtil.fetch(
      "http://localhost:" + listenPort + "/api/getFaucetConfig", 
      {
        method: "GET",
        headers: {
          "Origin": "https://example2.com"
        }
      }
    )
    expect(configRsp.headers.get("access-control-allow-origin")).equals("https://example2.com", "access-control-allow-origin mismatch 2");
    expect(configRsp.headers.get("access-control-allow-methods")).equals("GET, POST", "access-control-allow-methods mismatch 2");
    let configData = await configRsp.json();
    expect(!!configData).equals(true, "no api response");
    expect((configData as any).faucetTitle).equals(faucetConfig.faucetTitle, "api response mismatch");
  });

  it("check cors api call (invalid origin)", async () => {
    faucetConfig.faucetTitle = "test_title_" + Math.floor(Math.random() * 99999999).toString();
    faucetConfig.buildSeoIndex = true;
    faucetConfig.serverPort = 0;
    faucetConfig.corsAllowOrigin = ["https://example.com"];
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    let listenPort = webServer.getListenPort();
    let configOptionsRsp = await FetchUtil.fetch(
      "http://localhost:" + listenPort + "/api/getFaucetConfig", 
      {
        method: "OPTIONS",
        headers: {
          "Origin": "https://example2.com"
        }
      }
    )
    expect(configOptionsRsp.headers.get("access-control-allow-origin")).equals(null, "access-control-allow-origin mismatch");
    expect(configOptionsRsp.headers.get("access-control-allow-methods")).equals(null, "access-control-allow-methods mismatch");
  });

  /**
   * A file to serve, removed again when the test ends.
   *
   * These tests need *a* static resource and do not care which, so they used to write
   * `powfaucet.js` into the static folder and leave it there. That folder is the real one -
   * `faucetConfig.staticPath` resolves against the working directory - and the build now names
   * every artifact by its content hash, with `check-modules` refusing any build output that no
   * manifest entry names. A leftover from a test run fails the deploy gate, and it did:
   * `static/js/powfaucet.js` reappeared between a client build and a `deploy-test.sh pack`, and
   * the pack refused on a file the test suite had written.
   *
   * A file that was already there is left alone - that one is a real build output.
   */
  function temporaryStaticFile(relative: string) {
    let staticPath = resolveRelativePath(faucetConfig.staticPath, process.cwd());
    let file = path.join(staticPath, relative);
    let dir = path.dirname(file);
    let madeDir = !fs.existsSync(dir);
    if(madeDir)
      fs.mkdirSync(dir, { recursive: true });
    if(fs.existsSync(file))
      return;
    fs.writeFileSync(file, "test");
    temporaryFiles.push(() => {
      try { fs.rmSync(file); } catch(ex) {}
      if(madeDir) { try { fs.rmdirSync(dir); } catch(ex) {} }
    });
  }

  it("check cors resource calls", async function() {
    faucetConfig.faucetTitle = "test_title_" + Math.floor(Math.random() * 99999999).toString();
    faucetConfig.buildSeoIndex = true;
    faucetConfig.serverPort = 0;
    faucetConfig.corsAllowOrigin = ["https://example.com", "https://example2.com"];
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    let listenPort = webServer.getListenPort();

    let staticPath = resolveRelativePath(faucetConfig.staticPath, process.cwd());
    let checkResources = [
      "/js/powfaucet.js",
      "/css/powfaucet.css",
    ];

    // create dirs (might be missing if client hasn't been compiled)
    [ "js", "css" ].forEach((dir) => {
      let dirPath = path.join(staticPath, dir);
      if(!fs.existsSync(dirPath))
        fs.mkdirSync(dirPath);
    })

    for(let i = 0; i < checkResources.length; i++) {
      let resource = checkResources[i];

      temporaryStaticFile(resource);

      let optionsRsp = await FetchUtil.fetch(
        "http://localhost:" + listenPort + resource, 
        {
          method: "OPTIONS",
          headers: {
            "Origin": "https://example.com"
          }
        }
      )
      expect(optionsRsp.headers.get("access-control-allow-origin")).equals("https://example.com", "access-control-allow-origin mismatch");
      expect(optionsRsp.headers.get("access-control-allow-methods")).equals("GET, POST", "access-control-allow-methods mismatch");

      let dataRsp = await FetchUtil.fetch(
        "http://localhost:" + listenPort + resource, 
        {
          method: "GET",
          headers: {
            "Origin": "https://example2.com"
          }
        }
      )
      expect(dataRsp.headers.get("access-control-allow-origin")).equals("https://example2.com", "access-control-allow-origin mismatch 2");
      expect(dataRsp.headers.get("access-control-allow-methods")).equals("GET, POST", "access-control-allow-methods mismatch 2");
    }
  });

  it("returns 304 for conditional static resource requests", async function() {
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    faucetConfig.corsAllowOrigin = ["https://example.com"];
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    let listenPort = webServer.getListenPort();

    let staticPath = resolveRelativePath(faucetConfig.staticPath, process.cwd());
    let jsPath = path.join(staticPath, "js");
    if(!fs.existsSync(jsPath))
      fs.mkdirSync(jsPath);

    temporaryStaticFile(path.join("js", "powfaucet.js"));

    let initialRsp = await FetchUtil.fetch(
      "http://localhost:" + listenPort + "/js/powfaucet.js",
      {
        method: "GET",
        headers: {
          "Origin": "https://example.com"
        }
      }
    );

    let etag = initialRsp.headers.get("etag");
    expect(etag).to.not.equal(null, "etag missing");

    let cachedRsp = await FetchUtil.fetchWithTimeout(
      "http://localhost:" + listenPort + "/js/powfaucet.js",
      {
        method: "GET",
        headers: {
          "Origin": "https://example.com",
          "If-None-Match": etag
        }
      },
      1000
    );

    expect(cachedRsp.status).equals(304, "unexpected status");
    expect(cachedRsp.headers.get("access-control-allow-origin")).equals("https://example.com", "access-control-allow-origin mismatch");
    expect(cachedRsp.headers.get("content-length")).equals(null, "content-length should be omitted on 304");
  });

  it("FetchUtil: request", async () => {
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    ServiceManager.GetService(FaucetWebApi).registerApiEndpoint("testEndpoint", async (req, url, body) => {
      return "test";
    });
    let listenPort = webServer.getListenPort();
    let res = await FetchUtil.fetchWithTimeout("http://localhost:" + listenPort + "/api/testEndpoint", {method: "GET"}, 100).then((rsp) => rsp.json());
    expect(res).to.equals("test", "unexpected response");
  });

  it("FetchUtil: timeout", async () => {
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    ServiceManager.GetService(FaucetWebApi).registerApiEndpoint("testEndpoint", async (req, url, body) => {
      return returnDelayedPromise(true, "test", 200);
    });
    let listenPort = webServer.getListenPort();
    let err;
    try {
      await FetchUtil.fetchWithTimeout("http://localhost:" + listenPort + "/api/testEndpoint", {method: "GET"}, 100);
    } catch(ex) {
      err = ex;
    }
    expect(!!err).to.equals(true, "no error thrown");
    expect(err.toString()).to.matches(/Request timed out/, "unexpected error message");
  });

  it("FetchUtil: http error", async () => {
    let err;
    try {
      await FetchUtil.fetchWithTimeout("http://127.0.0.1:62353/api/testEndpoint", {method: "GET", }, 5000);
    } catch(ex) {
      err = ex;
    }
    expect(!!err).to.equals(true, "no error thrown");
    expect(err.toString()).to.matches(/failed/, "unexpected error message");
  });

  /**
   * the wasm module is the largest thing a player downloads, so
   * `npm run bundle` compresses it once at build time and the static handler serves the
   * sibling the client can decode. These drive it over a real socket with node's own http
   * client, which - unlike fetch - neither sends an Accept-Encoding of its own nor
   * decompresses what comes back, so the bytes asserted on are the bytes on the wire.
   */
  // `precompressed wasm delivery` lived here: a wasm in `static/js` served with its `.br`/`.gz`
  // sibling. The faucet builds no wasm and its static tree must hold no module's
  // asset, so the behaviour moved to the module asset route with the cases - brotli, gzip-only,
  // a q=0 refusal, no sibling, the immutable headers and the HEAD that has to take the same
  // branch as GET are all in `tests/loader/ModuleAssets.spec.ts` now.

  /**
   * every method outside the handled set used to fall through
   * `onHttpRequest` with no response written, so the client waited until it timed out -
   * `curl -I` against any url on the faucet hung. These use node's http client directly,
   * because fetch cannot send a bodyless HEAD and read the headers back the same way.
   */
  describe("http methods", () => {
    function request(port: number, method: string, url: string, headers: {[key: string]: string} = {}): Promise<{status: number, headers: IncomingHttpHeaders, body: Buffer}> {
      return new Promise((resolve, reject) => {
        let req = http.request({ host: "127.0.0.1", port: port, path: url, method: method, headers: headers }, (rsp) => {
          let chunks: Buffer[] = [];
          rsp.on("data", (chunk) => chunks.push(chunk));
          rsp.on("end", () => resolve({
            status: rsp.statusCode,
            headers: rsp.headers,
            body: Buffer.concat(chunks),
          }));
        });
        req.on("error", reject);
        req.end();
      });
    }

    function startServer(): number {
      faucetConfig.buildSeoIndex = false;
      faucetConfig.serverPort = 0;
      let webServer = ServiceManager.GetService(FaucetHttpServer);
      webServer.initialize();
      return webServer.getListenPort();
    }

    it("answers GET, HEAD, POST and OPTIONS, and refuses the rest", async () => {
      let port = startServer();

      let get = await request(port, "GET", "/api/getFaucetConfig");
      expect(get.status).to.equal(200, "GET status");
      expect(get.body.length > 0).to.equal(true, "GET has no body");

      let post = await request(port, "POST", "/api/getFaucetConfig");
      expect(post.status).to.equal(200, "POST status");

      let options = await request(port, "OPTIONS", "/api/getFaucetConfig");
      expect(options.status).to.equal(200, "OPTIONS status");

      let put = await request(port, "PUT", "/api/getFaucetConfig");
      expect(put.status).to.equal(405, "PUT status");
      expect(put.headers["allow"]).to.equal("GET, HEAD, POST, OPTIONS", "Allow header mismatch");
      expect(put.body.length).to.equal(0, "405 must not carry a body");

      let del = await request(port, "DELETE", "/");
      expect(del.status).to.equal(405, "DELETE status");
    });

    it("answers HEAD with the GET headers and no body", async () => {
      let port = startServer();

      let get = await request(port, "GET", "/api/getFaucetConfig");
      let head = await request(port, "HEAD", "/api/getFaucetConfig");

      expect(head.status).to.equal(get.status, "HEAD status differs from GET");
      expect(head.body.length).to.equal(0, "HEAD returned a body");
      expect(head.headers["content-type"]).to.equal(get.headers["content-type"], "HEAD content type differs from GET");
    });

  });

});
