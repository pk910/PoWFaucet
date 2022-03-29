
import Web3 from 'web3';
import ENS from 'ethereum-ens';

import { faucetConfig } from '../common/FaucetConfig';

export class EnsWeb3Manager {
  private ens: ENS;

  public constructor() {
    if(!faucetConfig.ensResolver)
      return;
    
    let provider = new Web3.providers.HttpProvider(faucetConfig.ensResolver.rpcHost);
    this.ens = new ENS(provider, faucetConfig.ensResolver.ensAddr || undefined, Web3);
  }

  public resolveEnsName(ensName: string): Promise<string> {
    if(!this.ens)
      return Promise.reject("ENS resolver not enabled");
    
    return this.ens.resolver(ensName).addr();
  }

}
