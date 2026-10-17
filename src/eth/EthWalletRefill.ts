import { faucetConfig } from "../config/FaucetConfig.js";
import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess.js";
import { ServiceManager } from "../common/ServiceManager.js";
import { EthClaimManager } from "./EthClaimManager.js";
import { EthWalletManager, TransactionResult } from "./EthWalletManager.js";
import { ContractCaller } from "./rpc/index.js";
import { resolveCallArgs } from "./CallArgs.js";
import { SessionManager } from "../session/SessionManager.js";

export class EthWalletRefill {
  private lastWalletRefill: number;
  private lastWalletRefillTry: number;
  private walletRefillPromise: Promise<void>;

  private now(): number {
    return Math.floor(new Date().getTime() / 1000);
  }

  public processWalletRefill(): Promise<void> {
    if(!this.walletRefillPromise) {
      this.walletRefillPromise = this.tryRefillWallet();
      this.walletRefillPromise.finally(() => {
        this.walletRefillPromise = null;
      });
    }
    return this.walletRefillPromise;
  }

  private async tryRefillWallet() {
    if(!faucetConfig.ethRefillContract)
      return;
    let now = this.now();
    if(this.lastWalletRefillTry && now - this.lastWalletRefillTry < 60)
      return;
    if(this.lastWalletRefill && faucetConfig.ethRefillContract.cooldownTime && now - this.lastWalletRefill < faucetConfig.ethRefillContract.cooldownTime)
      return;
    this.lastWalletRefillTry = now;

    let walletState = ServiceManager.GetService(EthWalletManager).getWalletState();
    let unclaimedBalance = await ServiceManager.GetService(SessionManager).getUnclaimedBalance();
    let walletBalance = walletState.balance - unclaimedBalance - ServiceManager.GetService(EthClaimManager).getQueuedAmount();
    let refillAction: string = null;
    if(faucetConfig.ethRefillContract.overflowBalance && walletBalance > BigInt(faucetConfig.ethRefillContract.overflowBalance))
      refillAction = "overflow";
    else if(walletBalance < BigInt(faucetConfig.ethRefillContract.triggerBalance))
      refillAction = "refill";
    
    if(!refillAction)
      return;
    
    try {
      let txResult: TransactionResult;
      if(refillAction == "refill")
        txResult = await this.refillWallet();
      else if(refillAction == "overflow")
        txResult = await this.overflowWallet(walletBalance - BigInt(faucetConfig.ethRefillContract.overflowBalance));
      
      this.lastWalletRefill = this.now();

      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Sending " + refillAction + " transaction to vault contract: " + txResult.txHash);

      try {
        let txReceipt = await txResult.txPromise;
        if(!txReceipt.status)
          throw txReceipt.receipt;
        await ServiceManager.GetService(EthWalletManager).loadWalletState(); // refresh balance
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Faucet wallet successfully refilled from vault contract.");
      } catch(err) {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Faucet wallet refill transaction reverted: " + err.toString());
      }
    } catch(ex) {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Faucet wallet refill from vault contract failed: " + ex.toString());
    }
  }

  /** {walletAddr}, {amount} and {token} as the claim transaction templates resolve them (src/eth/CallArgs.ts) */
  private resolveCallArgs(args: string[], amount: string): unknown[] {
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    return resolveCallArgs(args, {
      walletAddr: ethWalletManager.getFaucetAddress(),
      token: ethWalletManager.getTokenAddress(),
      amount: amount,
    });
  }

  private async refillWallet(): Promise<TransactionResult> {
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let refillContract: ContractCaller = ethWalletManager.getContract(faucetConfig.ethRefillContract.contract, faucetConfig.ethRefillContract.abi);
    let refillAmount = BigInt(faucetConfig.ethRefillContract.requestAmount) || 0n;
    let refillAllowance: bigint = null;

    let getCallArgs = (args) => this.resolveCallArgs(args, refillAmount.toString());

    if(faucetConfig.ethRefillContract.allowanceFn) {
      // check allowance
      let callArgs = getCallArgs(faucetConfig.ethRefillContract.allowanceFnArgs || ["{walletAddr}"]);
      refillAllowance = BigInt(await refillContract.call(faucetConfig.ethRefillContract.allowanceFn, callArgs) as bigint);
      if(refillAllowance == 0n)
        throw "no withdrawable funds from refill contract";
      if(refillAmount > refillAllowance)
        refillAmount = refillAllowance;
    }

    if(faucetConfig.ethRefillContract.checkContractBalance) {
      let checkAddr = (typeof faucetConfig.ethRefillContract.checkContractBalance === "string" ? faucetConfig.ethRefillContract.checkContractBalance : faucetConfig.ethRefillContract.contract);
      let contractBalance = await ethWalletManager.getWalletBalance(checkAddr);
      let dustBalance = faucetConfig.ethRefillContract.contractDustBalance ? BigInt(faucetConfig.ethRefillContract.contractDustBalance) : 1000000000n;
      if(contractBalance <= dustBalance)
        throw "refill contract is out of funds";
      if(refillAmount > contractBalance)
        refillAmount = contractBalance;
    }

    let callArgs = getCallArgs(faucetConfig.ethRefillContract.withdrawFnArgs || ["{amount}"]);
    return await ethWalletManager.sendCustomTx(
      faucetConfig.ethRefillContract.contract,
      0n,
      refillContract.encode(faucetConfig.ethRefillContract.withdrawFn, callArgs),
      faucetConfig.ethRefillContract.withdrawGasLimit
    );
  }

  private async overflowWallet(amount: bigint): Promise<TransactionResult> {
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let refillContract: ContractCaller = ethWalletManager.getContract(faucetConfig.ethRefillContract.contract, faucetConfig.ethRefillContract.abi);

    let getCallArgs = (args) => this.resolveCallArgs(args, amount.toString());

    let callArgs = getCallArgs(faucetConfig.ethRefillContract.depositFnArgs || []);
    return await ethWalletManager.sendCustomTx(
      faucetConfig.ethRefillContract.contract,
      amount,
      faucetConfig.ethRefillContract.depositFn ? refillContract.encode(faucetConfig.ethRefillContract.depositFn, callArgs) : undefined,
      faucetConfig.ethRefillContract.withdrawGasLimit
    );
  }

  public getFaucetRefillCooldown(): number {
    let now = this.now();
    if(!faucetConfig.ethRefillContract || !faucetConfig.ethRefillContract.cooldownTime)
      return 0;
    if(!this.lastWalletRefill)
      return 0;
    let cooldown = faucetConfig.ethRefillContract.cooldownTime - (now - this.lastWalletRefill);
    if(cooldown < 0)
      return 0;
    return cooldown;
  }

}
