import Web3 from 'web3';
import { ServiceManager } from "../../common/ServiceManager";
import { EthWalletManager } from "../../eth/EthWalletManager";
import { FaucetSession } from "../../session/FaucetSession";
import { BaseModule } from "../BaseModule";
import { ModuleHookAction } from "../ModuleManager";
import { defaultConfig, IMainnetWalletConfig } from './MainnetWalletConfig';
import { FaucetError } from '../../common/FaucetError';

export class MainnetWalletModule extends BaseModule<IMainnetWalletConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  private web3: Web3;

  protected override startModule(): Promise<void> {
    this.startWeb3();
    this.moduleManager.addActionHook(this, ModuleHookAction.SessionStart, 6, "Mainnet Wallet check", (session: FaucetSession, userInput: any) => this.processSessionStart(session, userInput));
    return Promise.resolve();
  }

  protected override stopModule(): Promise<void> {
    return Promise.resolve();
  }

  private startWeb3() {
    let provider = EthWalletManager.getWeb3Provider(this.moduleConfig.rpcHost);
    this.web3 = new Web3(provider);
  }

  private async processSessionStart(session: FaucetSession, userInput: any): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    let targetAddr = session.getTargetAddr();

    if(this.moduleConfig.minBalance > 0) {
      let minBalance = BigInt(this.moduleConfig.minBalance);
      let walletBalance: bigint;
      try {
        walletBalance = BigInt(await this.web3.eth.getBalance(targetAddr));
      } catch(ex) {
        throw new FaucetError("MAINNET_BALANCE_CHECK", "Could not get balance of mainnet wallet " + targetAddr + ": " + ex.toString());
      }
      if(walletBalance < minBalance)
        throw new FaucetError("MAINNET_BALANCE_LIMIT", "You need to hold at least " + ServiceManager.GetService(EthWalletManager).readableAmount(minBalance, true) + " in your wallet on mainnet to use this faucet.");
    }

    if(this.moduleConfig.minTxCount > 0) {
      let walletTxCount: number;
      try {
        walletTxCount = await this.web3.eth.getTransactionCount(targetAddr);
      } catch(ex) {
        throw new FaucetError("MAINNET_TXCOUNT_CHECK", "Could not get tx-count of mainnet wallet " + targetAddr + ": " + ex.toString());
      }
      if(walletTxCount < this.moduleConfig.minTxCount)
        throw new FaucetError("MAINNET_TXCOUNT_LIMIT", "You need to submit at least " + this.moduleConfig.minTxCount + " transactions from your wallet on mainnet to use this faucet.");
    }

    
  }

}
