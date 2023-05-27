import 'mocha';
import { expect } from 'chai';
import { bindTestStubs, FakeWebSocket, unbindTestStubs } from './common';
import { PoWClient } from "../src/websock/PoWClient";
import { PoWSession, PoWSessionStatus } from '../src/websock/PoWSession';
import { faucetConfig, loadFaucetConfig } from '../src/common/FaucetConfig';
import { ServiceManager } from '../src/common/ServiceManager';
import { sleepPromise } from '../src/utils/SleepPromise';
import { FaucetStoreDB } from '../src/services/FaucetStoreDB';

describe("Session Management", () => {
  let globalStubs;

  beforeEach(() => {
    globalStubs = bindTestStubs();
    loadFaucetConfig(true);
    faucetConfig.faucetStats = null;
    faucetConfig.faucetDBFile = ":memory:";
    ServiceManager.InitService(FaucetStoreDB).initialize();
  });
  afterEach(() => {
    PoWSession.resetSessionData();
    ServiceManager.GetService(FaucetStoreDB).closeDatabase();
    ServiceManager.ClearAllServices();
    unbindTestStubs();
  });

  it("Create new session", async () => {
    let client = new PoWClient(new FakeWebSocket(), "8.8.8.8");
    let session = new PoWSession(client, "0x0000000000000000000000000000000000001337");
    await sleepPromise(100);
    expect(session.getActiveClient()).equal(client, "getActiveClient check failed");
    expect(session.getBalance()).equal(0n, "getBalance check failed");
    expect(session.getLastNonce()).equal(0, "getLastNonce check failed");
    expect(session.getLastRemoteIp()).equal("8.8.8.8", "getLastRemoteIp check failed");
    expect(session.getSessionStatus()).equal(PoWSessionStatus.MINING, "getSessionStatus check failed");
    expect(session.getTargetAddr()).equal("0x0000000000000000000000000000000000001337", "getTargetAddr check failed");
    session.closeSession(false, false, "test");
  });

  it("Restore existing session", async () => {
    let client = new PoWClient(new FakeWebSocket(), "8.8.8.8");
    let sessionTime = (new Date().getTime() / 1000) - 42;
    let session = new PoWSession(client, {
      id: "e9e86c6a-2abc-46c0-9d72-1512ef8c0691",
      startTime: sessionTime,
      targetAddr: "0x0000000000000000000000000000000000001337",
      preimage: "abcdefg",
      balance: "100",
      nonce: 50,
      ident: "xyz-zyx",
    });
    await sleepPromise(100);
    expect(session.getSessionId()).equal("e9e86c6a-2abc-46c0-9d72-1512ef8c0691", "getSessionId check failed");
    expect(session.getStartTime().getTime()).equal(sessionTime * 1000, "getStartTime check failed");
    expect(session.getActiveClient()).equal(client, "getActiveClient check failed");
    expect(session.getBalance()).equal(100n, "getBalance check failed");
    expect(session.getLastNonce()).equal(50, "getLastNonce check failed");
    expect(session.getLastRemoteIp()).equal("8.8.8.8", "getLastRemoteIp check failed");
    expect(session.getSessionStatus()).equal(PoWSessionStatus.MINING, "getSessionStatus check failed");
    expect(session.getTargetAddr()).equal("0x0000000000000000000000000000000000001337", "getTargetAddr check failed");
    expect(session.getIdent()).equal("xyz-zyx", "getIdent check failed");
    session.closeSession(false, false, "test");
  });

  it("Check session timeout", async () => {
    let client = new PoWClient(new FakeWebSocket(), "8.8.8.8");
    let sessionTime = (new Date().getTime() / 1000) - faucetConfig.powSessionTimeout - 1;
    let session = new PoWSession(client, {
      id: "e9e86c6a-2abc-46c0-9d72-1512ef8c0692",
      startTime: sessionTime,
      targetAddr: "0x0000000000000000000000000000000000001337",
      preimage: "abcdefg",
      balance: faucetConfig.claimMinAmount.toString(),
      nonce: 50,
      ident: "xyz-zyx",
    });

    await sleepPromise(100);
    expect(session.getSessionStatus()).equal(PoWSessionStatus.CLOSED, "getSessionStatus check failed");
    expect(session.isClaimable()).equal(true, "isClaimable check failed");
    session.closeSession(false, false, "test");
  });

  it("Check session reward accounting", async () => {
    let client = new PoWClient(new FakeWebSocket(), "8.8.8.8");
    let sessionTime = (new Date().getTime() / 1000) - faucetConfig.powSessionTimeout - 1;
    let session = new PoWSession(client, {
      id: "e9e86c6a-2abc-46c0-9d72-1512ef8c0693",
      startTime: sessionTime,
      targetAddr: "0x0000000000000000000000000000000000001337",
      preimage: "abcdefg",
      balance: "0",
      nonce: 50,
      ident: "xyz-zyx",
    });

    session.addBalance(100n);
    expect(session.getBalance()).equal(100n, "balance check 1 failed");
    session.addBalance(100n);
    expect(session.getBalance()).equal(200n, "balance check 2 failed");
    session.addBalance(0n);
    expect(session.getBalance()).equal(200n, "balance check 3 failed");
    session.addBalance(BigInt(faucetConfig.claimMinAmount));
    session.closeSession(false, true, "test");
    expect(session.isClaimable()).equal(true, "isClaimable check failed");
    expect(session.getBalance()).equal(BigInt(faucetConfig.claimMinAmount) + 200n, "balance check 4 failed");

    let claimToken = session.getSignedSession().split("|");
    let claimData = JSON.parse(Buffer.from(claimToken[0], "base64").toString());
    expect(claimData.balance).equal((BigInt(faucetConfig.claimMinAmount) + 200n).toString(), "claimtoken balance check failed");
    expect(claimData.claimable).equal(true, "claimtoken claimable check failed");
  });

  it("Concurrent session limits", async () => {
    let client1 = new PoWClient(new FakeWebSocket(), "8.8.8.8");
    let session1 = new PoWSession(client1, "0x0000000000000000000000000000000000001337");

    expect(PoWSession.getConcurrentSessionCountByIp("8.8.8.8")).equal(1, "check 1 failed");
    expect(PoWSession.getConcurrentSessionCountByIp("8.8.8.8", session1)).equal(0, "check 2 failed");
    expect(PoWSession.getConcurrentSessionCountByAddr("0x0000000000000000000000000000000000001337")).equal(1, "check 3 failed");
    expect(PoWSession.getConcurrentSessionCountByAddr("0x0000000000000000000000000000000000001337", session1)).equal(0, "check 4 failed");

    let client2 = new PoWClient(new FakeWebSocket(), "8.8.4.4");
    let session2 = new PoWSession(client2, "0x0000000000000000000000000000000000001337");
    expect(PoWSession.getConcurrentSessionCountByAddr("0x0000000000000000000000000000000000001337")).equal(2, "check 5 failed");
    expect(PoWSession.getConcurrentSessionCountByAddr("0x0000000000000000000000000000000000001337", session2)).equal(1, "check 5 failed");
    expect(PoWSession.getConcurrentSessionCountByIp("8.8.8.8")).equal(1, "check 6 failed");
    expect(PoWSession.getConcurrentSessionCountByIp("8.8.4.4")).equal(1, "check 7 failed");
    expect(PoWSession.getConcurrentSessionCountByIp("8.8.4.4", session1)).equal(1, "check 8 failed");

    let client3 = new PoWClient(new FakeWebSocket(), "8.8.4.4");
    let session3 = new PoWSession(client3, "0x0000000000000000000000000000000000001337");
    expect(PoWSession.getConcurrentSessionCountByIp("8.8.4.4")).equal(2, "check 9 failed");
    expect(PoWSession.getConcurrentSessionCountByAddr("0x0000000000000000000000000000000000001337")).equal(3, "check 10 failed");
    expect(PoWSession.getConcurrentSessionCountByAddr("0x0000000000000000000000000000000000001337", session3)).equal(2, "check 11 failed");

    session1.closeSession(false, false, "test");
    expect(PoWSession.getConcurrentSessionCountByIp("8.8.8.8")).equal(0, "check 10 failed");
    expect(PoWSession.getConcurrentSessionCountByAddr("0x0000000000000000000000000000000000001337")).equal(2, "check 12 failed");

    session2.closeSession(false, false, "test");
    session3.closeSession(false, false, "test");
  });

});
