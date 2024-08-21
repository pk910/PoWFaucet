import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, awaitSleepPromise } from './common.js';
import { ServiceManager } from '../src/common/ServiceManager.js';
import { FaucetDatabase } from '../src/db/FaucetDatabase.js';
import { ModuleManager } from '../src/modules/ModuleManager.js';
import { faucetConfig } from '../src/config/FaucetConfig.js';
import { FakeProvider } from './stubs/FakeProvider.js';
import { EthWalletManager, FaucetCoinType } from '../src/eth/EthWalletManager.js';
import { EthClaimManager } from '../src/eth/EthClaimManager.js';
import { EthWalletRefill } from '../src/eth/EthWalletRefill.js';
import { FaucetProcess } from '../src/common/FaucetProcess.js';


describe("ETH Wallet Refill", () => {
  let globalStubs;
  let fakeProvider;

  beforeEach(async () => {
    globalStubs = bindTestStubs();
    fakeProvider = new FakeProvider();
    loadDefaultTestConfig();
    faucetConfig.ethWalletKey = "feedbeef12340000feedbeef12340000feedbeef12340000feedbeef12340000";
    faucetConfig.ethRpcHost = fakeProvider;
    faucetConfig.ethRefillContract = {
      contract: "0xA5058fbcD09425e922E3E9e78D569aB84EdB88Eb",
      abi: '[{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"getAllowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}]',
      allowanceFn: "getAllowance",
      allowanceFnArgs: ["{walletAddr}"],
      withdrawFn: "withdraw",
      withdrawFnArgs: ["{amount}"],
      depositFn: "",
      depositFnArgs: [],
      withdrawGasLimit: 300000,
      checkContractBalance: true,
      contractDustBalance: "1000000000000000000", // 1 ETH
      triggerBalance: "1000000000000000000000",  // 1000 ETH
      overflowBalance: "2000000000000000000000",  // 1000 ETH
      cooldownTime: 10,
      requestAmount: "100000000000000000000", // # 100 ETH
    };
    await ServiceManager.GetService(FaucetDatabase).initialize();
    await ServiceManager.GetService(ModuleManager).initialize();
  });
  afterEach(async () => {
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
  });

  it("Refill wallet when running out of funds", async () => {
    fakeProvider.injectResponse("eth_chainId", 1337);
    let balances = {
      "0xca9456991e0aa5d5321e88bba44d405aab401193": "900000000000000000000",
      "0xa5058fbcd09425e922e3e9e78d569ab84edb88eb": "2000000000000000000000",
    };
    fakeProvider.injectResponse("eth_getBalance", (payload) => balances[payload.params[0].toLowerCase()]); // 900 ETH
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    fakeProvider.injectResponse("eth_blockNumber", "0x1000");
    fakeProvider.injectResponse("eth_call", (payload) => {
      switch(payload.params[0].data.substring(0, 10)) {
        case "0x": // test call
          return "0x";
        case "0xeb5a662e": // getAllowance()
          return "0x00000000000000000000000000000000000000000000003635c9adc5dea00000"; // 1000 ETH
        case "0x2e1a7d4d": // withdraw()
          return "0x";
        default:
          console.log("unknown call: ", payload);
      }
    });
    let rawTxReq: any[] = [];
    fakeProvider.injectResponse("eth_sendRawTransaction", (payload) => {
      rawTxReq.push(payload);
      return "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337";
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

    await ServiceManager.GetService(EthWalletManager).initialize();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();

    await claimManager.processQueue();
    await awaitSleepPromise(500, () => rawTxReq.length > 0);

    expect(rawTxReq.length).to.equal(1, "unexpected number of refill transactions");
    expect(rawTxReq[0].params[0]).to.equal("0x02f8928205392a847735940085174876e800830493e094a5058fbcd09425e922e3e9e78d569ab84edb88eb80a42e1a7d4d0000000000000000000000000000000000000000000000056bc75e2d63100000c001a0bbeaf993f51b3b3a3f3bb8db15ca7a502953f08d5b4a1eed9fa7de6eb95ba059a030d699df2ab4831f2032a347a112e0bb4a90dc411f10781c980982f38fb0e018", "unexpected refill transaction hex");
  });

  it("Forward funds when exceeding overflow balance", async () => {
    fakeProvider.injectResponse("eth_chainId", 1337);
    let balances = {
      "0xca9456991e0aa5d5321e88bba44d405aab401193": "3000000000000000000000",
      "0xa5058fbcd09425e922e3e9e78d569ab84edb88eb": "2000000000000000000000",
    };
    fakeProvider.injectResponse("eth_getBalance", (payload) => balances[payload.params[0].toLowerCase()]); // 900 ETH
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
    let rawTxReq: any[] = [];
    fakeProvider.injectResponse("eth_sendRawTransaction", (payload) => {
      rawTxReq.push(payload);
      return "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337";
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

    await ServiceManager.GetService(EthWalletManager).initialize();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();

    await claimManager.processQueue();
    await awaitSleepPromise(500, () => rawTxReq.length > 0);

    expect(rawTxReq.length).to.equal(1, "unexpected number of refill transactions");
    expect(rawTxReq[0].params[0]).to.equal("0x02f8778205392a847735940085174876e800830493e094a5058fbcd09425e922e3e9e78d569ab84edb88eb893635c9adc5dea0000080c080a0f6479155811e8cb2c8a47637d4ac8319b4368219d3e5fbabc67beed4329d4863a07272d4304be538f692670486fe0e3df02a2bd00163c7567a4b67f1a10ead8ea4", "unexpected refill transaction hex");
  });

  it("Failed refill transaction (reverted)", async () => {
    fakeProvider.injectResponse("eth_chainId", 1337);
    let balances = {
      "0xca9456991e0aa5d5321e88bba44d405aab401193": "900000000000000000000",
      "0xa5058fbcd09425e922e3e9e78d569ab84edb88eb": "2000000000000000000000",
    };
    fakeProvider.injectResponse("eth_getBalance", (payload) => balances[payload.params[0].toLowerCase()]); // 900 ETH
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    fakeProvider.injectResponse("eth_blockNumber", "0x1000");
    fakeProvider.injectResponse("eth_call", (payload) => {
      switch(payload.params[0].data.substring(0, 10)) {
        case "0x": // test call
          return "0x";
        case "0xeb5a662e": // getAllowance()
          return "0x00000000000000000000000000000000000000000000003635c9adc5dea00000"; // 1000 ETH
        case "0x2e1a7d4d": // withdraw()
          return "0x";
        default:
          console.log("unknown call: ", payload);
      }
    });
    let rawTxReq: any[] = [];
    fakeProvider.injectResponse("eth_sendRawTransaction", (payload) => {
      rawTxReq.push(payload);
      return "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337";
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
        "status": "0x0",
        "to": "0x0000000000000000000000000000000000001337",
        "transactionHash": "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337",
        "transactionIndex": "0x3d",
        "type": "0x2"
      };
    });

    (faucetConfig.ethRefillContract as any).cooldownTime = 3600;

    await ServiceManager.GetService(EthWalletManager).initialize();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    let refillManager = ServiceManager.GetService(EthWalletRefill);
    await claimManager.initialize();

    expect(refillManager.getFaucetRefillCooldown()).to.equal(0, "unexpected faucet refill cooldown");

    await claimManager.processQueue();
    await awaitSleepPromise(500, () => rawTxReq.length > 0);

    expect(rawTxReq.length).to.equal(1, "unexpected number of refill transactions");
    expect(rawTxReq[0].params[0]).to.equal("0x02f8928205392a847735940085174876e800830493e094a5058fbcd09425e922e3e9e78d569ab84edb88eb80a42e1a7d4d0000000000000000000000000000000000000000000000056bc75e2d63100000c001a0bbeaf993f51b3b3a3f3bb8db15ca7a502953f08d5b4a1eed9fa7de6eb95ba059a030d699df2ab4831f2032a347a112e0bb4a90dc411f10781c980982f38fb0e018", "unexpected refill transaction hex");
    

    globalStubs["EthWalletRefill.now"] = sinon.stub(EthWalletRefill.prototype as any, "now");
    var now = Math.floor(new Date().getTime() / 1000);

    // retry too soon (<60 secs)
    globalStubs["EthWalletRefill.now"].returns(now + 50);
    await refillManager.processWalletRefill().catch(() => {});
    expect(rawTxReq.length).to.equal(1, "unexpected number of refill transactions after retrying too soon");
    expect(refillManager.getFaucetRefillCooldown()).to.equal(3550, "unexpected faucet refill cooldown");
  
    // retry before cooldown
    globalStubs["EthWalletRefill.now"].returns(now + 61);
    await refillManager.processWalletRefill();
    expect(rawTxReq.length).to.equal(1, "unexpected number of refill transactions after retrying before cooldown");

    // retry after timeout
    globalStubs["EthWalletRefill.now"].returns(now + 3601);
    expect(refillManager.getFaucetRefillCooldown()).to.equal(0, "unexpected faucet refill cooldown");
    await refillManager.processWalletRefill();
    expect(rawTxReq.length).to.equal(2, "unexpected number of refill transactions after retry timeout");

  });

  it("Refill ERC20 token", async () => {
    fakeProvider.injectResponse("eth_chainId", 1337);
    let balances = {
      "0xca9456991e0aa5d5321e88bba44d405aab401193": "900000000000000000000",
      "0xa5058fbcd09425e922e3e9e78d569ab84edb88eb": "2000000000000000000000",
    };
    fakeProvider.injectResponse("eth_getBalance", (payload) => balances[payload.params[0].toLowerCase()]); // 900 ETH
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    fakeProvider.injectResponse("eth_blockNumber", "0x1000");
    fakeProvider.injectResponse("eth_call", (payload) => {
      switch(payload.params[0].data.substring(0, 10)) {
        case "0x": // test call
          return "0x";
        case "0xeb5a662e": // getAllowance()
          return "0x00000000000000000000000000000000000000000000003635c9adc5dea00000"; // 1000 ETH
        case "0x2e1a7d4d": // withdraw()
          return "0x";
        
        // ERC20 contract
        case "0x313ce567": // decimals()
          return "0x0000000000000000000000000000000000000000000000000000000000000012"; // 18
        case "0x70a08231": // balanceOf()
          return "0x000000000000000000000000000000000000000000000030CA024F987B900000"; // 900 ETH
        default:
          console.log("unknown call: ", payload);
      }
    });
    let rawTxReq: any[] = [];
    fakeProvider.injectResponse("eth_sendRawTransaction", (payload) => {
      rawTxReq.push(payload);
      return "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337";
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

    faucetConfig.faucetCoinType = FaucetCoinType.ERC20;
    faucetConfig.faucetCoinContract = "0x0000000000000000000000000000000000001337";
    (faucetConfig.ethRefillContract as any).requestAmount = 0;
    (faucetConfig.ethRefillContract as any).allowanceFnArgs = null;
    (faucetConfig.ethRefillContract as any).withdrawFnArgs = [ "{token}" ];

    await ServiceManager.GetService(EthWalletManager).initialize();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();

    await claimManager.processQueue();
    await awaitSleepPromise(500, () => rawTxReq.length > 0);

    expect(rawTxReq.length).to.equal(1, "unexpected number of refill transactions");
    expect(rawTxReq[0].params[0]).to.equal("0x02f8928205392a847735940085174876e800830493e094a5058fbcd09425e922e3e9e78d569ab84edb88eb80a42e1a7d4d0000000000000000000000000000000000000000000000000000000000001337c001a0f4ca9e128849d77ac2cb4ff5532eee72a7b0a23828626e9d94d902582b1f9447a01818841014eef50a5e803a94569a26477263e7237983aa15b383f35c7348b986", "unexpected refill transaction hex");
  });

  it("Refill wallet when no funds available", async () => {
    fakeProvider.injectResponse("eth_chainId", 1337);
    let balances = {
      "0xca9456991e0aa5d5321e88bba44d405aab401193": "900000000000000000000",
      "0xa5058fbcd09425e922e3e9e78d569ab84edb88eb": "0",
    };
    let allowance = "0x00000000000000000000000000000000000000000000003635c9adc5dea00000"; // 1000 ETH
    fakeProvider.injectResponse("eth_getBalance", (payload) => balances[payload.params[0].toLowerCase()]); // 900 ETH
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    fakeProvider.injectResponse("eth_blockNumber", "0x1000");
    fakeProvider.injectResponse("eth_call", (payload) => {
      switch(payload.params[0].data.substring(0, 10)) {
        case "0x": // test call
          return "0x";
        case "0xeb5a662e": // getAllowance()
          return allowance; // 0 ETH
        case "0x2e1a7d4d": // withdraw()
          return "0x";
        default:
          console.log("unknown call: ", payload);
      }
    });
    let rawTxReq: any[] = [];
    fakeProvider.injectResponse("eth_sendRawTransaction", (payload) => {
      rawTxReq.push(payload);
      return "0x1337b2933e4d908d44948ae7f8ec3184be10bbd67ba3c4b165be654281337337";
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

    await ServiceManager.GetService(EthWalletManager).initialize();
    let claimManager = ServiceManager.GetService(EthClaimManager);
    await claimManager.initialize();

    (faucetConfig.ethRefillContract as any).allowanceFnArgs = null;
    (faucetConfig.ethRefillContract as any).withdrawFnArgs = null;

    globalStubs["EthWalletRefill.now"] = sinon.stub(EthWalletRefill.prototype as any, "now");
    var now = Math.floor(new Date().getTime() / 1000);

    await claimManager.processQueue();
    await awaitSleepPromise(100, () => rawTxReq.length > 0);
    expect(rawTxReq.length).to.equal(0, "unexpected number of refill transactions 1");

    globalStubs["EthWalletRefill.now"].returns(now + 100);
    balances["0xa5058fbcd09425e922e3e9e78d569ab84edb88eb"] = "2000000000000000000000";
    allowance = "0x0000000000000000000000000000000000000000000000000000000000000000";
    await ServiceManager.GetService(EthWalletRefill).processWalletRefill();
    await awaitSleepPromise(100, () => rawTxReq.length > 0);
    expect(rawTxReq.length).to.equal(0, "unexpected number of refill transactions 2");

    globalStubs["EthWalletRefill.now"].returns(now + 200);
    allowance = "0x00000000000000000000000000000000000000000000003635c9adc5dea00000"
    balances["0xa5058fbcd09425e922e3e9e78d569ab84edb88eb"] = "90000000000000000000";
    await ServiceManager.GetService(EthWalletRefill).processWalletRefill();
    await awaitSleepPromise(100, () => rawTxReq.length > 1);
    expect(rawTxReq.length).to.equal(1, "unexpected number of refill transactions 3");
    expect(rawTxReq[0].params[0]).to.equal("0x02f8928205392a847735940085174876e800830493e094a5058fbcd09425e922e3e9e78d569ab84edb88eb80a42e1a7d4d000000000000000000000000000000000000000000000004e1003b28d9280000c080a013cb4e3c2c4c3b7cfcc40cc4ea523a9e1de1c6c84a78ca34e4397b3b3f6b5e5aa00608b20504471330f65a017e3905d0410bc9001eac7552f42f7bf6134fd5d071", "unexpected refill transaction hex");

  });

  
});
