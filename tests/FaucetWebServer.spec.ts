import 'mocha';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { WebSocket } from 'ws';
import { bindTestStubs, unbindTestStubs } from './common';
import { PoWSession, PoWSessionStatus } from '../src/websock/PoWSession';
import { faucetConfig, loadFaucetConfig } from '../src/common/FaucetConfig';
import { ServiceManager } from '../src/common/ServiceManager';
import { FaucetWebApi } from '../src/webserv/FaucetWebApi';
import { IncomingHttpHeaders, IncomingMessage } from 'http';
import { Socket } from 'net';
import { FaucetStoreDB } from '../src/services/FaucetStoreDB';
import { FaucetHttpServer } from '../src/webserv/FaucetWebServer';
import { sleepPromise } from '../src/utils/SleepPromise';
import { PromiseDfd } from '../src/utils/PromiseDfd';

describe("Faucet Web Server", () => {
  let globalStubs;

  beforeEach(() => {
    globalStubs = bindTestStubs();
    loadFaucetConfig(true);
    faucetConfig.faucetStats = null;
  });
  afterEach(() => {
    PoWSession.resetSessionData();
    ServiceManager.ClearAllServices();
    unbindTestStubs();
  });

  it("generate SEO index.html", async () => {
    faucetConfig.faucetTitle = "test_title_" + Math.floor(Math.random() * 99999999).toString();
    faucetConfig.buildSeoIndex = true;
    faucetConfig.serverPort = 0;
    let webServer = new FaucetHttpServer();
    let seoFile = path.join(faucetConfig.staticPath, "index.seo.html");
    expect(fs.existsSync(seoFile), "seo file not found");
    let seoContent = fs.readFileSync(seoFile, "utf8");
    expect(seoContent).contains(faucetConfig.faucetTitle, "uncustomized seo index");
  });

  it("check basic http call", async () => {
    faucetConfig.faucetTitle = "test_title_" + Math.floor(Math.random() * 99999999).toString();
    faucetConfig.buildSeoIndex = true;
    faucetConfig.serverPort = 0;
    let webServer = new FaucetHttpServer();
    let listenPort = webServer.getListenPort();
    let indexData = await fetch("http://localhost:" + listenPort).then((rsp) => rsp.text());
    expect(indexData).contains(faucetConfig.faucetTitle, "not index contents");
  });

  it("check api call", async () => {
    faucetConfig.faucetTitle = "test_title_" + Math.floor(Math.random() * 99999999).toString();
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    let webServer = new FaucetHttpServer();
    let listenPort = webServer.getListenPort();
    let configData = await fetch("http://localhost:" + listenPort + "/api/getFaucetConfig").then((rsp) => rsp.json());
    expect(!!configData).equals(true, "no api response");
    expect(configData.faucetTitle).equals(faucetConfig.faucetTitle, "api response mismatch");
  });

  it("check ws call", async () => {
    faucetConfig.faucetTitle = "test_title_" + Math.floor(Math.random() * 99999999).toString();
    faucetConfig.buildSeoIndex = false;
    faucetConfig.serverPort = 0;
    globalStubs["FakeWebSocket.send"].restore();
    globalStubs["FakeWebSocket.close"].restore();
    let webServer = new FaucetHttpServer();
    let listenPort = webServer.getListenPort();
    let webSocket = new WebSocket("ws://127.0.0.1:" + listenPort + "/pow");
    await new Promise<void>((resolve) => {
      webSocket.onopen = (evt) => {
        webSocket.send(JSON.stringify({"id":"test","action":"getConfig","data":{"version":"0.0.1337"}}));
        resolve();
      };
    });
    let configDfd = new PromiseDfd<any>();
    webSocket.onmessage = (evt) => {
      let data = JSON.parse(evt.data.toString());
      if(data && data.action === "config")
        configDfd.resolve(data);
    };
    let configResponse = await configDfd.promise;
    expect(!!configResponse).equals(true, "no websocket response");
    expect(configResponse.data.faucetTitle).equals(faucetConfig.faucetTitle, "api response mismatch");
    webSocket.close();
    await sleepPromise(50);
  });

});
