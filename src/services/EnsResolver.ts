
import Web3 from 'web3';
import ENS from 'ethereum-ens';

import { faucetConfig } from '../common/FaucetConfig';
import { ServiceManager } from '../common/ServiceManager';
import { FaucetProcess } from '../common/FaucetProcess';

export class EnsResolver {
  private initialized: boolean;
  private ens: ENS;

  public initialize() {
    if(this.initialized)
      return;
    this.initialized = true;

    this.initEns();

    // reload handler
    ServiceManager.GetService(FaucetProcess).addListener("reload", () => {
      this.initEns();
    });
  }

  private initEns() {
    if(faucetConfig.ensResolver) {
      let provider = new Web3.providers.HttpProvider(faucetConfig.ensResolver.rpcHost);
      this.ens = new ENS(provider, faucetConfig.ensResolver.ensAddr || undefined, Web3);
    }
    else {
      this.ens = null;
    }
  }

  public resolveEnsName(ensName: string): Promise<string> {
    if(!this.ens)
      return Promise.reject("ENS resolver not enabled");
    
    return this.ens.resolver(ensName).addr();
  }

}
