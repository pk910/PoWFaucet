import { FaucetSession } from "../../session/FaucetSession.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { defaultConfig, IEnsNameConfig } from './EnsNameConfig.js';
import { FaucetError } from '../../common/FaucetError.js';
import { ContractCaller, EthRpcClient, namehash, normalize, rpcErrorString } from '../../eth/rpc/index.js';

const ENS_MAINNET_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const ENS_REGISTRY_ABI = ["function resolver(bytes32 node) view returns (address)"];
const ENS_RESOLVER_ABI = ["function addr(bytes32 node) view returns (address)"];
const ZERO_ADDRESS = /^0x0{40}$/i;

export class EnsNameModule extends BaseModule<IEnsNameConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  private client: EthRpcClient;

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
    this.client?.dispose();
    this.client = null;
    return Promise.resolve();
  }

  protected override onConfigReload(): void {
    this.client?.dispose();
    this.initEnsResolver();
  }

  private initEnsResolver() {
    this.client = EthRpcClient.fromRpcHost(this.moduleConfig.rpcHost);
  }

  /**
   * The address a name points to, lower-cased, or null when it points nowhere.
   * With a Universal Resolver configured, the resolver does the walk (and reaches wildcard and
   * offchain names); otherwise registry.resolver(node) then resolver.addr(node).
   */
  public async resolveName(name: string): Promise<string | null> {
    if(this.moduleConfig.universalResolver) {
      let addr = await this.client.getEnsAddress(name, this.moduleConfig.universalResolver);
      return addr && !ZERO_ADDRESS.test(addr) ? addr.toLowerCase() : null;
    }
    let node = namehash(normalize(name));
    let registry = new ContractCaller(this.client, this.moduleConfig.ensAddr || ENS_MAINNET_REGISTRY, ENS_REGISTRY_ABI);
    let resolverAddr = await registry.call("resolver", [node]) as string;
    if(!resolverAddr || ZERO_ADDRESS.test(resolverAddr))
      return null;
    let resolver = new ContractCaller(this.client, resolverAddr, ENS_RESOLVER_ABI);
    let addr = await resolver.call("addr", [node]) as string;
    if(!addr || ZERO_ADDRESS.test(addr))
      return null;
    return addr.toLowerCase();
  }

  private async processSessionStart(session: FaucetSession, userInput: any): Promise<void> {
    let targetAddr: string = userInput.addr;
    let isEnsName = false;
    if(typeof targetAddr === "string" && targetAddr.match(/^[-a-zA-Z0-9@:%._\+~#=]{1,256}\.eth$/)) {
      let resolved: string | null;
      try {
        resolved = await this.resolveName(targetAddr);
      } catch(ex) {
        throw new FaucetError("INVALID_ENSNAME", "Could not resolve ENS Name '" + targetAddr + "': " + rpcErrorString(ex));
      }
      if(!resolved)
        throw new FaucetError("INVALID_ENSNAME", "Could not resolve ENS Name '" + targetAddr + "': name has no address");
      session.setTargetAddr(resolved);
      isEnsName = true;
    }

    if(this.moduleConfig.required && !isEnsName) {
      throw new FaucetError("REQUIRE_ENSNAME", "Only ENS Names allowed.");
    }
  }

}
