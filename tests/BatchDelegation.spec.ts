import 'mocha';
import { expect } from 'chai';
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, getCreate2Address, keccak256, parseTransaction } from 'viem';
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
import { BATCHER_SALT, DETERMINISTIC_DEPLOYER, delegationCode, getBatcherAddress } from '../src/eth/claimtx/BatchDelegation.js';
import { BATCHER_ABI, BATCHER_BYTECODE, BATCHER_RUNTIME_BYTECODE } from '../src/eth/claimtx/BatcherArtifact.js';

/**
 * Batching through EIP-7702: the faucet deploys the batcher through the deterministic deployment
 * proxy when the chain lacks it, delegates its wallet's code to it, then pays batches by calling
 * `execute` on itself. Everything observable from the outside is the sequence of raw transactions.
 */
describe("ETH Claim Batching (EIP-7702)", () => {
  let globalStubs;
  let fakeProvider: FakeProvider;
  const WALLET = "0xCA9456991E0AA5d5321e88Bba44d405aAb401193"; // of the test key
  const BATCHER = getBatcherAddress();

  beforeEach(async () => {
    globalStubs = bindTestStubs({});
    fakeProvider = new FakeProvider();
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
    faucetConfig.ethClaimBatch = { maxClaims: 10, maxWaitSeconds: 0, gasLimit: 40000, gasLimitPerClaim: 40000 };
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

  function receipt(txHash: string, logs: any[] = []): any {
    return {
      blockHash: "0xfce202c4104864d81d8bd78b7202a77e5dca634914a3fd6636f2765d65fa9a07",
      blockNumber: "0x8aa5ae",
      effectiveGasPrice: "0x3b9aca00",
      gasUsed: "0x5208",
      logs,
      status: "0x1",
      transactionHash: txHash,
    };
  }

  function sessionData(id: string, target: string, amount: string): FaucetSessionStoreData {
    return {
      sessionId: id,
      status: FaucetSessionStatus.CLAIMABLE,
      startTime: Math.floor(new Date().getTime() / 1000),
      targetAddr: target,
      dropAmount: amount,
      remoteIP: "8.8.8.8",
      tasks: [], data: {}, claim: null,
    };
  }

  /** a chain: code per address, mined raw transactions, receipts by hash; `batchLogs` are emitted by a batch transaction */
  function fakeChain(opts: { deployerPresent: boolean; eip7702: boolean; batchLogs?: any[]; failFirstSend?: boolean }) {
    let code: {[addr: string]: string} = {};
    if(opts.deployerPresent)
      code[DETERMINISTIC_DEPLOYER.toLowerCase()] = "0x7fdeadbeef";
    let sent: { raw: string; hash: string; tx: any }[] = [];
    let logsByHash: {[hash: string]: any[]} = {};
    fakeProvider.injectResponse("eth_getCode", (payload) => code[payload.params[0].toLowerCase()] || "0x");
    let attempts: string[] = [];
    fakeProvider.injectResponse("eth_sendRawTransaction", (payload) => {
      let raw = payload.params[0];
      attempts.push(raw);
      if(opts.failFirstSend && attempts.length === 1)
        return { _throw: new FetchError("invalid json response", "invalid-json") }; // the node may or may not have taken it
      let tx: any = parseTransaction(raw);
      let hash = keccak256(raw); // what the faucet computes locally
      sent.push({ raw, hash, tx });
      if(tx.type !== "eip7702" && tx.to?.toLowerCase() === WALLET.toLowerCase() && opts.batchLogs)
        logsByHash[hash] = opts.batchLogs;
      // the chain's side effects
      if(tx.to?.toLowerCase() === DETERMINISTIC_DEPLOYER.toLowerCase() && opts.deployerPresent) {
        let salt = tx.data.substring(2, 66);
        let initCode = "0x" + tx.data.substring(66);
        // the deployer runs the initcode; the batcher's initcode leaves its runtime code behind
        code[getCreate2Address({ from: DETERMINISTIC_DEPLOYER, salt: ("0x" + salt) as `0x${string}`, bytecode: initCode as `0x${string}` }).toLowerCase()] = initCode === BATCHER_BYTECODE ? BATCHER_RUNTIME_BYTECODE : "0x60806040";
      }
      if(tx.type === "eip7702" && opts.eip7702) {
        for(let auth of tx.authorizationList)
          code[WALLET.toLowerCase()] = delegationCode(auth.address);
      }
      return hash;
    });
    fakeProvider.injectResponse("eth_getTransactionReceipt", (payload) => receipt(payload.params[0], logsByHash[payload.params[0]] || []));
    return { code, sent, logsByHash, attempts };
  }

  function executedLog(calls: number): any {
    return {
      address: WALLET,
      topics: encodeEventTopics({ abi: BATCHER_ABI, eventName: "BatchExecuted" }),
      data: encodeAbiParameters([{ type: "uint256" }], [BigInt(calls)]),
      logIndex: "0xff",
    };
  }

  function failedLog(index: number, to: string, amount: bigint): any {
    return {
      address: WALLET,
      topics: encodeEventTopics({ abi: BATCHER_ABI, eventName: "CallFailed", args: { index: BigInt(index) } }),
      data: encodeAbiParameters([{ type: "uint8" }, { type: "address" }, { type: "uint256" }], [0, to as `0x${string}`, amount]),
      logIndex: "0x" + index.toString(16),
    };
  }

  async function start(): Promise<{ wallet: EthWalletManager; claims: EthClaimManager }> {
    let wallet = ServiceManager.GetService(EthWalletManager);
    await wallet.initialize();
    await wallet.loadWalletState();
    (wallet as any).txReceiptPollInterval = 50;
    let claims = ServiceManager.GetService(EthClaimManager);
    await claims.initialize();
    return { wallet, claims };
  }

  it("derives the batcher address from the bytecode alone", () => {
    expect(BATCHER).to.equal(getCreate2Address({ from: DETERMINISTIC_DEPLOYER, salt: BATCHER_SALT, bytecode: BATCHER_BYTECODE as `0x${string}` }));
    expect(delegationCode(BATCHER)).to.equal("0xef0100" + BATCHER.substring(2).toLowerCase());
  });

  it("deploys the batcher, delegates the wallet, then pays a batch through execute on itself", async () => {
    // the batcher ran and reports the second sub-call as failed
    let chain = fakeChain({ deployerPresent: true, eip7702: true, batchLogs: [
      failedLog(1, "0x0000000000000000000000000000000000001002", 2000n),
      executedLog(2),
    ] });
    let { wallet, claims } = await start();
    let c1 = await claims.createSessionClaim(sessionData("00000000-0000-0000-0000-000000000001", "0x0000000000000000000000000000000000001001", "1000"), {});
    let c2 = await claims.createSessionClaim(sessionData("00000000-0000-0000-0000-000000000002", "0x0000000000000000000000000000000000001002", "2000"), {});

    await claims.processQueue();
    await awaitSleepPromise(3000, () => c1.claim.claimStatus === ClaimTxStatus.CONFIRMED && c2.claim.claimStatus === ClaimTxStatus.FAILED);

    expect(chain.sent.length).to.equal(3, "deploy, delegate, batch");
    // 1. the batcher through the deterministic deployment proxy
    let deploy = chain.sent[0].tx;
    expect(deploy.to.toLowerCase()).to.equal(DETERMINISTIC_DEPLOYER.toLowerCase());
    expect(deploy.data).to.equal(BATCHER_SALT + BATCHER_BYTECODE.substring(2));
    expect(deploy.nonce).to.equal(42);
    expect(chain.code[BATCHER.toLowerCase()]).to.equal(BATCHER_RUNTIME_BYTECODE, "batcher code present after the deployment");
    // the signed bytes reached both session rows in one statement
    let database = ServiceManager.GetService(FaucetDatabase);
    let row1 = await database.getSession(c1.session);
    let row2 = await database.getSession(c2.session);
    expect(row1.claim.txHash).to.equal(c1.claim.txHash);
    expect(row2.claim.txHash).to.equal(c1.claim.txHash);
    expect(row2.claim.txHex).to.equal(row1.claim.txHex);
    // 2. the wallet's code: a type 4 transaction to itself carrying one authorization for the batcher
    let delegate = chain.sent[1].tx;
    expect(delegate.type).to.equal("eip7702");
    expect(delegate.to.toLowerCase()).to.equal(WALLET.toLowerCase());
    expect(delegate.nonce).to.equal(43);
    expect(delegate.authorizationList.length).to.equal(1);
    expect(delegate.authorizationList[0].address.toLowerCase()).to.equal(BATCHER.toLowerCase());
    expect(delegate.authorizationList[0].chainId).to.equal(1337);
    expect(delegate.authorizationList[0].nonce).to.equal(44, "the authorization follows the transaction's own nonce");
    expect(chain.code[WALLET.toLowerCase()]).to.equal(delegationCode(BATCHER));
    // 3. the batch: execute on the wallet with a transfer per claim, no value on the transaction
    let batchTx = chain.sent[2].tx;
    expect(batchTx.to.toLowerCase()).to.equal(WALLET.toLowerCase());
    expect(batchTx.nonce).to.equal(45, "two nonces spent by the delegation");
    expect(batchTx.value ?? 0n).to.equal(0n, "no value on the transaction itself");
    let call = decodeFunctionData({ abi: BATCHER_ABI, data: batchTx.data });
    expect(call.functionName).to.equal("execute");
    expect(call.args[0]).to.equal("0x" + "00" + "0000000000000000000000000000000000001001" + "0000000000000000000003e8" + "00" + "0000000000000000000000000000000000001002" + "0000000000000000000007d0");
    // outcomes by position
    expect(c1.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED);
    expect(c2.claim.claimStatus).to.equal(ClaimTxStatus.FAILED);
    expect(c2.claim.txError).to.match(/payout to this address failed/);
    expect(c1.claim.txCalls).to.deep.equal({ offset: 0, count: 1 });
    expect(c2.claim.txCalls).to.deep.equal({ offset: 1, count: 1 });
    expect(c1.claim.txHash).to.equal(c2.claim.txHash, "one transaction for both");
    expect(wallet.getWalletState().nonce).to.equal(46);
  }).timeout(10000);

  it("consumes a claim that was paid in part and fails one that was not paid at all", async () => {
    const TOKEN = "0x00000000000000000000000000000000000000bb";
    faucetConfig.ethClaimTx = { calls: [
      { type: "transfer", to: "{target}", amount: "{amount}" },
      { type: "token", token: TOKEN, to: "{target}", amount: "{amount}" },
    ] };
    // claim 1: the token call failed, the ether went through; claim 2: both calls failed
    let chain = fakeChain({ deployerPresent: true, eip7702: true, batchLogs: [
      failedLog(1, "0x0000000000000000000000000000000000001001", 1000n),
      failedLog(2, "0x0000000000000000000000000000000000001002", 2000n),
      failedLog(3, "0x0000000000000000000000000000000000001002", 2000n),
      executedLog(4),
    ] });
    chain.code[BATCHER.toLowerCase()] = BATCHER_RUNTIME_BYTECODE;
    chain.code[WALLET.toLowerCase()] = delegationCode(BATCHER);
    let { claims } = await start();
    let c1 = await claims.createSessionClaim(sessionData("00000000-0000-0000-0000-000000000001", "0x0000000000000000000000000000000000001001", "1000"), {});
    let c2 = await claims.createSessionClaim(sessionData("00000000-0000-0000-0000-000000000002", "0x0000000000000000000000000000000000001002", "2000"), {});
    await claims.processQueue();
    await awaitSleepPromise(3000, () => c1.claim.claimStatus === ClaimTxStatus.CONFIRMED && c2.claim.claimStatus === ClaimTxStatus.FAILED);
    expect(c1.claim.txCalls).to.deep.equal({ offset: 0, count: 2 });
    expect(c2.claim.txCalls).to.deep.equal({ offset: 2, count: 2 });
    expect(c1.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED, "partly paid: consumed, not retryable");
    expect(c1.claim.txError).to.match(/Partial payout: 1 of 2 calls failed/);
    expect(c2.claim.claimStatus).to.equal(ClaimTxStatus.FAILED, "nothing paid: failed");
    let row1 = await ServiceManager.GetService(FaucetDatabase).getSession(c1.session);
    expect(row1.status).to.equal(FaucetSessionStatus.FINISHED, "a consumed claim counts towards the limits");
  }).timeout(10000);

  it("reads a restored batch receipt from the row alone, with batching not even configured", async () => {
    faucetConfig.ethClaimBatch = null;
    let database = ServiceManager.GetService(FaucetDatabase);
    let storedHex = "02f86f8205392a847735940085174876e80082520894000000000000000000000000000000000000133782053980c001a04787689fdfc3803c758feaaa7989761900c274488f1f656ec7aa277ae37294efa038b6fc22a7a4c1f0bf537a989f00c907413f5c3e333807e1bbadfb08f74926f5";
    let storedHash = keccak256(("0x" + storedHex) as `0x${string}`);
    let paid = sessionData("00000000-0000-0000-0000-000000000001", "0x0000000000000000000000000000000000001001", "1000");
    let unpaid = sessionData("00000000-0000-0000-0000-000000000002", "0x0000000000000000000000000000000000001002", "2000");
    for(let [session, offset] of [[paid, 0], [unpaid, 1]] as [FaucetSessionStoreData, number][]) {
      session.status = FaucetSessionStatus.CLAIMING;
      session.claim = { claimIdx: offset + 1, claimStatus: ClaimTxStatus.PENDING, claimTime: session.startTime, txHash: storedHash, txNonce: 42, txHex: storedHex, txCalls: { offset, count: 1 } };
      await database.updateSession(session);
    }
    let chain = fakeChain({ deployerPresent: true, eip7702: true });
    chain.logsByHash[storedHash] = [failedLog(1, unpaid.targetAddr, 2000n), executedLog(2)];
    let { claims } = await start();
    let restored = claims.getTransactionQueue();
    expect(restored.length).to.equal(2);
    await awaitSleepPromise(3000, () => restored.every((c) => c.claim.claimStatus !== ClaimTxStatus.PENDING));
    let byId = Object.fromEntries(restored.map((c) => [c.session, c]));
    expect(byId[paid.sessionId].claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED);
    expect(byId[unpaid.sessionId].claim.claimStatus).to.equal(ClaimTxStatus.FAILED, "the failed sub-call is read from the row's range, not from the live config");
  });

  it("retries a setup transaction with the identical bytes after a lost answer", async () => {
    let chain = fakeChain({ deployerPresent: true, eip7702: true, failFirstSend: true, batchLogs: [executedLog(1)] });
    let { claims } = await start();
    let c1 = await claims.createSessionClaim(sessionData("00000000-0000-0000-0000-000000000001", "0x0000000000000000000000000000000000001001", "1000"), {});
    await claims.processQueue();
    await awaitSleepPromise(6000, () => c1.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    expect(chain.attempts.length).to.equal(4, "deploy twice (same bytes), delegate, batch");
    expect(chain.attempts[0]).to.equal(chain.attempts[1], "the deployment was re-sent as it was, not rebuilt");
    expect(chain.sent.map((s) => s.tx.nonce)).to.deep.equal([42, 43, 45], "no nonce reused or skipped");
    expect(c1.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED);
  }).timeout(12000);

  it("fails every claim of a batch that mined without running the batcher", async () => {
    let chain = fakeChain({ deployerPresent: true, eip7702: true, batchLogs: [] }); // no BatchExecuted
    chain.code[BATCHER.toLowerCase()] = BATCHER_RUNTIME_BYTECODE;
    chain.code[WALLET.toLowerCase()] = delegationCode(BATCHER);
    let { claims } = await start();
    let c1 = await claims.createSessionClaim(sessionData("00000000-0000-0000-0000-000000000001", "0x0000000000000000000000000000000000001001", "1000"), {});
    let c2 = await claims.createSessionClaim(sessionData("00000000-0000-0000-0000-000000000002", "0x0000000000000000000000000000000000001002", "2000"), {});
    await claims.processQueue();
    await awaitSleepPromise(3000, () => c1.claim.claimStatus === ClaimTxStatus.FAILED && c2.claim.claimStatus === ClaimTxStatus.FAILED);
    expect(c1.claim.claimStatus).to.equal(ClaimTxStatus.FAILED, "a success receipt without BatchExecuted paid nobody");
    expect(c1.claim.txError).to.match(/without running the payout code/);
    expect(c2.claim.claimStatus).to.equal(ClaimTxStatus.FAILED);
  });

  it("skips deployment and delegation when both are already in place", async () => {
    let chain = fakeChain({ deployerPresent: true, eip7702: true, batchLogs: [executedLog(1)] });
    chain.code[BATCHER.toLowerCase()] = BATCHER_RUNTIME_BYTECODE;
    chain.code[WALLET.toLowerCase()] = delegationCode(BATCHER);
    let { claims } = await start();
    let c1 = await claims.createSessionClaim(sessionData("00000000-0000-0000-0000-000000000001", "0x0000000000000000000000000000000000001001", "1000"), {});
    await claims.processQueue();
    await awaitSleepPromise(2000, () => c1.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    expect(chain.sent.length).to.equal(1, "only the batch transaction");
    expect(chain.sent[0].tx.to.toLowerCase()).to.equal(WALLET.toLowerCase());
    expect(decodeFunctionData({ abi: BATCHER_ABI, data: chain.sent[0].tx.data }).functionName).to.equal("execute");
  });

  it("falls back to one transaction per claim when the chain has no deterministic deployer", async () => {
    let chain = fakeChain({ deployerPresent: false, eip7702: true });
    let { claims } = await start();
    let c1 = await claims.createSessionClaim(sessionData("00000000-0000-0000-0000-000000000001", "0x0000000000000000000000000000000000001001", "1000"), {});
    let c2 = await claims.createSessionClaim(sessionData("00000000-0000-0000-0000-000000000002", "0x0000000000000000000000000000000000001002", "2000"), {});
    await claims.processQueue();
    await awaitSleepPromise(2000, () => c1.claim.claimStatus === ClaimTxStatus.CONFIRMED && c2.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    expect(chain.sent.length).to.equal(2, "a plain transfer each, nothing deployed");
    expect(chain.sent.map((s) => s.tx.to.toLowerCase())).to.deep.equal(["0x0000000000000000000000000000000000001001", "0x0000000000000000000000000000000000001002"]);
    expect(chain.sent.map((s) => s.tx.value)).to.deep.equal([1000n, 2000n]);
  });

  it("refuses to delegate to code that is not the compiled batcher", async () => {
    let chain = fakeChain({ deployerPresent: true, eip7702: true });
    chain.code[BATCHER.toLowerCase()] = "0x60806040"; // something else lives at the batcher's address
    let { claims } = await start();
    let c1 = await claims.createSessionClaim(sessionData("00000000-0000-0000-0000-000000000001", "0x0000000000000000000000000000000000001001", "1000"), {});
    await claims.processQueue();
    await awaitSleepPromise(2000, () => c1.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    expect(chain.sent.length).to.equal(1, "no delegation, just the plain transfer");
    expect(chain.sent[0].tx.type).to.not.equal("eip7702");
    expect(chain.sent[0].tx.to.toLowerCase()).to.equal("0x0000000000000000000000000000000000001001");
    expect(chain.code[WALLET.toLowerCase()]).to.equal(undefined, "the wallet keeps its own (empty) code");
  });

  it("falls back when the delegation does not take effect (no EIP-7702 on the chain)", async () => {
    let chain = fakeChain({ deployerPresent: true, eip7702: false });
    chain.code[BATCHER.toLowerCase()] = BATCHER_RUNTIME_BYTECODE;
    let { claims } = await start();
    let c1 = await claims.createSessionClaim(sessionData("00000000-0000-0000-0000-000000000001", "0x0000000000000000000000000000000000001001", "1000"), {});
    await claims.processQueue();
    await awaitSleepPromise(2000, () => c1.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    expect(chain.sent.length).to.equal(2, "the delegation attempt, then a plain transfer");
    expect(chain.sent[0].tx.type).to.equal("eip7702");
    expect(chain.sent[1].tx.to.toLowerCase()).to.equal("0x0000000000000000000000000000000000001001");
  });
});
