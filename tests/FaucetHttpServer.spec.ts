import 'mocha';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { WebSocket } from 'ws';
import { bindTestStubs, loadDefaultTestConfig, unbindTestStubs } from './common.js';
import { ServiceManager } from '../src/common/ServiceManager.js';
import { FaucetWebApi } from '../src/webserv/FaucetWebApi.js';
import { IncomingHttpHeaders, IncomingMessage } from 'http';
import { PromiseDfd } from '../src/utils/PromiseDfd.js';
import { FaucetDatabase } from '../src/db/FaucetDatabase.js';
import { ModuleManager } from '../src/modules/ModuleManager.js';
import { faucetConfig } from '../src/config/FaucetConfig.js';
import { FaucetHttpResponse, FaucetHttpServer } from '../src/webserv/FaucetHttpServer.js';
import { EthClaimManager } from '../src/eth/EthClaimManager.js';
import { sha256 } from '../src/utils/CryptoUtils.js';

describe("Faucet Web Server", () => {
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
    let seoFile = path.join(faucetConfig.staticPath, "index.seo.html");
    expect(fs.existsSync(seoFile), "seo file not found");
    let seoContent = fs.readFileSync(seoFile, "utf8");
    expect(seoContent).contains(faucetConfig.faucetTitle, "uncustomized seo index");
  });

  it("check basic http call", async () => {
    faucetConfig.faucetTitle = "test_title_" + Math.floor(Math.random() * 99999999).toString();
    faucetConfig.buildSeoIndex = true;
    faucetConfig.serverPort = 0;
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    let listenPort = webServer.getListenPort();
    let indexData = await fetch("http://localhost:" + listenPort, {method: "GET"}).then((rsp) => rsp.text());
    expect(indexData).contains(faucetConfig.faucetTitle, "not index contents");
  });

  it("check api call (GET)", async () => {
    faucetConfig.faucetTitle = "test_title_" + Math.floor(Math.random() * 99999999).toString();
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    let webServer = ServiceManager.GetService(FaucetHttpServer);
    webServer.initialize();
    let listenPort = webServer.getListenPort();
    let configData = await fetch("http://localhost:" + listenPort + "/api/getFaucetConfig", {method: "GET"}).then((rsp) => rsp.json());
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
    let responseData = await fetch("http://localhost:" + listenPort + "/api/testEndpoint", {
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
      await fetch("http://localhost:" + listenPort + "/api/testEndpoint", {
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
    let testRsp = await fetch("http://localhost:" + listenPort + "/api/testEndpoint", {method: "GET"});
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
    let testRsp = await fetch("http://localhost:" + listenPort + "/api/testEndpoint", {method: "GET"});
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
    let testRsp = await fetch("http://localhost:" + listenPort + "/api/testEndpoint", {method: "GET"});
    expect(testRsp.status).to.equal(500, "unexpected http response code");
    expect(testRsp.statusText).to.matches(/Test Error 4267/, "unexpected http response code");
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

});