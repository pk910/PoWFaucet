import 'mocha';
import { expect } from 'chai';
import { bindTestStubs, FakeWebSocket, unbindTestStubs } from './common';
import { PoWSession, PoWSessionStatus } from '../src/websock/PoWSession';
import { faucetConfig, loadFaucetConfig } from '../src/common/FaucetConfig';
import { ServiceManager } from '../src/common/ServiceManager';
import { FaucetWebApi } from '../src/webserv/FaucetWebApi';
import { IncomingHttpHeaders, IncomingMessage } from 'http';
import { Socket } from 'net';
import { FaucetStoreDB } from '../src/services/FaucetStoreDB';

describe("Faucet Web API", () => {
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

  function encodeApiRequest(options: {
    url: string;
    remoteAddr: string;
    headers?: IncomingHttpHeaders;
  }): IncomingMessage {
    let socketData = {
      remoteAddress: options.remoteAddr,
    };
    let socket: Socket = socketData as any;
    Object.setPrototypeOf(socket, Socket.prototype);
    let messageData = {
      socket: socket,
      url: options.url,
      headers: options.headers || {},
    };
    let message: IncomingMessage = messageData as any;
    Object.setPrototypeOf(message, IncomingMessage.prototype);
    return message;
  }

  it("check /api/getMaxReward", async () => {
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getMaxReward",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse).equal(faucetConfig.claimMaxAmount, "unexpected response value");
  });

  it("check /api/getFaucetConfig", async () => {
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getFaucetConfig?cliver=0.0.1337",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.faucetTitle).equal(faucetConfig.faucetTitle, "unexpected response value");
  });

  it("check /api/getFaucetStatus", async () => {
    faucetConfig.faucetDBFile = ":memory:";
    faucetConfig.faucetSecret = "RandomStringThatShouldBeVerySecret!";
    ServiceManager.InitService(FaucetStoreDB).initialize();
    let sessionTime = Math.floor(new Date().getTime() / 1000) - 42;
    new PoWSession(null, {
      id: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      startTime: sessionTime * 1000,
      idleTime: null,
      targetAddr: "0x0000000000000000000000000000000000001337",
      preimage: "CIogLzT0cLA=",
      balance: "1000",
      claimable: false,
      lastNonce: 150,
      ident: "test-ident1",
      status: PoWSessionStatus.MINING,
      remoteIp: "8.8.8.8",
      remoteIpInfo: {
        status: "success", country: "United States", countryCode: "US",
        region: "Virginia", regionCode: "VA", city: "Ashburn", cityCode: "Ashburn",
        locLat: 39.03, locLon: -77.5, zone: "America/New_York",
        isp: "Google LLC", org: "Google Public DNS", as: "AS15169 Google LLC",
        proxy: false, hosting: true,
      }
    });
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getFaucetStatus",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status.unclaimedBalance).equal("1000", "value mismatch: unclaimedBalance");
    expect(apiResponse.status.queuedBalance).equal("0", "value mismatch: queuedBalance");
    expect(apiResponse.sessions.length).equal(1, "value mismatch: sessions.length");
    expect(apiResponse.sessions[0].id).equal("d357aa41fd4b70a8d09a", "value mismatch: session.id");
    expect(apiResponse.sessions[0].start).equal(sessionTime, "value mismatch: session.start");
    expect(apiResponse.sessions[0].target).equal("0x0000000000000000000000000000000000001337", "value mismatch: session.target");
    expect(apiResponse.sessions[0].ip).equal("91c.602.6db.39b", "value mismatch: session.ip");
    expect(apiResponse.sessions[0].balance).equal("1000", "value mismatch: session.balance");
    expect(apiResponse.sessions[0].nonce).equal(150, "value mismatch: session.nonce");
    expect(apiResponse.sessions[0].status).equal("idle", "value mismatch: session.status");
  });

  

});
