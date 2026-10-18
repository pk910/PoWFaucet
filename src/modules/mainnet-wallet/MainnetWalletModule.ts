import { ServiceManager } from "../../common/ServiceManager.js";
import { EthWalletManager } from "../../eth/EthWalletManager.js";
import { FaucetSession } from "../../session/FaucetSession.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { defaultConfig, IMainnetWalletConfig } from './MainnetWalletConfig.js';
import { FaucetError } from '../../common/FaucetError.js';
import { Erc20Abi } from '../../abi/ERC20.js';
import { ContractCaller, EthRpcClient, rpcErrorString } from '../../eth/rpc/index.js';

export class MainnetWalletModule extends BaseModule<IMainnetWalletConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  private client: EthRpcClient;

  protected override startModule(): Promise<void> {
    this.startRpcClient();
    this.moduleManager.addActionHook(this, ModuleHookAction.SessionStart, 7, "Mainnet Wallet check", (session: FaucetSession, userInput: any) => this.processSessionStart(session, userInput));
    return Promise.resolve();
  }

  protected override stopModule(): Promise<void> {
    this.client?.dispose();
    this.client = null;
    return Promise.resolve();
  }

  private startRpcClient() {
    this.client = EthRpcClient.fromRpcHost(this.moduleConfig.rpcHost);
  }

  private async processSessionStart(session: FaucetSession, userInput: any): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    let targetAddr = session.getTargetAddr();

    if(this.moduleConfig.minBalance > 0) {
      let minBalance = BigInt(this.moduleConfig.minBalance);
      let walletBalance: bigint;
      try {
        walletBalance = await this.client.getBalance(targetAddr);
      } catch(ex) {
        throw new FaucetError("MAINNET_BALANCE_CHECK", "Could not get balance of mainnet wallet " + targetAddr + ": " + rpcErrorString(ex));
      }
      if(walletBalance < minBalance)
        throw new FaucetError("MAINNET_BALANCE_LIMIT", "You need to hold at least " + ServiceManager.GetService(EthWalletManager).readableAmount(minBalance, true) + " in your wallet on mainnet to use this faucet.");
    }

    if(this.moduleConfig.minTxCount > 0) {
      let walletTxCount: number;
      try {
        walletTxCount = await this.client.getTransactionCount(targetAddr);
      } catch(ex) {
        throw new FaucetError("MAINNET_TXCOUNT_CHECK", "Could not get tx-count of mainnet wallet " + targetAddr + ": " + rpcErrorString(ex));
      }
      if(walletTxCount < this.moduleConfig.minTxCount)
        throw new FaucetError("MAINNET_TXCOUNT_LIMIT", "You need to submit at least " + this.moduleConfig.minTxCount + " transactions from your wallet on mainnet to use this faucet.");
    }

    if(this.moduleConfig.minErc20Balances.length > 0) {
      for(let i = 0; i < this.moduleConfig.minErc20Balances.length; i++) {
        let erc20Token = this.moduleConfig.minErc20Balances[i];
        let minBalance = BigInt(erc20Token.minBalance);

        let walletBalance: bigint;
        try {
          let tokenContract = new ContractCaller(this.client, erc20Token.address, Erc20Abi);
          walletBalance = BigInt(await tokenContract.call("balanceOf", [targetAddr]) as bigint);
        } catch(ex) {
          throw new FaucetError("MAINNET_BALANCE_CHECK", "Could not get token balance of mainnet wallet " + targetAddr + ": " + rpcErrorString(ex));
        }
        if(walletBalance < minBalance) {
          let factor = Math.pow(10, erc20Token.decimals || 18);
          let amountStr = (Math.floor(parseInt(minBalance.toString()) / factor * 1000) / 1000).toString();
          throw new FaucetError("MAINNET_BALANCE_LIMIT", "You need to hold at least " + amountStr + " " + erc20Token.name + " in your wallet on mainnet to use this faucet.");
        }
      }
    }
  }

}
