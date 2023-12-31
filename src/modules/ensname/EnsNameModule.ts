import Web3 from 'web3';
import { ENS } from 'web3-eth-ens';
import { FaucetSession } from "../../session/FaucetSession.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { defaultConfig, IEnsNameConfig } from './EnsNameConfig.js';
import { FaucetError } from '../../common/FaucetError.js';
import { EthWalletManager } from '../../eth/EthWalletManager.js';

export class EnsNameModule extends BaseModule<IEnsNameConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  private ens: ENS;
  private web3: Web3;

  protected override startModule(): Promise<void> {
    this.initEnsResolver();
    this.moduleManager.addActionHook(
      this, ModuleHookAction.ClientConfig, 1, "ens config", 
      async (clientConfig: any) => {
        clientConfig[this.moduleName] = {
          required: !!this.moduleConfig.required,
        };
      }
    );
    this.moduleManager.addActionHook(this, ModuleHookAction.SessionStart, 3, "resolve ens name", (session: FaucetSession, userInput: any) => this.processSessionStart(session, userInput));
    return Promise.resolve();
  }

  protected override stopModule(): Promise<void> {
    // nothing to do
    return Promise.resolve();
  }

  protected override onConfigReload(): void {
    this.initEnsResolver();
  }

  private initEnsResolver() {
    let provider = EthWalletManager.getWeb3Provider(this.moduleConfig.rpcHost);
    this.ens = new ENS(this.moduleConfig.ensAddr || "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e", provider);
  }

  private async processSessionStart(session: FaucetSession, userInput: any): Promise<void> {
    let targetAddr: string = userInput.addr;
    let isEnsName = false;
    if(typeof targetAddr === "string" && targetAddr.match(/^[-a-zA-Z0-9@:%._\+~#=]{1,256}\.eth$/)) {
      try {
        targetAddr = (await this.ens.getAddress(targetAddr)) as string;
        session.setTargetAddr(targetAddr);
        isEnsName = true;
      } catch(ex) {
        throw new FaucetError("INVALID_ENSNAME", "Could not resolve ENS Name '" + targetAddr + "': " + ex.toString());
      }
    }

    if(this.moduleConfig.required && !isEnsName) {
      throw new FaucetError("REQUIRE_ENSNAME", "Only ENS Names allowed.");
    }
  }

}
