import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, awaitSleepPromise, createFuse, fusedSleep } from './common';
import { ServiceManager } from '../src/common/ServiceManager';
import { FaucetDatabase } from '../src/db/FaucetDatabase';
import { TransactionReceipt } from 'web3-core';
import { ModuleHookAction, ModuleManager } from '../src/modules/ModuleManager';
import { SessionManager } from '../src/session/SessionManager';
import { faucetConfig } from '../src/config/FaucetConfig';
import { FaucetError } from '../src/common/FaucetError';
import { FaucetSession, FaucetSessionStatus, FaucetSessionStoreData } from '../src/session/FaucetSession';
import { ClaimTxStatus, EthClaimInfo, EthClaimManager } from '../src/eth/EthClaimManager';
import { getNewGuid } from '../src/utils/GuidUtils';
import { EthWalletManager, TransactionResult } from '../src/eth/EthWalletManager';
import { sleepPromise } from '../src/utils/SleepPromise';
import { FakeWebSocket, injectFakeWebSocket } from './stubs/FakeWebSocket';
import { EthClaimNotificationClient } from '../src/eth/EthClaimNotificationClient';


describe("ETH Claim Manager", () => {
  let globalStubs;

  beforeEach(async () => {
    globalStubs = bindTestStubs({
      "EthWalletManager.sendClaimTx": sinon.stub(EthWalletManager.prototype, "sendClaimTx"),
    });
    loadDefaultTestConfig();
    await ServiceManager.GetService(FaucetDatabase).initialize();
    await ServiceManager.GetService(ModuleManager).initialize();
    faucetConfig.minDropAmount = 10;
    faucetConfig.maxDropAmount = 1000;
  });
  afterEach(async () => {
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
  });

  async function addTestSession(status: FaucetSessionStatus, claimData: any, amount?: string): Promise<FaucetSessionStoreData> {
    let sessionData: FaucetSessionStoreData = {
      sessionId: getNewGuid(),
      startTime: Math.floor(new Date().getTime() / 1000),
      status: status,
      dropAmount: amount || "100",
      remoteIP: "8.8.8.8",
      targetAddr: "0x0000000000000000000000000000000000001337",
      tasks: [],
      data: {},
      claim: claimData,
    }
    await ServiceManager.GetService(FaucetDatabase).updateSession(sessionData);
    return sessionData;
  }

  function getTestReceipt(): TransactionReceipt {
    return {
      status: true,
      transactionHash: null,
      transactionIndex: 1,
      blockHash: "0xfce202c4104864d81d8bd78b7202a77e5dca634914a3fd6636f2765d65fa9a07",
      blockNumber: 0x8aa5ae,
      from: "0x0000000000000000000000000000000000004242",
      to: "0x0000000000000000000000000000000000001337",
      contractAddress: null,
      cumulativeGasUsed: 0x1752665,
      gasUsed: 10,
      effectiveGasPrice: 10,
      logs: [],
      logsBloom: "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    };
  }

  it("Load stored claim queue", async () => {
    await addTestSession(FaucetSessionStatus.CLAIMING, {
      claimIdx: 5,
      claimStatus: ClaimTxStatus.QUEUE,
      claimTime: Math.floor(new Date().getTime() / 1000),
    });
    await addTestSession(FaucetSessionStatus.CLAIMING, {
      claimIdx: 3,
      claimStatus: "unknown",
      claimTime: Math.floor(new Date().getTime() / 1000),
      txHash: "0xdb5950d44ceed2a5eb77970104b974b8c4234d7110fd8d0008edb2cfff835f04"
    });
    await addTestSession(FaucetSessionStatus.CLAIMING, {
      claimIdx: 2,
      claimStatus: ClaimTxStatus.PENDING,
      claimTime: Math.floor(new Date().getTime() / 1000),
      txHash: "0x7c4074c4d182e312adf698795835cbd2d597246cdd47013f09c7bb81f33a363c"
    });
    let ses4 = await addTestSession(FaucetSessionStatus.CLAIMING, {
      claimIdx: 2,
      claimStatus: ClaimTxStatus.QUEUE,
      claimTime: Math.floor(new Date().getTime() / 1000),
    });

    globalStubs["watchClaimTx"] = sinon.stub(EthWalletManager.prototype, "watchClaimTx").returns(new Promise(() => {}));

    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();

    expect(claimManager.getQueuedAmount()).to.equal(200n, "unexpected queued balance");
    let txQueue = claimManager.getTransactionQueue(true);
    expect(txQueue.length).to.equal(2, "unexpected queue length");
    expect(txQueue[0].session).to.equal(ses4.sessionId, "unexpected queue order");
  });

  it("Check restored pending claim processing", async () => {
    let ses1 = await addTestSession(FaucetSessionStatus.CLAIMING, {
      claimIdx: 2,
      claimStatus: ClaimTxStatus.PENDING,
      claimTime: Math.floor(new Date().getTime() / 1000),
      txHash: "0x7c4074c4d182e312adf698795835cbd2d597246cdd47013f09c7bb81f33a3601"
    });
    let ses2 = await addTestSession(FaucetSessionStatus.CLAIMING, {
      claimIdx: 2,
      claimStatus: ClaimTxStatus.PENDING,
      claimTime: Math.floor(new Date().getTime() / 1000),
      txHash: "0x7c4074c4d182e312adf698795835cbd2d597246cdd47013f09c7bb81f33a3602"
    });
    let ses3 = await addTestSession(FaucetSessionStatus.CLAIMING, {
      claimIdx: 2,
      claimStatus: ClaimTxStatus.PENDING,
      claimTime: Math.floor(new Date().getTime() / 1000),
      txHash: "0x7c4074c4d182e312adf698795835cbd2d597246cdd47013f09c7bb81f33a3603"
    });

    let txResFuse: any = {};
    let txResults: {[sesId: string]: Promise<{
      status: boolean;
      block: number;
      fee: bigint;
      receipt: TransactionReceipt;
    }>} = {
      [ses1.sessionId]: awaitSleepPromise(200, () => txResFuse.ses1).then(() => ({
        status: true,
        block: 1,
        fee: 100n,
        receipt: Object.assign(getTestReceipt()),
      })),
      [ses2.sessionId]: awaitSleepPromise(200, () => txResFuse.ses2).then(() => ({
        status: true,
        block: 1,
        fee: 100n,
        receipt: Object.assign(getTestReceipt()),
      })),
      [ses3.sessionId]: awaitSleepPromise(200, () => txResFuse.ses3).then(() => {
        throw "test error";
      }),
    };
    globalStubs["watchClaimTx"] = sinon.stub(EthWalletManager.prototype, "watchClaimTx").callsFake((claimTx) => txResults[claimTx.session]);

    let claimed: {[s: string]: EthClaimInfo} = {};
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionClaimed, 100, "test-task", (claimInfo: EthClaimInfo) => {
      claimed[claimInfo.session] = claimInfo;
    });

    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();

    txResFuse.ses1 = true;
    await awaitSleepPromise(500, () => !!claimed[ses1.sessionId]);
    expect(claimed[ses1.sessionId]?.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED, "unexpected ses1 claim status");

    txResFuse.ses2 = true;
    await awaitSleepPromise(500, () => !!claimed[ses2.sessionId]);
    expect(claimed[ses2.sessionId]?.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED, "unexpected ses2 claim status");

    txResFuse.ses3 = true;
    let claim3 = claimManager.getTransactionQueue().filter(t => t.session === ses3.sessionId)[0];
    await awaitSleepPromise(500, () => claim3?.claim.claimStatus === ClaimTxStatus.FAILED);
    expect(claim3?.claim.claimStatus).to.equal(ClaimTxStatus.FAILED, "unexpected ses3 claim status");
  });

  it("Create session claim, Invalid: session not claimable", async () => {
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    let testSession = await addTestSession(FaucetSessionStatus.FAILED, null);

    let error: FaucetError = null;
    try {
      await claimManager.createSessionClaim(testSession, {});
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error.getCode()).to.equal("NOT_CLAIMABLE", "unexpected error code");
    expect(claimManager.getTransactionQueue().length).to.equal(0, "unexpected queue count");
  });

  it("Create session claim, Invalid: already claiming", async () => {
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionClaim, 100, "test-task", (claimInfo: EthClaimInfo) => {
      return sleepPromise(50);
    });
    let testSession = await addTestSession(FaucetSessionStatus.CLAIMABLE, null);
    claimManager.createSessionClaim(testSession, {});

    let error: FaucetError = null;
    try {
      await claimManager.createSessionClaim(testSession, {});
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error.getCode()).to.equal("RACE_CLAIMING", "unexpected error code");
    expect(claimManager.getTransactionQueue().length).to.equal(1, "unexpected queue count");
  });

  it("Create session claim, Invalid: amount too low", async () => {
    faucetConfig.minDropAmount = 200;
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    let testSession = await addTestSession(FaucetSessionStatus.CLAIMABLE, null);

    let error: FaucetError = null;
    try {
      await claimManager.createSessionClaim(testSession, {});
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error.getCode()).to.equal("AMOUNT_TOO_LOW", "unexpected error code");
    expect(claimManager.getTransactionQueue().length).to.equal(0, "unexpected queue count");
  });

  it("Create session claim: Trim too high amount", async () => {
    faucetConfig.maxDropAmount = 50;
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    let testSession = await addTestSession(FaucetSessionStatus.CLAIMABLE, null);

    let claim = await claimManager.createSessionClaim(testSession, {});
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.QUEUE, "unexpected claim status");
    expect(claim.amount).to.equal("50", "unexpected claim amount");
    expect(claimManager.getTransactionQueue().length).to.equal(1, "unexpected queue count");

    let sessionData = await ServiceManager.GetService(SessionManager).getSessionData(testSession.sessionId);
    expect(sessionData.status).to.equal(FaucetSessionStatus.CLAIMING, "unexpected session status");
    expect(sessionData.dropAmount).to.equal("50", "unexpected session drop amount");
  });

  it("Queue processing: Check processing if wallet not ready (skip)", async () => {
    faucetConfig.ethQueueNoFunds = true;
    
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    let testSession = await addTestSession(FaucetSessionStatus.CLAIMABLE, null);

    let claim = await claimManager.createSessionClaim(testSession, {});
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.QUEUE, "unexpected claim status before processQueue");
    
    globalStubs["getWalletState"] = sinon.stub(EthWalletManager.prototype, "getWalletState").returns({
      ready: false,
      nonce: 0,
      balance: 0n,
      nativeBalance: 0n,
    });
    await claimManager.processQueue();

    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.QUEUE, "unexpected claim status after processQueue");
  });

  it("Queue processing: Check processing if wallet not ready (fail)", async () => {
    faucetConfig.ethQueueNoFunds = false;

    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    let testSession = await addTestSession(FaucetSessionStatus.CLAIMABLE, null);

    let claim = await claimManager.createSessionClaim(testSession, {});
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.QUEUE, "unexpected claim status before processQueue");
    
    globalStubs["getWalletState"] = sinon.stub(EthWalletManager.prototype, "getWalletState").returns({
      ready: false,
      nonce: 0,
      balance: 0n,
      nativeBalance: 0n,
    });
    await claimManager.processQueue();

    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.FAILED, "unexpected claim status after processQueue");
    expect(claim.claim.txError).to.matches(/RPC is currently unreachable/, "unexpected claim error message");
  });

  it("Queue processing: Check processing if wallet is out of funds (fail)", async () => {
    faucetConfig.ethQueueNoFunds = false;

    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    let testSession = await addTestSession(FaucetSessionStatus.CLAIMABLE, null);

    let claim = await claimManager.createSessionClaim(testSession, {});
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.QUEUE, "unexpected claim status before processQueue");
    
    globalStubs["getWalletState"] = sinon.stub(EthWalletManager.prototype, "getWalletState").returns({
      ready: true,
      nonce: 0,
      balance: 10n,
      nativeBalance: 10n,
    });
    await claimManager.processQueue();

    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.FAILED, "unexpected claim status after processQueue");
    expect(claim.claim.txError).to.matches(/wallet is out of funds/, "unexpected claim error message");
  });

  it("Queue processing: Check processing if transaction fails unexpectedly (fail)", async () => {
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    let testSession = await addTestSession(FaucetSessionStatus.CLAIMABLE, null);

    let claim = await claimManager.createSessionClaim(testSession, {});
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.QUEUE, "unexpected claim status before processQueue");
    
    globalStubs["getWalletState"] = sinon.stub(EthWalletManager.prototype, "getWalletState").returns({
      ready: true,
      nonce: 0,
      balance: 1000000000000000000n,
      nativeBalance: 1000000000000000000n,
    });
    globalStubs["EthWalletManager.sendClaimTx"].returns(Promise.reject("test error"));

    await claimManager.processQueue();

    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.FAILED, "unexpected claim status after processQueue");
    expect(claim.claim.txError).to.matches(/test error/, "unexpected claim error message");
  });

  it("Queue processing: Check processing if transaction creation fails unexpectedly", async () => {
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    let testSession = await addTestSession(FaucetSessionStatus.CLAIMABLE, null);

    let claim = await claimManager.createSessionClaim(testSession, {});
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.QUEUE, "unexpected claim status before processQueue");
    
    globalStubs["getWalletState"] = sinon.stub(EthWalletManager.prototype, "getWalletState").returns({
      ready: true,
      nonce: 0,
      balance: 1000000000000000000n,
      nativeBalance: 1000000000000000000n,
    });
    let claimFuse = createFuse();
    globalStubs["EthWalletManager.sendClaimTx"].returns(fusedSleep(claimFuse, 500).then(() => {
      throw "test error";
    }));

    let processPromise = claimManager.processQueue();
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.PROCESSING, "unexpected claim status during processQueue");

    claimFuse();
    await processPromise;

    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.FAILED, "unexpected claim status after processQueue");
    expect(claim.claim.txError).to.matches(/test error/, "unexpected claim error message");
  });

  it("Queue processing: Check processing if transaction processing fails unexpectedly", async () => {
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    let testSession = await addTestSession(FaucetSessionStatus.CLAIMABLE, null);

    let claim = await claimManager.createSessionClaim(testSession, {});
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.QUEUE, "unexpected claim status before processQueue");
    
    globalStubs["getWalletState"] = sinon.stub(EthWalletManager.prototype, "getWalletState").returns({
      ready: true,
      nonce: 0,
      balance: 1000000000000000000n,
      nativeBalance: 1000000000000000000n,
    });
    let claimFuse = createFuse();
    globalStubs["EthWalletManager.sendClaimTx"].returns(Promise.resolve({
      txHash: "0xdb5950d44ceed2a5eb77970104b974b8c4234d7110fd8d0008edb2cfff835f01",
      txPromise: fusedSleep(claimFuse, 500).then(() => {
        throw "test error";
      }),
    } as TransactionResult));

    await claimManager.processQueue();

    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.PENDING, "unexpected claim status after processQueue");

    claimFuse();
    await awaitSleepPromise(100, () => claim.claim.claimStatus === ClaimTxStatus.FAILED);
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.FAILED, "unexpected claim status after tx failure");
    expect(claim.claim.txError).to.matches(/test error/, "unexpected claim error message");
  });

  it("Queue processing: Check processing for successful transaction", async () => {
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    let testSession = await addTestSession(FaucetSessionStatus.CLAIMABLE, null);

    let claim = await claimManager.createSessionClaim(testSession, {});
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.QUEUE, "unexpected claim status before processQueue");
    
    globalStubs["getWalletState"] = sinon.stub(EthWalletManager.prototype, "getWalletState").returns({
      ready: true,
      nonce: 0,
      balance: 1000000000000000000n,
      nativeBalance: 1000000000000000000n,
    });
    let claimFuse = createFuse();
    globalStubs["EthWalletManager.sendClaimTx"].returns(Promise.resolve({
      txHash: "0xdb5950d44ceed2a5eb77970104b974b8c4234d7110fd8d0008edb2cfff835f01",
      txPromise: fusedSleep(claimFuse, 500).then(() => ({
        status: true,
        block: 1,
        fee: 100n,
        receipt: getTestReceipt(),
      })),
    } as TransactionResult));

    await claimManager.processQueue();
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.PENDING, "unexpected claim status after processQueue");

    claimFuse();
    await awaitSleepPromise(1000, () => claim.claim.claimStatus === ClaimTxStatus.CONFIRMED);

    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED, "unexpected claim status after tx confirmation");
  });

  it("Notification Websocket: Check initialization (invalid url)", async () => {
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();

    let fakeWs1 = await injectFakeWebSocket("/ws/claim?session=session=[]12&&session=false", "8.8.8.8");
    let errorMsg = fakeWs1.getSentMessage("error");
    expect(errorMsg.length).to.equal(1, "no error message returned");
    expect(errorMsg[0].data.reason).to.matches(/session not found/, "unexpected error message returned");
  });

  it("Notification Websocket: Check initialization (missing session id)", async () => {
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();

    let fakeWs1 = await injectFakeWebSocket("/ws/claim", "8.8.8.8");
    let errorMsg = fakeWs1.getSentMessage("error");
    expect(errorMsg.length).to.equal(1, "no error message returned");
    expect(errorMsg[0].data.reason).to.matches(/session not found/, "unexpected error message returned");
  });

  it("Notification Websocket: Check claim notifications", async () => {
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    let testSession1 = await addTestSession(FaucetSessionStatus.CLAIMABLE, null);
    let claim1 = await claimManager.createSessionClaim(testSession1, {});
    let testSession2 = await addTestSession(FaucetSessionStatus.CLAIMABLE, null);
    let claim2 = await claimManager.createSessionClaim(testSession2, {});
    
    globalStubs["getWalletState"] = sinon.stub(EthWalletManager.prototype, "getWalletState").returns({
      ready: true,
      nonce: 0,
      balance: 1000000000000000000n,
      nativeBalance: 1000000000000000000n,
    });
    let claimFuses = [];
    globalStubs["EthWalletManager.sendClaimTx"].callsFake(() => {
      let claimFuse = createFuse();
      claimFuses.push(claimFuse);
      return Promise.resolve({
        txHash: "0xdb5950d44ceed2a5eb77970104b974b8c4234d7110fd8d0008edb2cfff835f01",
        txPromise: fusedSleep(claimFuse, 500).then(() => ({
          status: true,
          block: 1,
          fee: 100n,
          receipt: getTestReceipt(),
        })),
      } as TransactionResult);
    });

    let fakeWs2 = await injectFakeWebSocket("/ws/claim?session=" + testSession2.sessionId, "8.8.8.8");
    expect(fakeWs2.isReady).to.equal(true, "websocket2 was closed");

    await claimManager.processQueue();
    expect(claim1.claim.claimStatus).to.equal(ClaimTxStatus.PENDING, "unexpected claim1 status after processQueue");
    expect(claim2.claim.claimStatus).to.equal(ClaimTxStatus.PENDING, "unexpected claim2 status after processQueue");

    let fakeWs1 = await injectFakeWebSocket("/ws/claim?session=" + testSession1.sessionId, "8.8.8.8");
    expect(fakeWs1.isReady).to.equal(true, "websocket1 was closed");
    await awaitSleepPromise(100, () => fakeWs1.getSentMessage("update").length > 1);
    let updateMsg = fakeWs1.getSentMessage("update");
    expect(updateMsg.length).to.equal(1, "no update message sent");
    expect(updateMsg[updateMsg.length - 1].data.processedIdx).to.equal(2, "unexpected processed count in last update");

    updateMsg = fakeWs2.getSentMessage("update");
    expect(updateMsg.length).to.equal(1, "no update message sent");
    expect(updateMsg[updateMsg.length - 1].data.processedIdx).to.equal(2, "unexpected processed count in last update");

    claimFuses[0]();
    await awaitSleepPromise(100, () => claim1.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    await claimManager.processQueue();
    await awaitSleepPromise(100, () => fakeWs2.getSentMessage("update").length > 2);

    updateMsg = fakeWs2.getSentMessage("update");
    expect(updateMsg.length).to.equal(2, "no update message sent on 1st confirmation");
    expect(updateMsg[updateMsg.length - 1].data.processedIdx).to.equal(2, "unexpected processed count in last update");
    expect(updateMsg[updateMsg.length - 1].data.confirmedIdx).to.equal(1, "unexpected confirmed count in last update");

    claimFuses[1]();
    await awaitSleepPromise(100, () => claim2.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    await claimManager.processQueue();
    await awaitSleepPromise(100, () => fakeWs2.getSentMessage("update").length > 3);

    updateMsg = fakeWs2.getSentMessage("update");
    expect(updateMsg.length).to.equal(3, "no update message sent on 2nd confirmation");
    expect(updateMsg[updateMsg.length - 1].data.processedIdx).to.equal(2, "unexpected processed count in last update");
    expect(updateMsg[updateMsg.length - 1].data.confirmedIdx).to.equal(2, "unexpected confirmed count in last update");

    let errorMsg = fakeWs2.getSentMessage("error");
    expect(errorMsg.length).to.equal(1, "no error message sent after confirmation");
  });

  it("Notification Websocket: Check ping timeout handling", async () => {
    EthClaimNotificationClient.cfgPingInterval = 1;
    EthClaimNotificationClient.cfgPingTimeout = 2;
    globalStubs["FakeWebSocket.ping"] = sinon.stub(FakeWebSocket.prototype, "ping");
    globalStubs["FakeWebSocket.pong"] = sinon.stub(FakeWebSocket.prototype, "pong");

    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    let testSession1 = await addTestSession(FaucetSessionStatus.CLAIMABLE, null);
    await claimManager.createSessionClaim(testSession1, {});

    let fakeSocket = await injectFakeWebSocket("/ws/claim?session=" + testSession1.sessionId, "8.8.8.8");
    expect(fakeSocket.isReady).to.equal(true, "websocket1 was closed");

    fakeSocket.emit("pong");
    fakeSocket.emit("ping");
    expect(globalStubs["FakeWebSocket.pong"].called).to.equal(true, "pong not called");
    expect(globalStubs["FakeWebSocket.ping"].called).to.equal(false, "unexpected ping call");
    await awaitSleepPromise(1100, () => globalStubs["FakeWebSocket.ping"].called);
    expect(fakeSocket.isReady).to.equal(true, "client not ready");
    expect(globalStubs["FakeWebSocket.ping"].called).to.equal(true, "ping not called");
    expect(fakeSocket.isReady).to.equal(true, "unexpected close call");
    await awaitSleepPromise(3000, () => !fakeSocket.isReady);
    expect(fakeSocket.isReady).to.equal(false, "client is still ready");
  }).timeout(5000);

  it("Notification Websocket: Check client error handling", async () => {
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    let testSession1 = await addTestSession(FaucetSessionStatus.CLAIMABLE, null);
    await claimManager.createSessionClaim(testSession1, {});

    let fakeSocket = await injectFakeWebSocket("/ws/claim?session=" + testSession1.sessionId, "8.8.8.8");
    expect(fakeSocket.isReady).to.equal(true, "websocket1 was closed");

    fakeSocket.emit("error", "test error");
    fakeSocket.emit("close");
    expect(fakeSocket.isReady).to.equal(false, "client still ready");
  });
  
});
