import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, FakeWebSocket, unbindTestStubs } from './common';
import { PoWClient } from "../src/websock/PoWClient";
import { PoWSession } from '../src/websock/PoWSession';
import { faucetConfig, loadFaucetConfig, PoWHashAlgo } from '../src/common/FaucetConfig';
import { ServiceManager } from '../src/common/ServiceManager';
import { PoWShareVerification } from '../src/websock/PoWShareVerification';
import { PoWValidator } from '../src/validator/PoWValidator';
import { Worker, MessageChannel } from 'worker_threads';
import { PoWValidatorWorker } from '../src/validator/PoWValidatorWorker';
import { FaucetStoreDB } from '../src/services/FaucetStoreDB';

function createFakeValidatorWorker(): Worker {
  let channel = new MessageChannel();
  let worker: Worker = channel.port1 as any;
  setTimeout(() => {
    new PoWValidatorWorker(channel.port2);
  }, 1);
  return worker;
}

describe("Share Verification", () => {
  let globalStubs;

  beforeEach(() => {
    globalStubs = bindTestStubs({
      "FaucetStoreDB.getKeyValueEntry": sinon.stub(FaucetStoreDB.prototype, "getKeyValueEntry"),
      "FaucetStoreDB.setKeyValueEntry": sinon.stub(FaucetStoreDB.prototype, "setKeyValueEntry"),
      "FaucetStoreDB.deleteKeyValueEntry": sinon.stub(FaucetStoreDB.prototype, "deleteKeyValueEntry"),
      "FaucetStoreDB.setSessionMark": sinon.stub(FaucetStoreDB.prototype, "setSessionMark"),
    });
    loadFaucetConfig(true);
    faucetConfig.faucetStats = null;
    ServiceManager.InitService(PoWValidator, createFakeValidatorWorker());
  });
  afterEach(() => {
    return unbindTestStubs();
  });

  it("Verify valid share (local verification)", async () => {
    let client = new PoWClient(new FakeWebSocket(), "8.8.8.8");
    let sessionTime = (new Date().getTime() / 1000) - 42;
    let session = new PoWSession(client, {
      id: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      startTime: sessionTime,
      targetAddr: "0x0000000000000000000000000000000000001337",
      preimage: "CIogLzT0cLA=",
      balance: "0",
      nonce: 0,
      ident: "xyz-zyx",
    });
    faucetConfig.powHashAlgo = PoWHashAlgo.SCRYPT;
    faucetConfig.powNonceCount = 1;
    faucetConfig.powScryptParams = {
      cpuAndMemory: 4096,
      blockSize: 8,
      parallelization: 1,
      keyLength: 16,
      difficulty: 9
    };
    faucetConfig.verifyLocalPercent = 100;
    faucetConfig.verifyLocalLowPeerPercent = 0;
    faucetConfig.verifyMinerPeerCount = 10;
    let verifier = new PoWShareVerification(session, [156]);
    let verificationResult = await verifier.startVerification();
    expect(verificationResult.isValid).equal(true, "invalid validity result");
  });

  it("Verify invalid share (local verification)", async () => {
    let client = new PoWClient(new FakeWebSocket(), "8.8.8.8");
    let sessionTime = (new Date().getTime() / 1000) - 42;
    let session = new PoWSession(client, {
      id: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      startTime: sessionTime,
      targetAddr: "0x0000000000000000000000000000000000001337",
      preimage: "CIogLzT0cLA=",
      balance: "0",
      nonce: 0,
      ident: "xyz-zyx",
    });
    faucetConfig.powHashAlgo = PoWHashAlgo.SCRYPT;
    faucetConfig.powNonceCount = 1;
    faucetConfig.powScryptParams = {
      cpuAndMemory: 4096,
      blockSize: 8,
      parallelization: 1,
      keyLength: 16,
      difficulty: 9
    };
    faucetConfig.verifyLocalPercent = 100;
    faucetConfig.verifyLocalLowPeerPercent = 0;
    faucetConfig.verifyMinerPeerCount = 10;
    let verifier = new PoWShareVerification(session, [100]);
    let verificationResult = await verifier.startVerification();
    expect(verificationResult.isValid).equal(false, "invalid validity result");
  });

  it("Verify too low difficulty share (local verification)", async () => {
    let client = new PoWClient(new FakeWebSocket(), "8.8.8.8");
    let sessionTime = (new Date().getTime() / 1000) - 42;
    let session = new PoWSession(client, {
      id: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      startTime: sessionTime,
      targetAddr: "0x0000000000000000000000000000000000001337",
      preimage: "CIogLzT0cLA=",
      balance: "0",
      nonce: 0,
      ident: "xyz-zyx",
    });
    faucetConfig.powHashAlgo = PoWHashAlgo.SCRYPT;
    faucetConfig.powNonceCount = 1;
    faucetConfig.powScryptParams = {
      cpuAndMemory: 4096,
      blockSize: 8,
      parallelization: 1,
      keyLength: 16,
      difficulty: 12
    };
    faucetConfig.verifyLocalPercent = 100;
    faucetConfig.verifyLocalLowPeerPercent = 0;
    faucetConfig.verifyMinerPeerCount = 10;
    let verifier = new PoWShareVerification(session, [156]);
    let verificationResult = await verifier.startVerification();
    expect(verificationResult.isValid).equal(false, "invalid validity result");
  });

});
