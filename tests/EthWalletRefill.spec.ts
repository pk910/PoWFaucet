import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, awaitSleepPromise } from './common';
import { ServiceManager } from '../src/common/ServiceManager';
import { FaucetDatabase } from '../src/db/FaucetDatabase';
import { ModuleHookAction, ModuleManager } from '../src/modules/ModuleManager';
import { SessionManager } from '../src/session/SessionManager';
import { faucetConfig } from '../src/config/FaucetConfig';
import { FaucetError } from '../src/common/FaucetError';
import { FaucetSession, FaucetSessionStatus } from '../src/session/FaucetSession';
import { MODULE_CLASSES } from '../src/modules/modules';
import { FaucetProcess } from '../src/common/FaucetProcess';
import { BaseModule } from '../src/modules/BaseModule';
import { FakeProvider } from './stubs/FakeProvider';
import { IEnsNameConfig } from '../src/modules/ensname/EnsNameConfig';
import { IMainnetWalletConfig } from '../src/modules/mainnet-wallet/MainnetWalletConfig';
import { EthWalletManager } from '../src/eth/EthWalletManager';
import { EthClaimManager } from '../src/eth/EthClaimManager';
import { sleepPromise } from '../src/utils/SleepPromise';


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
    fakeProvider.injectResponse("eth_getBalance", (payload) => balances[payload.params[0]]); // 900 ETH
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    fakeProvider.injectResponse("eth_call", (payload) => {
      switch(payload.params[0].data.substring(0, 10)) {
        case "0xeb5a662e": // getAllowance()
          return "0x00000000000000000000000000000000000000000000003635c9adc5dea00000"; // 1000 ETH
        default:
          console.log("unknown call: ", payload);
      }
    });
    let rawTxReq = [];
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
    fakeProvider.injectResponse("eth_getBalance", (payload) => balances[payload.params[0]]); // 900 ETH
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    let rawTxReq = [];
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

  
});
