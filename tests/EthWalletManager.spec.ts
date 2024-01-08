import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { unbindTestStubs, awaitSleepPromise, bindTestStubs, loadDefaultTestConfig } from './common.js';
import { faucetConfig } from '../src/config/FaucetConfig.js';
import { EthWalletManager, FaucetCoinType } from '../src/eth/EthWalletManager.js';
import { ServiceManager } from '../src/common/ServiceManager.js';
import { ClaimTxStatus, EthClaimManager } from '../src/eth/EthClaimManager.js';
import { sleepPromise } from '../src/utils/PromiseUtils.js';
import { FakeProvider } from './stubs/FakeProvider.js';
import { FaucetDatabase } from '../src/db/FaucetDatabase.js';
import { FaucetSessionStatus, FaucetSessionStoreData } from '../src/session/FaucetSession.js';
import { ModuleManager } from '../src/modules/ModuleManager.js';
import { FetchError } from 'node-fetch';
import { FaucetProcess } from '../src/common/FaucetProcess.js';

describe("ETH Wallet Manager", () => {
  let globalStubs;
  let fakeProvider;

  beforeEach(async () => {
    globalStubs = bindTestStubs({
    });
    fakeProvider = new FakeProvider();
    loadDefaultTestConfig();
    faucetConfig.faucetStats = null;
    faucetConfig.ethWalletKey = "feedbeef12340000feedbeef12340000feedbeef12340000feedbeef12340000";
    faucetConfig.ethRpcHost = fakeProvider;
    await ServiceManager.GetService(FaucetDatabase).initialize();
    await ServiceManager.GetService(ModuleManager).initialize();
  });
  afterEach(async () => {
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
  });

  it("check wallet state initialization", async () => {
    let ethWalletManager = new EthWalletManager();
    fakeProvider.injectResponse("eth_chainId", 1337);
    fakeProvider.injectResponse("eth_getBalance", "1000");
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    await ethWalletManager.initialize();
    await ethWalletManager.loadWalletState();
    let walletState = ethWalletManager.getWalletState();
    expect(!!walletState).equal(true, "no wallet state");
    expect(walletState.ready).equal(true, "wallet state not ready");
    expect(walletState.nonce).equal(42, "unexpected nonce in wallet state");
    expect(walletState.balance).equal(1000n, "unexpected balance in wallet state");
    expect(walletState.nativeBalance).equal(1000n, "unexpected balance in wallet state");
    expect(ethWalletManager.getFaucetAddress()).equal("0xCA9456991E0AA5d5321e88Bba44d405aAb401193", "unexpected wallet address");
    expect(ethWalletManager.getFaucetBalance()).equal(1000n, "unexpected balance");
  });

  it("check wallet state initialization (pending not supported)", async () => {
    let ethWalletManager = new EthWalletManager();
    fakeProvider.injectResponse("eth_chainId", 1337);
    fakeProvider.injectResponse("eth_getBalance", (payload) => {
      if(payload.params[1] === "pending")
        throw '"pending" is not yet supported';
      return "1000";
    });
    fakeProvider.injectResponse("eth_getTransactionCount", (payload) => {
      if(payload.params[1] === "pending")
        throw '"pending" is not yet supported';
      return 42;
    });
    await ethWalletManager.initialize();
    await ethWalletManager.loadWalletState();
    let walletState = ethWalletManager.getWalletState();
    expect(!!walletState).equal(true, "no wallet state");
    expect(walletState.ready).equal(true, "wallet state not ready");
    expect(walletState.nonce).equal(42, "unexpected nonce in wallet state");
    expect(walletState.balance).equal(1000n, "unexpected balance in wallet state");
    expect(walletState.nativeBalance).equal(1000n, "unexpected balance in wallet state");
    expect(ethWalletManager.getFaucetAddress()).equal("0xCA9456991E0AA5d5321e88Bba44d405aAb401193", "unexpected wallet address");
    expect(ethWalletManager.getFaucetBalance()).equal(1000n, "unexpected balance");
  });

  it("check wallet state initialization (fixed chainId)", async () => {
    let ethWalletManager = new EthWalletManager();
    fakeProvider.injectResponse("eth_getBalance", (payload) => {
      if(payload.params[1] === "pending")
        throw '"pending" is not yet supported';
      return "1000";
    });
    fakeProvider.injectResponse("eth_getTransactionCount", (payload) => {
      if(payload.params[1] === "pending")
        throw '"pending" is not yet supported';
      return 42;
    });
    faucetConfig.ethChainId = 1337;
    await ethWalletManager.initialize();
    await ethWalletManager.loadWalletState();
    let walletState = ethWalletManager.getWalletState();
    expect(!!walletState).equal(true, "no wallet state");
    expect(walletState.ready).equal(true, "wallet state not ready");
    expect(walletState.nonce).equal(42, "unexpected nonce in wallet state");
    expect(walletState.balance).equal(1000n, "unexpected balance in wallet state");
    expect(walletState.nativeBalance).equal(1000n, "unexpected balance in wallet state");
    expect(ethWalletManager.getFaucetAddress()).equal("0xCA9456991E0AA5d5321e88Bba44d405aAb401193", "unexpected wallet address");
    expect(ethWalletManager.getFaucetBalance()).equal(1000n, "unexpected balance");
  });

  it("check wallet state initialization (erc20 token)", async () => {
    let ethWalletManager = new EthWalletManager();
    fakeProvider.injectResponse("eth_chainId", 1337);
    fakeProvider.injectResponse("eth_blockNumber", "0x1000");
    fakeProvider.injectResponse("eth_getBalance", "1000");
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    fakeProvider.injectResponse("eth_call", (payload) => {
      switch(payload.params[0].data.substring(0, 10)) {
        case "0x313ce567": // decimals()
          return "0x0000000000000000000000000000000000000000000000000000000000000006"; // 6
        case "0x70a08231": // balanceOf()
          return "0x000000000000000000000000000000000000000000000000000000e8d4a51000"; // 1000000000000
        default:
          console.log("unknown call: ", payload);
      }
    });
    faucetConfig.faucetCoinType = FaucetCoinType.ERC20;
    faucetConfig.faucetCoinContract = "0x0000000000000000000000000000000000001337";
    await ethWalletManager.initialize();
    await ethWalletManager.loadWalletState();
    let walletState = ethWalletManager.getWalletState();
    expect(!!walletState).equal(true, "no wallet state");
    expect(walletState.ready).equal(true, "wallet state not ready");
    expect(walletState.nonce).equal(42, "unexpected nonce in wallet state");
    expect(walletState.balance).equal(1000000000000n, "unexpected balance in wallet state");
    expect(walletState.nativeBalance).equal(1000n, "unexpected balance in wallet state");
    expect(ethWalletManager.getTokenAddress()).equal("0x0000000000000000000000000000000000001337", "unexpected token address");
  });

  it("send ClaimTx transaction", async () => {
    faucetConfig.ethChainId = 1337;
    faucetConfig.spareFundsAmount = 0;
    faucetConfig.ethTxGasLimit = 21000;
    faucetConfig.ethTxMaxFee = 100000000000; // 100 gwei
    faucetConfig.ethTxPrioFee = 2000000000; // 2 gwei
    faucetConfig.minDropAmount = 1000;
    await ServiceManager.GetService(FaucetDatabase).initialize();
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let ethClaimManager = ServiceManager.GetService(EthClaimManager);
    fakeProvider.injectResponse("eth_blockNumber", "0x1000");
    fakeProvider.injectResponse("eth_getBalance", "1000000000000000000"); // 1 ETH
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    let rawTxReq: any[] = [];
    fakeProvider.injectResponse("eth_sendRawTransaction", (payload) => {
      rawTxReq.push(payload);
      return "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337";
    });
    fakeProvider.injectResponse("eth_call", (payload) => {
      switch(payload.params[0].data.substring(0, 10)) {
        case "0x": // test call
          return "0x";
        default:
          console.log("unknown call: ", payload);
      }
    });
    fakeProvider.injectResponse("eth_getTransactionReceipt", (payload) => {
      return {
        "blockHash": "0xfce202c4104864d81d8bd78b7202a77e5dca634914a3fd6636f2765d65fa9a07",
        "blockNumber": "0x8aa5ae",
        "contractAddress": null,
        "cumulativeGasUsed": "0x1752665",
        "effectiveGasPrice": "0x3b9aca00", // 1 gwei
        "from": "0x917c0A57A0FaA917f8ac7cA8Dd52db0b906a59d2",
        "gasUsed": "0x5208", // 21000
        "logs": [],
        "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "status": "0x1",
        "to": "0x0000000000000000000000000000000000001337",
        "transactionHash": "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337",
        "transactionIndex": "0x3d",
        "type": "0x2"
      };
    });
    await ethWalletManager.initialize();
    await ethWalletManager.loadWalletState();
    let testSessionData: FaucetSessionStoreData = {
      sessionId: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      status: FaucetSessionStatus.CLAIMABLE,
      startTime: Math.floor(new Date().getTime() / 1000),
      targetAddr: "0x0000000000000000000000000000000000001337",
      dropAmount: "1337",
      remoteIP: "8.8.8.8",
      tasks: [], data: {}, claim: null,
    };
    let claimTx = await ethClaimManager.createSessionClaim(testSessionData, {});
    await ethClaimManager.processQueue();
    await awaitSleepPromise(200, () => claimTx.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    expect(rawTxReq.length).to.equal(1, "unexpected transaction count");
    expect(rawTxReq[0].params[0]).to.equal("0x02f86f8205392a847735940085174876e80082520894000000000000000000000000000000000000133782053980c001a04787689fdfc3803c758feaaa7989761900c274488f1f656ec7aa277ae37294efa038b6fc22a7a4c1f0bf537a989f00c907413f5c3e333807e1bbadfb08f74926f5", "unexpected transaction hex");    
    expect(claimTx.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED, "unexpected claimTx status");
    let walletState = ethWalletManager.getWalletState();
    expect(!!walletState).equal(true, "no wallet state");
    expect(walletState.ready).equal(true, "wallet state not ready");
    expect(walletState.nonce).equal(43, "unexpected nonce in wallet state");
    expect(walletState.balance).equal(999978999999998663n, "unexpected balance in wallet state");
    expect(walletState.nativeBalance).equal(999978999999998663n, "unexpected balance in wallet state");
  });

  it("send ClaimTx transaction (long confirmation time)", async () => {
    faucetConfig.ethChainId = 1337;
    faucetConfig.spareFundsAmount = 0;
    faucetConfig.ethTxGasLimit = 21000;
    faucetConfig.ethTxMaxFee = 100000000000; // 100 gwei
    faucetConfig.ethTxPrioFee = 2000000000; // 2 gwei
    faucetConfig.minDropAmount = 1000;
    await ServiceManager.GetService(FaucetDatabase).initialize();
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let ethClaimManager = ServiceManager.GetService(EthClaimManager);
    fakeProvider.injectResponse("eth_getBalance", "1000000000000000000"); // 1 ETH
    fakeProvider.injectResponse("eth_blockNumber", "0x1000");
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    fakeProvider.injectResponse("eth_subscribe", () => { throw "not supported" });
    let rawTxReq: any[] = [];
    fakeProvider.injectResponse("eth_sendRawTransaction", (payload) => {
      rawTxReq.push(payload);
      return "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337";
    });
    fakeProvider.injectResponse("eth_call", (payload) => {
      switch(payload.params[0].data.substring(0, 10)) {
        case "0x": // test call
          return "0x";
        default:
          console.log("unknown call: ", payload);
      }
    });
    let receiptResponseMode = "null";
    fakeProvider.injectResponse("eth_getTransactionReceipt", (payload) => {
      if(receiptResponseMode === "null") {
        return null
      }
      return {
        "blockHash": "0xfce202c4104864d81d8bd78b7202a77e5dca634914a3fd6636f2765d65fa9a07",
        "blockNumber": "0x8aa5ae",
        "contractAddress": null,
        "cumulativeGasUsed": "0x1752665",
        "effectiveGasPrice": "0x3b9aca00", // 1 gwei
        "from": "0x917c0A57A0FaA917f8ac7cA8Dd52db0b906a59d2",
        "gasUsed": "0x5208", // 21000
        "logs": [],
        "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "status": "0x1",
        "to": "0x0000000000000000000000000000000000001337",
        "transactionHash": "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337",
        "transactionIndex": "0x3d",
        "type": "0x2"
      };
    });
    await ethWalletManager.initialize();
    (ethWalletManager as any).web3.eth.transactionPollingInterval = 100;
    (ethWalletManager as any).txReceiptPollInterval = 10;
    await ethWalletManager.loadWalletState();
    let testSessionData: FaucetSessionStoreData = {
      sessionId: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      status: FaucetSessionStatus.CLAIMABLE,
      startTime: Math.floor(new Date().getTime() / 1000),
      targetAddr: "0x0000000000000000000000000000000000001337",
      dropAmount: "1337",
      remoteIP: "8.8.8.8",
      tasks: [], data: {}, claim: null,
    };
    let claimTx = await ethClaimManager.createSessionClaim(testSessionData, {});
    await ethClaimManager.processQueue();
    await sleepPromise(3000); // wait for timeout from web3js lib
    receiptResponseMode = "receipt"; // now return the receipt
    await awaitSleepPromise(1000, () => claimTx.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    expect(rawTxReq.length).to.equal(1, "unexpected transaction count");
    expect(rawTxReq[0].params[0]).to.equal("0x02f86f8205392a847735940085174876e80082520894000000000000000000000000000000000000133782053980c001a04787689fdfc3803c758feaaa7989761900c274488f1f656ec7aa277ae37294efa038b6fc22a7a4c1f0bf537a989f00c907413f5c3e333807e1bbadfb08f74926f5", "unexpected transaction hex");    
    expect(claimTx.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED, "unexpected claimTx status");
    let walletState = ethWalletManager.getWalletState();
    expect(!!walletState).equal(true, "no wallet state");
    expect(walletState.ready).equal(true, "wallet state not ready");
    expect(walletState.nonce).equal(43, "unexpected nonce in wallet state");
    expect(walletState.balance).equal(999978999999998663n, "unexpected balance in wallet state");
    expect(walletState.nativeBalance).equal(999978999999998663n, "unexpected balance in wallet state");
  }).timeout(5000);

  it("send ClaimTx transaction (legacy transaction)", async () => {
    faucetConfig.ethChainId = 1337;
    faucetConfig.spareFundsAmount = 0;
    faucetConfig.ethTxGasLimit = 21000;
    faucetConfig.ethTxMaxFee = 100000000000; // 100 gwei
    faucetConfig.ethTxPrioFee = 2000000000; // 2 gwei
    faucetConfig.ethLegacyTx = true;
    faucetConfig.minDropAmount = 1000;
    await ServiceManager.GetService(FaucetDatabase).initialize();
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let ethClaimManager = ServiceManager.GetService(EthClaimManager);
    fakeProvider.injectResponse("eth_getBalance", "1000000000000000000"); // 1 ETH
    fakeProvider.injectResponse("eth_blockNumber", "0x1000");
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    fakeProvider.injectResponse("eth_gasPrice", "150000000000"); // 150 gwei
    let rawTxReq: any[] = [];
    fakeProvider.injectResponse("eth_sendRawTransaction", (payload) => {
      rawTxReq.push(payload);
      return "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337";
    });
    fakeProvider.injectResponse("eth_call", (payload) => {
      switch(payload.params[0].data.substring(0, 10)) {
        case "0x": // test call
          return "0x";
        default:
          console.log("unknown call: ", payload);
      }
    });
    fakeProvider.injectResponse("eth_getTransactionReceipt", (payload) => {
      return {
        "blockHash": "0xfce202c4104864d81d8bd78b7202a77e5dca634914a3fd6636f2765d65fa9a07",
        "blockNumber": "0x8aa5ae",
        "contractAddress": null,
        "cumulativeGasUsed": "0x1752665",
        "effectiveGasPrice": "0x3b9aca00", // 1 gwei
        "from": "0x917c0A57A0FaA917f8ac7cA8Dd52db0b906a59d2",
        "gasUsed": "0x5208", // 21000
        "logs": [],
        "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "status": "0x1",
        "to": "0x0000000000000000000000000000000000001337",
        "transactionHash": "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337",
        "transactionIndex": "0x3d",
        "type": "0x2"
      };
    });
    await ethWalletManager.initialize();
    await ethWalletManager.loadWalletState();
    let testSessionData: FaucetSessionStoreData = {
      sessionId: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      status: FaucetSessionStatus.CLAIMABLE,
      startTime: Math.floor(new Date().getTime() / 1000),
      targetAddr: "0x0000000000000000000000000000000000001337",
      dropAmount: "1337",
      remoteIP: "8.8.8.8",
      tasks: [], data: {}, claim: null,
    };
    let claimTx = await ethClaimManager.createSessionClaim(testSessionData, {});
    await ethClaimManager.processQueue();
    await awaitSleepPromise(200, () => claimTx.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    expect(rawTxReq.length).to.equal(1, "unexpected transaction count");
    expect(rawTxReq[0].params[0]).to.equal("0xf8682a85174876e80082520894000000000000000000000000000000000000133782053980820a96a0537845eca3779f6925b8ca8459bf20a72189ceb3746e62d50ae5b7cfec5c83e8a025ecaf297265b4a5e5fcdd3f66c0184c3c4f103cfd5bf5dc2ffc2da9c7fa8ee0", "unexpected transaction hex");
    expect(claimTx.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED, "unexpected claimTx status");
    let walletState = ethWalletManager.getWalletState();
    expect(!!walletState).equal(true, "no wallet state");
    expect(walletState.ready).equal(true, "wallet state not ready");
    expect(walletState.nonce).equal(43, "unexpected nonce in wallet state");
    expect(walletState.balance).equal(999978999999998663n, "unexpected balance in wallet state");
    expect(walletState.nativeBalance).equal(999978999999998663n, "unexpected balance in wallet state");
  });

  it("send ClaimTx transaction (RPC error)", async () => {
    faucetConfig.ethChainId = 1337;
    faucetConfig.spareFundsAmount = 0;
    faucetConfig.ethTxGasLimit = 21000;
    faucetConfig.ethTxMaxFee = 100000000000; // 100 gwei
    faucetConfig.ethTxPrioFee = 2000000000; // 2 gwei
    faucetConfig.minDropAmount = 1000;
    await ServiceManager.GetService(FaucetDatabase).initialize();
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let ethClaimManager = ServiceManager.GetService(EthClaimManager);
    fakeProvider.injectResponse("eth_getBalance", "1000000000000000000"); // 1 ETH
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    fakeProvider.injectResponse("eth_blockNumber", "0x1000");
    fakeProvider.injectResponse("eth_call", (payload) => {
      switch(payload.params[0].data.substring(0, 10)) {
        case "0x": // test call
          return "0x";
        default:
          console.log("unknown call: ", payload);
      }
    });
    fakeProvider.injectResponse("eth_sendRawTransaction", (payload) => {
      throw "test error 57572x";
    });
    await ethWalletManager.initialize();
    await ethWalletManager.loadWalletState();
    let testSessionData: FaucetSessionStoreData = {
      sessionId: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      status: FaucetSessionStatus.CLAIMABLE,
      startTime: Math.floor(new Date().getTime() / 1000),
      targetAddr: "0x0000000000000000000000000000000000001337",
      dropAmount: "1337",
      remoteIP: "8.8.8.8",
      tasks: [], data: {}, claim: null,
    };
    let claimTx = await ethClaimManager.createSessionClaim(testSessionData, {});
    await ethClaimManager.processQueue();
    await awaitSleepPromise(5000, () => claimTx.claim.claimStatus === ClaimTxStatus.FAILED);
    expect(claimTx.claim.claimStatus).to.equal(ClaimTxStatus.FAILED, "unexpected claimTx status");
    expect(claimTx.claim.txError).contains("test error 57572x", "test error not in failReason");
    let walletState = ethWalletManager.getWalletState();
    expect(!!walletState).equal(true, "no wallet state");
    expect(walletState.ready).equal(true, "wallet state not ready");
    expect(walletState.nonce).equal(42, "unexpected nonce in wallet state");
    expect(walletState.balance).equal(1000000000000000000n, "unexpected balance in wallet state");
    expect(walletState.nativeBalance).equal(1000000000000000000n, "unexpected balance in wallet state");
  }).timeout(10000);

  it("send ClaimTx transaction (RPC/HTTP error on send)", async () => {
    faucetConfig.ethChainId = 1337;
    faucetConfig.spareFundsAmount = 0;
    faucetConfig.ethTxGasLimit = 21000;
    faucetConfig.ethTxMaxFee = 100000000000; // 100 gwei
    faucetConfig.ethTxPrioFee = 2000000000; // 2 gwei
    faucetConfig.minDropAmount = 1000;
    await ServiceManager.GetService(FaucetDatabase).initialize();
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let ethClaimManager = ServiceManager.GetService(EthClaimManager);
    fakeProvider.injectResponse("eth_getBalance", "1000000000000000000"); // 1 ETH
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    fakeProvider.injectResponse("eth_blockNumber", "0x1000");
    fakeProvider.injectResponse("eth_call", (payload) => {
      switch(payload.params[0].data.substring(0, 10)) {
        case "0x": // test call
          return "0x";
        default:
          console.log("unknown call: ", payload);
      }
    });
    let rpcResponseError = true;
    fakeProvider.injectResponse("eth_sendRawTransaction", (payload) => {
      if(rpcResponseError) {
        return {
          _throw: new FetchError("invalid json response", "invalid-json"),
        }
      }
      return "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337";
    });
    fakeProvider.injectResponse("eth_getTransactionReceipt", {
      "blockHash": "0xfce202c4104864d81d8bd78b7202a77e5dca634914a3fd6636f2765d65fa9a07",
      "blockNumber": "0x8aa5ae",
      "contractAddress": null,
      "cumulativeGasUsed": "0x1752665",
      "effectiveGasPrice": "0x3b9aca00", // 1 gwei
      "from": "0x917c0A57A0FaA917f8ac7cA8Dd52db0b906a59d2",
      "gasUsed": "0x5208", // 21000
      "logs": [],
      "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      "status": "0x1",
      "to": "0x0000000000000000000000000000000000001337",
      "transactionHash": "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337",
      "transactionIndex": "0x3d",
      "type": "0x2"
    });
    await ethWalletManager.initialize();
    await ethWalletManager.loadWalletState();
    let testSessionData: FaucetSessionStoreData = {
      sessionId: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      status: FaucetSessionStatus.CLAIMABLE,
      startTime: Math.floor(new Date().getTime() / 1000),
      targetAddr: "0x0000000000000000000000000000000000001337",
      dropAmount: "1337",
      remoteIP: "8.8.8.8",
      tasks: [], data: {}, claim: null,
    };
    let claimTx = await ethClaimManager.createSessionClaim(testSessionData, {});
    ethClaimManager.processQueue();
    await awaitSleepPromise(4000, () => claimTx.claim.claimStatus !== ClaimTxStatus.PROCESSING);
    expect(claimTx.claim.claimStatus).to.equal(ClaimTxStatus.PROCESSING, "unexpected claimTx status 1");
    rpcResponseError = false;
    await awaitSleepPromise(4000, () => claimTx.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    expect(claimTx.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED, "unexpected claimTx status 2");
  }).timeout(10000);

  it("send ClaimTx transaction (RPC/HTTP error on receipt poll)", async () => {
    faucetConfig.ethChainId = 1337;
    faucetConfig.spareFundsAmount = 0;
    faucetConfig.ethTxGasLimit = 21000;
    faucetConfig.ethTxMaxFee = 100000000000; // 100 gwei
    faucetConfig.ethTxPrioFee = 2000000000; // 2 gwei
    faucetConfig.minDropAmount = 1000;
    await ServiceManager.GetService(FaucetDatabase).initialize();
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let ethClaimManager = ServiceManager.GetService(EthClaimManager);
    fakeProvider.injectResponse("eth_getBalance", "1000000000000000000"); // 1 ETH
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    fakeProvider.injectResponse("eth_blockNumber", "0x1000");
    fakeProvider.injectResponse("eth_call", (payload) => {
      switch(payload.params[0].data.substring(0, 10)) {
        case "0x": // test call
          return "0x";
        default:
          console.log("unknown call: ", payload);
      }
    });
    fakeProvider.injectResponse("eth_sendRawTransaction", "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337");
    let rpcResponseError = true;
    fakeProvider.injectResponse("eth_getTransactionReceipt", (payload) => {
      if(rpcResponseError) {
        return {
          _throw: new FetchError("invalid json response", "invalid-json"),
        }
      }
      return {
        "blockHash": "0xfce202c4104864d81d8bd78b7202a77e5dca634914a3fd6636f2765d65fa9a07",
        "blockNumber": "0x8aa5ae",
        "contractAddress": null,
        "cumulativeGasUsed": "0x1752665",
        "effectiveGasPrice": "0x3b9aca00", // 1 gwei
        "from": "0x917c0A57A0FaA917f8ac7cA8Dd52db0b906a59d2",
        "gasUsed": "0x5208", // 21000
        "logs": [],
        "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "status": "0x1",
        "to": "0x0000000000000000000000000000000000001337",
        "transactionHash": "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337",
        "transactionIndex": "0x3d",
        "type": "0x2"
      };
    });
    await ethWalletManager.initialize();
    (ethWalletManager as any).web3.eth.transactionPollingInterval = 1000;
    (ethWalletManager as any).txReceiptPollInterval = 1000;
    (ethWalletManager as any).web3.eth.transactionPollingTimeout = 4;
    await ethWalletManager.loadWalletState();
    let testSessionData: FaucetSessionStoreData = {
      sessionId: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      status: FaucetSessionStatus.CLAIMABLE,
      startTime: Math.floor(new Date().getTime() / 1000),
      targetAddr: "0x0000000000000000000000000000000000001337",
      dropAmount: "1337",
      remoteIP: "8.8.8.8",
      tasks: [], data: {}, claim: null,
    };
    let claimTx = await ethClaimManager.createSessionClaim(testSessionData, {});
    await ethClaimManager.processQueue();
    await awaitSleepPromise(7000, () => claimTx.claim.claimStatus !== ClaimTxStatus.PENDING);
    rpcResponseError = false;
    await awaitSleepPromise(5000, () => claimTx.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    expect(claimTx.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED, "unexpected claimTx status");
  }).timeout(15000);

  it("send ClaimTx transaction (reverted transaction)", async () => {
    faucetConfig.ethChainId = 1337;
    faucetConfig.spareFundsAmount = 0;
    faucetConfig.ethTxGasLimit = 21000;
    faucetConfig.ethTxMaxFee = 100000000000; // 100 gwei
    faucetConfig.ethTxPrioFee = 2000000000; // 2 gwei
    faucetConfig.minDropAmount = 1000;
    await ServiceManager.GetService(FaucetDatabase).initialize();
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let ethClaimManager = ServiceManager.GetService(EthClaimManager);
    fakeProvider.injectResponse("eth_getBalance", "1000000000000000000"); // 1 ETH
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    fakeProvider.injectResponse("eth_blockNumber", "0x1000");
    fakeProvider.injectResponse("eth_call", (payload) => {
      switch(payload.params[0].data.substring(0, 10)) {
        case "0x": // test call
          return "0x";
        default:
          console.log("unknown call: ", payload);
      }
    });
    fakeProvider.injectResponse("eth_sendRawTransaction", "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337");
    fakeProvider.injectResponse("eth_getTransactionReceipt", {
      "blockHash": "0xfce202c4104864d81d8bd78b7202a77e5dca634914a3fd6636f2765d65fa9a07",
      "blockNumber": "0x8aa5ae",
      "contractAddress": null,
      "cumulativeGasUsed": "0x1752665",
      "effectiveGasPrice": "0x3b9aca00", // 1 gwei
      "from": "0x917c0A57A0FaA917f8ac7cA8Dd52db0b906a59d2",
      "gasUsed": "0x5208", // 21000
      "logs": [],
      "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      "status": "0x0",
      "to": "0x0000000000000000000000000000000000001337",
      "transactionHash": "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337",
      "transactionIndex": "0x3d",
      "type": "0x2"
    });
    await ethWalletManager.initialize();
    await ethWalletManager.loadWalletState();
    let testSessionData: FaucetSessionStoreData = {
      sessionId: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      status: FaucetSessionStatus.CLAIMABLE,
      startTime: Math.floor(new Date().getTime() / 1000),
      targetAddr: "0x0000000000000000000000000000000000001337",
      dropAmount: "1337",
      remoteIP: "8.8.8.8",
      tasks: [], data: {}, claim: null,
    };
    let claimTx = await ethClaimManager.createSessionClaim(testSessionData, {});
    await ethClaimManager.processQueue();
    await awaitSleepPromise(200, () => claimTx.claim.claimStatus === ClaimTxStatus.FAILED);
    expect(claimTx.claim.claimStatus).to.equal(ClaimTxStatus.FAILED, "unexpected claimTx status");
    let walletState = ethWalletManager.getWalletState();
    expect(!!walletState).equal(true, "no wallet state");
    expect(walletState.ready).equal(true, "wallet state not ready");
    expect(walletState.nonce).equal(43, "unexpected nonce in wallet state");
    expect(walletState.balance).equal(999978999999998663n, "unexpected balance in wallet state");
    expect(walletState.nativeBalance).equal(999978999999998663n, "unexpected balance in wallet state");
  });

  it("send ClaimTx transaction (erc20 token transfer)", async () => {
    faucetConfig.ethChainId = 1337;
    faucetConfig.spareFundsAmount = 0;
    faucetConfig.ethTxGasLimit = 21000;
    faucetConfig.ethTxMaxFee = 100000000000; // 100 gwei
    faucetConfig.ethTxPrioFee = 2000000000; // 2 gwei
    faucetConfig.minDropAmount = 1000;
    await ServiceManager.GetService(FaucetDatabase).initialize();
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let ethClaimManager = ServiceManager.GetService(EthClaimManager);
    fakeProvider.injectResponse("eth_chainId", 1337);
    fakeProvider.injectResponse("eth_getBalance", "1000000000000000000"); // 1 ETH
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    fakeProvider.injectResponse("eth_blockNumber", "0x1000");
    fakeProvider.injectResponse("eth_call", (payload) => {
      switch(payload.params[0].data.substring(0, 10)) {
        case "0x": // test call
          return "0x";
        case "0x313ce567": // decimals()
          return "0x0000000000000000000000000000000000000000000000000000000000000006"; // 6
        case "0x70a08231": // balanceOf()
          return "0x000000000000000000000000000000000000000000000000000000e8d4a51000"; // 1000000000000
        case "0xa9059cbb": // transfer()
          return "0x";
        default:
          console.log("unknown call: ", payload);
      }
    });
    let rawTxReq: any[] = [];
    fakeProvider.injectResponse("eth_sendRawTransaction", (payload) => {
      rawTxReq.push(payload);
      return "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281331337";
    });
    fakeProvider.injectResponse("eth_getTransactionReceipt", (payload) => {
      return {
        "blockHash": "0xfce202c4104864d81d8bd78b7202a77e5dca634914a3fd6636f2765d65fa9a07",
        "blockNumber": "0x8aa5ae",
        "contractAddress": null,
        "cumulativeGasUsed": "0x1752665",
        "effectiveGasPrice": "0x3b9aca00", // 1 gwei
        "from": "0x917c0A57A0FaA917f8ac7cA8Dd52db0b906a59d2",
        "gasUsed": "0x5208", // 21000
        "logs": [],
        "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "status": "0x1",
        "to": "0x0000000000000000000000000000000000004242",
        "transactionHash": "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281331337",
        "transactionIndex": "0x3d",
        "type": "0x2"
      };
    });
    faucetConfig.faucetCoinType = FaucetCoinType.ERC20;
    faucetConfig.faucetCoinContract = "0x0000000000000000000000000000000000004242";
    await ethWalletManager.initialize();
    await ethWalletManager.loadWalletState();
    let testSessionData: FaucetSessionStoreData = {
      sessionId: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      status: FaucetSessionStatus.CLAIMABLE,
      startTime: Math.floor(new Date().getTime() / 1000),
      targetAddr: "0x0000000000000000000000000000000000001337",
      dropAmount: "1337",
      remoteIP: "8.8.8.8",
      tasks: [], data: {}, claim: null,
    };
    let claimTx = await ethClaimManager.createSessionClaim(testSessionData, {});
    await ethClaimManager.processQueue();
    await awaitSleepPromise(200, () => claimTx.claim.claimStatus === ClaimTxStatus.CONFIRMED);
    expect(claimTx.claim.claimStatus).to.equal(ClaimTxStatus.CONFIRMED, "unexpected claimTx status");
    expect(rawTxReq.length).to.equal(1, "unexpected transaction count");
    expect(rawTxReq[0].params[0]).to.equal("0x02f8b28205392a847735940085174876e80082520894000000000000000000000000000000000000424280b844a9059cbb00000000000000000000000000000000000000000000000000000000000013370000000000000000000000000000000000000000000000000000000000000539c001a002eca862f97badedde37bfbfd0ec047dc16e33bd1f73e20d24e284c6950c685ea03f975804b22ab748a52098907c87fcdb40520a9f7c11fe54721fa037c81e8055", "unexpected transaction hex");
    let walletState = ethWalletManager.getWalletState();
    expect(!!walletState).equal(true, "no wallet state");
    expect(walletState.ready).equal(true, "wallet state not ready");
    expect(walletState.nonce).equal(43, "unexpected nonce in wallet state");
    expect(walletState.balance).equal(999999998663n, "unexpected balance in wallet state");
    expect(walletState.nativeBalance).equal(999979000000000000n, "unexpected balance in wallet state");
  });
});
