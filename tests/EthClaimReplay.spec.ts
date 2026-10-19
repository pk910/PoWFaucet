import 'mocha';
import { expect } from 'chai';
import { FetchError } from 'node-fetch';
import { unbindTestStubs, awaitSleepPromise, bindTestStubs, loadDefaultTestConfig } from './common.js';
import { faucetConfig } from '../src/config/FaucetConfig.js';
import { EthWalletManager } from '../src/eth/EthWalletManager.js';
import { ServiceManager } from '../src/common/ServiceManager.js';
import { ClaimTxStatus, EthClaimManager } from '../src/eth/EthClaimManager.js';
import { FakeProvider } from './stubs/FakeProvider.js';
import { FaucetDatabase } from '../src/db/FaucetDatabase.js';
import { FaucetSessionStatus, FaucetSessionStoreData } from '../src/session/FaucetSession.js';
import { ModuleManager } from '../src/modules/ModuleManager.js';

/**
 * Claim transactions are signed once: the bytes go into the session rows before the broadcast,
 * are retried as they are, and are replayed after a restart. Nothing here builds a second
 * transaction for a claim whose first one may be out.
 */
describe("ETH Claim Replay", () => {
  let globalStubs;
  let fakeProvider: FakeProvider;
  const TX_HASH_RSP = "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337";

  beforeEach(async () => {
    globalStubs = bindTestStubs({});
    fakeProvider = new FakeProvider();
    fakeProvider.injectResponse("eth_getTransactionByHash", (payload) => ({ hash: payload.params[0] })); // the node knows what it was sent, unless a test says otherwise
    loadDefaultTestConfig();
    faucetConfig.faucetStats = null;
    faucetConfig.ethWalletKey = "feedbeef12340000feedbeef12340000feedbeef12340000feedbeef12340000";
    faucetConfig.ethRpcHost = fakeProvider;
    faucetConfig.ethChainId = 1337;
    faucetConfig.spareFundsAmount = 0;
    faucetConfig.ethTxGasLimit = 21000;
    faucetConfig.ethTxMaxFee = 100000000000; // 100 gwei
    faucetConfig.ethTxPrioFee = 2000000000; // 2 gwei
    faucetConfig.minDropAmount = 1000;
    fakeProvider.injectResponse("eth_blockNumber", "0x1000");
    fakeProvider.injectResponse("eth_getBalance", "1000000000000000000"); // 1 ETH
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    await ServiceManager.GetService(FaucetDatabase).initialize();
    await ServiceManager.GetService(ModuleManager).initialize();
  });
  afterEach(async () => {
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
  });

  function receipt(status: string = "0x1"): any {
    return {
      blockHash: "0xfce202c4104864d81d8bd78b7202a77e5dca634914a3fd6636f2765d65fa9a07",
      blockNumber: "0x8aa5ae",
      effectiveGasPrice: "0x3b9aca00",
      gasUsed: "0x5208",
      logs: [],
      status: status,
      transactionHash: TX_HASH_RSP,
    };
  }

  function sessionData(id: string = "f081154a-3b93-4972-9ae7-b83f3307bb0f"): FaucetSessionStoreData {
    return {
      sessionId: id,
      status: FaucetSessionStatus.CLAIMABLE,
      startTime: Math.floor(new Date().getTime() / 1000),
      targetAddr: "0x0000000000000000000000000000000000001337",
      dropAmount: "1337",
      remoteIP: "8.8.8.8",
      tasks: [], data: {}, claim: null,
    };
  }

  async function startWallet(): Promise<EthWalletManager> {
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    await ethWalletManager.initialize();
    await ethWalletManager.loadWalletState();
    (ethWalletManager as any).txReceiptPollInterval = 100;
    return ethWalletManager;
  }

  it("writes the signed transaction to the session before broadcasting and retries the same bytes", async () => {
    let sends: any[] = [];
    let sendFails = true;
    let receiptReady = false;
    fakeProvider.injectResponse("eth_sendRawTransaction", (payload) => {
      sends.push(payload.params[0]);
      if(sendFails)
        return { _throw: new FetchError("invalid json response", "invalid-json") };
      return TX_HASH_RSP;
    });
    fakeProvider.injectResponse("eth_getTransactionReceipt", () => receiptReady ? receipt() : null);
    await startWallet();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    let database = ServiceManager.GetService(FaucetDatabase);

    let claim = await claimManager.createSessionClaim(sessionData(), {});
    claimManager.processQueue();
    await awaitSleepPromise(2000, () => sends.length >= 1);
    expect(sends.length).to.be.greaterThanOrEqual(1, "no broadcast attempt");
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.PROCESSING, "still processing while the broadcast fails");

    // the broadcast has failed so far, yet the session row already holds the exact bytes
    let storedSession = await database.getSession(claim.session);
    expect(storedSession.status).to.equal(FaucetSessionStatus.CLAIMING);
    expect(storedSession.claim.claimStatus).to.equal(ClaimTxStatus.PROCESSING);
    expect("0x" + storedSession.claim.txHex).to.equal(sends[0], "the row holds the broadcast bytes");
    expect(storedSession.claim.txHash).to.equal(claim.claim.txHash, "and the hash computed from them");
    expect(storedSession.claim.txNonce).to.equal(42);

    sendFails = false;
    await awaitSleepPromise(4000, () => claim.claim.claimStatus === ClaimTxStatus.PENDING);
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.PENDING);
    receiptReady = true;
    await awaitSleepPromise(2000, () => claim.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED);

    // every attempt sent the same bytes: no second nonce after an ambiguous failure
    expect(sends.length).to.be.greaterThanOrEqual(2, "a retry was expected");
    expect(new Set(sends).size).to.equal(1, "all attempts broadcast the identical transaction");
    expect(ServiceManager.GetService(EthWalletManager).getWalletState().nonce).to.equal(43);
  }).timeout(12000);

  it("writes a batch's rows in one statement and leaves other sessions alone", async () => {
    let database = ServiceManager.GetService(FaucetDatabase);
    let a = sessionData("00000000-0000-0000-0000-00000000000a");
    let b = sessionData("00000000-0000-0000-0000-00000000000b");
    let c = sessionData("00000000-0000-0000-0000-00000000000c");
    for(let s of [a, b]) {
      s.status = FaucetSessionStatus.CLAIMING;
      s.claim = { claimIdx: 1, claimStatus: ClaimTxStatus.PROCESSING, claimTime: s.startTime };
      await database.updateSession(s);
    }
    c.claim = { claimIdx: 3, claimStatus: ClaimTxStatus.QUEUE, claimTime: c.startTime };
    await database.updateSession(c); // still claimable: not ours to pay

    // a batch with a member that is not claiming: nothing is written, not even for the members that are
    let changed = await database.updateClaimDataBulk([
      { sessionId: a.sessionId, claimData: { ...a.claim, txHash: "0xbad", txNonce: 6, txHex: "bad" } },
      { sessionId: b.sessionId, claimData: { ...b.claim, txHash: "0xbad", txNonce: 6, txHex: "bad" } },
      { sessionId: c.sessionId, claimData: { ...c.claim, txHash: "0xbad" } },
    ]);
    expect(changed).to.equal(0, "all or nothing");
    expect((await database.getSession(a.sessionId)).claim.txHash).to.equal(undefined, "no row took the transaction");

    changed = await database.updateClaimDataBulk([
      { sessionId: a.sessionId, claimData: { ...a.claim, txHash: "0xaa", txNonce: 7, txHex: "aa", txCalls: { offset: 0, count: 1 } } },
      { sessionId: b.sessionId, claimData: { ...b.claim, txHash: "0xaa", txNonce: 7, txHex: "aa", txCalls: { offset: 1, count: 1 } } },
    ]);
    expect(changed).to.equal(2);
    let rowA = await database.getSession(a.sessionId);
    let rowB = await database.getSession(b.sessionId);
    let rowC = await database.getSession(c.sessionId);
    expect(rowA.claim.txHash).to.equal("0xaa");
    expect(rowA.claim.txCalls).to.deep.equal({ offset: 0, count: 1 });
    expect(rowB.claim.txHash).to.equal("0xaa");
    expect(rowB.claim.txCalls).to.deep.equal({ offset: 1, count: 1 });
    expect(rowA.status).to.equal(FaucetSessionStatus.CLAIMING, "still claiming until the broadcast is accepted");
    expect(rowC.claim.txHash).to.equal(undefined, "a session that is not claiming is not touched");
  });

  it("keeps a claim pending while every broadcast answer is lost, and settles it by receipt", async () => {
    let sends = 0;
    let answerLost = true;
    let receiptReady = false;
    fakeProvider.injectResponse("eth_sendRawTransaction", () => {
      sends++;
      if(answerLost)
        return { _throw: new FetchError("socket hang up", "system") };
      return TX_HASH_RSP;
    });
    fakeProvider.injectResponse("eth_getTransactionReceipt", () => receiptReady ? receipt() : null);
    await startWallet();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();

    let claim = await claimManager.createSessionClaim(sessionData(), {});
    await claimManager.processQueue(); // four attempts without an answer (~6 s)
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.PENDING, "an unanswered broadcast is not a failure");
    expect(sends).to.be.greaterThanOrEqual(4);
    expect(ServiceManager.GetService(EthWalletManager).getWalletState().nonce).to.equal(43, "the nonce stays reserved");

    // the network comes back: the receipt watch has kept re-sending the same bytes
    let sendsBefore = sends;
    answerLost = false;
    await awaitSleepPromise(1000, () => sends > sendsBefore);
    expect(sends).to.be.greaterThan(sendsBefore, "re-sent from the receipt watch");
    receiptReady = true;
    await awaitSleepPromise(2000, () => claim.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED);
  }).timeout(15000);

  it("re-sends the stored bytes while the node does not know the pending transaction", async () => {
    let sends = 0;
    let nodeKnowsIt = false;
    let receiptReady = false;
    fakeProvider.injectResponse("eth_sendRawTransaction", () => { sends++; return TX_HASH_RSP; }); // accepted every time
    fakeProvider.injectResponse("eth_getTransactionByHash", (payload) => nodeKnowsIt ? { hash: payload.params[0] } : null);
    fakeProvider.injectResponse("eth_getTransactionReceipt", () => receiptReady ? receipt() : null);
    await startWallet();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();

    let claim = await claimManager.createSessionClaim(sessionData(), {});
    await claimManager.processQueue();
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.PENDING);
    // the tick returns once the claim rows are written; the receipt watch may have polled (and re-sent) by then
    expect(sends).to.be.greaterThanOrEqual(1, "accepted at once");

    // the pool lost it (evicted, restarted, never gossiped): every poll puts the same bytes back
    await awaitSleepPromise(2000, () => sends >= 3);
    expect(sends).to.be.greaterThanOrEqual(3, "re-sent from the receipt watch");

    // the node has it again: no more re-sends, the receipt settles the claim
    nodeKnowsIt = true;
    await awaitSleepPromise(300, () => false);
    let sendsBefore = sends;
    await awaitSleepPromise(400, () => false);
    expect(sends).to.be.lessThanOrEqual(sendsBefore + 1, "a known transaction is not re-sent");
    receiptReady = true;
    await awaitSleepPromise(2000, () => claim.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED);
  }).timeout(15000);

  it("keeps polling through receipt lookup errors and settles by the receipt", async () => {
    let receiptCalls = 0;
    fakeProvider.injectResponse("eth_sendRawTransaction", TX_HASH_RSP);
    fakeProvider.injectResponse("eth_getTransactionReceipt", () => {
      receiptCalls++;
      if(receiptCalls <= 3)
        throw "transaction indexing is in progress"; // geth, while its transaction index lags: a JSON-RPC error, not a transport error
      return receipt();
    });
    await startWallet();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();

    let claim = await claimManager.createSessionClaim(sessionData(), {});
    await claimManager.processQueue();
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.PENDING);
    await awaitSleepPromise(3000, () => claim.claim.claimStatus !== ClaimTxStatus.PENDING);
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED, "a lookup error is not a verdict on the transaction");
    expect(receiptCalls).to.be.greaterThanOrEqual(4);
  });

  it("admits a claim exactly once for a session the database has never seen", async () => {
    fakeProvider.injectResponse("eth_sendRawTransaction", TX_HASH_RSP);
    await startWallet();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    // no row for this session: two requests race for the first write of it
    let session = sessionData("0d9f0c2e-6a1b-4f58-9d3e-7b2c1a5e8f40");
    let results = await Promise.allSettled([
      claimManager.createSessionClaim({ ...session }, {}),
      claimManager.createSessionClaim({ ...session, claim: null }, {}),
    ]);
    let admitted = results.filter((r) => r.status === "fulfilled");
    let refused = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(admitted.length).to.equal(1, "exactly one claim for the session");
    expect(refused.length).to.equal(1);
    expect(refused[0].reason?.getCode?.()).to.equal("RACE_CLAIMING");
    expect(claimManager.getTransactionQueue().filter((c) => c.session === session.sessionId).length).to.equal(1, "one entry in the queue");
    let row = await ServiceManager.GetService(FaucetDatabase).getSession(session.sessionId);
    expect(row.status).to.equal(FaucetSessionStatus.CLAIMING, "the row was created as claiming");
  });

  it("admits a claim exactly once: the row is the arbiter", async () => {
    fakeProvider.injectResponse("eth_sendRawTransaction", TX_HASH_RSP);
    fakeProvider.injectResponse("eth_getTransactionReceipt", receipt());
    await startWallet();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    let session = sessionData();
    await ServiceManager.GetService(FaucetDatabase).updateSession(session);
    let first = await claimManager.createSessionClaim({ ...session }, {});
    expect(first.claim.claimStatus).to.equal(ClaimTxStatus.QUEUE);
    let err: any;
    try { await claimManager.createSessionClaim({ ...session, claim: null }, {}); } catch(ex) { err = ex; }
    expect(err?.getCode?.()).to.equal("RACE_CLAIMING", "the second request finds the row claiming already");
  });

  it("does not broadcast when a claim row did not take the signed transaction, and frees the nonce", async () => {
    let sends = 0;
    fakeProvider.injectResponse("eth_sendRawTransaction", () => { sends++; return TX_HASH_RSP; });
    await startWallet();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();
    let database = ServiceManager.GetService(FaucetDatabase);
    let claim = await claimManager.createSessionClaim(sessionData(), {});
    // the row leaves "claiming" behind the queue's back (an operator, another process)
    await database.updateClaimData(claim.session, { ...claim.claim, claimStatus: ClaimTxStatus.FAILED });
    await claimManager.processQueue();
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.FAILED);
    expect(claim.claim.txError).to.match(/0 of 1 claim rows accepted/);
    expect(sends).to.equal(0, "nothing left the faucet");
    expect(claim.claim.txHash).to.equal(undefined, "the claim carries no transaction");
    expect(ServiceManager.GetService(EthWalletManager).getWalletState().nonce).to.equal(42, "the nonce was rolled back");
  });

  it("treats 'already known' as sent and settles by receipt", async () => {
    let sends = 0;
    fakeProvider.injectResponse("eth_sendRawTransaction", () => {
      sends++;
      throw "already known";
    });
    fakeProvider.injectResponse("eth_getTransactionReceipt", receipt());
    await startWallet();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();

    let claim = await claimManager.createSessionClaim(sessionData(), {});
    await claimManager.processQueue();
    await awaitSleepPromise(2000, () => claim.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED);
    expect(sends).to.equal(1, "no retry for a transaction the node already has");
  });

  it("fails the claim on a validation error, and frees the nonce", async () => {
    let sends = 0;
    fakeProvider.injectResponse("eth_sendRawTransaction", () => {
      sends++;
      throw "insufficient funds for gas * price + value"; // the node looked at the bytes: they are nowhere
    });
    await startWallet();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();

    let claim = await claimManager.createSessionClaim(sessionData(), {});
    await claimManager.processQueue();
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.FAILED, "a claim is in one transaction only: refused means failed, never queued again");
    expect(claim.claim.txError).to.match(/insufficient funds/);
    expect(claim.claim.txHash).to.not.equal(undefined, "the claim keeps the transaction it was in");
    expect(sends).to.equal(1, "a rejection is not retried");
    expect(ServiceManager.GetService(EthWalletManager).getWalletState().nonce).to.equal(42, "nonce reloaded from the node");
    await awaitSleepPromise(500, () => false);
    let storedSession = await ServiceManager.GetService(FaucetDatabase).getSession(claim.session);
    expect(storedSession.status).to.equal(FaucetSessionStatus.FAILED, "a failed row is not replayed after a restart");
  });

  it("ends a transaction whose nonce was spent by another one as unknown, never as retryable", async () => {
    fakeProvider.injectResponse("eth_sendRawTransaction", TX_HASH_RSP);
    fakeProvider.injectResponse("eth_getTransactionReceipt", null);
    fakeProvider.injectResponse("eth_getTransactionCount", (payload) => payload.params[1] === "latest" ? 43 : 42);
    await startWallet();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();

    let claim = await claimManager.createSessionClaim(sessionData(), {});
    await claimManager.processQueue();
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.PENDING);
    await awaitSleepPromise(2000, () => claim.claim.claimStatus === ClaimTxStatus.UNKNOWN);
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.UNKNOWN, "a spent nonce without our receipt is not proof of non-payment");
    expect(claim.claim.txError).to.match(/outcome unknown.*nonce 42 was spent/);
    await awaitSleepPromise(500, () => false);
    let row = await ServiceManager.GetService(FaucetDatabase).getSession(claim.session);
    expect(row.status).to.equal(FaucetSessionStatus.FINISHED, "consumed: counts towards the limits, cannot be claimed again");
  });

  it("refuses a template that sends more value than the claims amount to", async () => {
    let sends = 0;
    fakeProvider.injectResponse("eth_sendRawTransaction", () => { sends++; return TX_HASH_RSP; });
    faucetConfig.ethClaimTx = {
      calls: [{ type: "call", to: "0x00000000000000000000000000000000000000cc", abi: ["function claim(address to, uint256 amount) payable"], fn: "claim", args: ["{target}", "{amount}"], value: "5000" }],
    };
    await startWallet();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();

    let claim = await claimManager.createSessionClaim(sessionData(), {});
    await claimManager.processQueue();
    expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.FAILED);
    expect(claim.claim.txError).to.match(/sends 5000 wei, more than the claims' 1337/);
    expect(sends).to.equal(0, "nothing signed or sent");
    expect(ServiceManager.GetService(EthWalletManager).getWalletState().nonce).to.equal(42, "nonce not reserved");
  });

  it("replays a signed transaction found in a session row after a restart instead of paying again", async () => {
    let database = ServiceManager.GetService(FaucetDatabase);
    let storedHex = "02f86f8205392a847735940085174876e80082520894000000000000000000000000000000000000133782053980c001a04787689fdfc3803c758feaaa7989761900c274488f1f656ec7aa277ae37294efa038b6fc22a7a4c1f0bf537a989f00c907413f5c3e333807e1bbadfb08f74926f5";
    let storedHash = "0xabababababababababababababababababababababababababababababababab";
    let session = sessionData();
    session.status = FaucetSessionStatus.CLAIMING;
    // the row as the crash left it: signed and stored, broadcast outcome unknown
    session.claim = { claimIdx: 1, claimStatus: ClaimTxStatus.PROCESSING, claimTime: session.startTime, txHash: storedHash, txNonce: 42, txHex: storedHex };
    await database.updateSession(session);

    let sends: any[] = [];
    let nonceReloads = 0;
    fakeProvider.injectResponse("eth_sendRawTransaction", (payload) => { sends.push(payload.params[0]); return storedHash; });
    fakeProvider.injectResponse("eth_getTransactionReceipt", Object.assign(receipt(), { transactionHash: storedHash }));
    fakeProvider.injectResponse("eth_getTransactionCount", (payload) => {
      if(payload.params[1] === "pending" && sends.length > 0)
        nonceReloads++;
      return sends.length > 0 ? 43 : 42; // the replayed transaction took nonce 42
    });
    await startWallet();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();

    let restored = claimManager.getTransactionQueue();
    expect(restored.length).to.equal(1, "the stored claim is tracked");
    expect(restored[0].claim.txHash).to.equal(storedHash, "hash taken from the session row");
    expect(sends).to.deep.equal(["0x" + storedHex], "exactly the stored bytes were broadcast, once, before initialize() returned");
    expect(nonceReloads).to.be.greaterThanOrEqual(1, "the wallet nonce was reloaded after the replay");
    expect(ServiceManager.GetService(EthWalletManager).getWalletState().nonce).to.equal(43, "the queue continues after the replayed nonce");
    await awaitSleepPromise(2000, () => restored[0].claim.claimStatus === ClaimTxStatus.CONFIRMED);
    expect(restored[0].claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED);
    await awaitSleepPromise(500, () => false);
    let storedSession = await database.getSession(session.sessionId);
    expect(storedSession.status).to.equal(FaucetSessionStatus.FINISHED);
  });
});
