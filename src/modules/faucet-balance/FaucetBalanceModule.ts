import { ServiceManager } from "../../common/ServiceManager";
import { EthWalletManager } from "../../eth/EthWalletManager";
import { FaucetSession } from "../../session/FaucetSession";
import { BaseModule } from "../BaseModule";
import { ModuleHookAction } from "../ModuleManager";
import { defaultConfig, IFaucetBalanceConfig } from './FaucetBalanceConfig';
import { ISessionRewardFactor } from "../../session/SessionRewardFactor";
import { EthClaimManager } from "../../eth/EthClaimManager";
import { faucetConfig } from "../../config/FaucetConfig";
import { SessionManager } from "../../session/SessionManager";

export class FaucetBalanceModule extends BaseModule<IFaucetBalanceConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  private balanceRestriction: number;
  private balanceRestrictionRefresh = 0;

  protected override startModule(): Promise<void> {
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionRewardFactor, 6, "faucet balance",
      (session: FaucetSession, rewardFactors: ISessionRewardFactor[]) => this.processSessionRewardFactor(session, rewardFactors)
    );
    return Promise.resolve();
  }

  protected override stopModule(): Promise<void> {
    // nothing to do
    return Promise.resolve();
  }

  protected override onConfigReload(): void {
    this.balanceRestrictionRefresh = 0;
  }

  private async processSessionRewardFactor(session: FaucetSession, rewardFactors: ISessionRewardFactor[]): Promise<void> {
    await this.refreshBalanceRestriction();
    if(this.balanceRestriction !== 100) {
      rewardFactors.push({
        factor: this.balanceRestriction / 100,
        module: this.moduleName,
      });
    }
  }

  private async refreshBalanceRestriction(): Promise<void> {
    let now = Math.floor((new Date()).getTime() / 1000);
    if(this.balanceRestrictionRefresh > now - 30)
      return;
      
    let faucetBalance = ServiceManager.GetService(EthWalletManager).getFaucetBalance();
    if(faucetBalance === null)
      return;
    
    this.balanceRestrictionRefresh = now;
    faucetBalance -= await ServiceManager.GetService(SessionManager).getUnclaimedBalance(); // subtract balance from active & claimable sessions
    faucetBalance -= ServiceManager.GetService(EthClaimManager).getQueuedAmount(); // subtract pending transaction amounts
    
    this.balanceRestriction = Math.min(
      this.getStaticBalanceRestriction(faucetBalance),
      this.getDynamicBalanceRestriction(faucetBalance)
    );
  }

  public getBalanceRestriction(): number {
    return this.balanceRestriction;
  }

  private getStaticBalanceRestriction(balance: bigint): number {
    if(!this.moduleConfig.fixedRestriction)
      return 100;

    let restrictedReward = 100;
    let minbalances = Object.keys(this.moduleConfig.fixedRestriction).map((v) => parseInt(v)).sort((a, b) => a - b);
    let faucetBalance = ServiceManager.GetService(EthWalletManager).decimalUnitAmount(balance);
    if(faucetBalance <= minbalances[minbalances.length - 1]) {
      for(let i = 0; i < minbalances.length; i++) {
        if(faucetBalance <= minbalances[i]) {
          let restriction = this.moduleConfig.fixedRestriction[minbalances[i]];
          if(restriction < restrictedReward)
            restrictedReward = restriction;
        }
      }
    }

    return restrictedReward;
  }

  private getDynamicBalanceRestriction(balance: bigint): number {
    if(!this.moduleConfig.dynamicRestriction || !this.moduleConfig.dynamicRestriction.targetBalance)
      return 100;
    let targetBalance = BigInt(this.moduleConfig.dynamicRestriction.targetBalance) * BigInt(Math.pow(10, ServiceManager.GetService(EthWalletManager).getFaucetDecimals()));
    if(balance >= targetBalance)
      return 100;
    if(balance <= faucetConfig.spareFundsAmount)
      return 0;

    let mineableBalance = balance - BigInt(faucetConfig.spareFundsAmount);
    let balanceRestriction = parseInt((mineableBalance * 100000n / targetBalance).toString()) / 1000;
    return balanceRestriction;
  }
}
