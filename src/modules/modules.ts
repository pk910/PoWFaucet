import { AuthenticatoorModule } from "./authenticatoor/AuthenticatoorModule.js";
import { CaptchaModule } from "./captcha/CaptchaModule.js";
import { ConcurrencyLimitModule } from "./concurrency-limit/ConcurrencyLimitModule.js";
import { EnsNameModule } from "./ensname/EnsNameModule.js";
import { EthInfoModule } from "./ethinfo/EthInfoModule.js";
import { FaucetBalanceModule } from "./faucet-balance/FaucetBalanceModule.js";
import { FaucetOutflowModule } from "./faucet-outflow/FaucetOutflowModule.js";
import { GithubModule } from "./github/GithubModule.js";
import { IPInfoModule } from "./ipinfo/IPInfoModule.js";
import { MainnetWalletModule } from "./mainnet-wallet/MainnetWalletModule.js";
import { PassportModule } from "./passport/PassportModule.js";
import { PoWModule } from "./pow/PoWModule.js";
import { RecurringLimitsModule } from "./recurring-limits/RecurringLimitsModule.js";
import { VoucherModule } from "./voucher/VoucherModule.js";
import { WhitelistModule } from "./whitelist/WhitelistModule.js";
import { ZupassModule } from "./zupass/ZupassModule.js";

/**
 * The modules the faucet knows, by config key.
 *
 * Mutable, because a module adds to it at load time (PLAN_PLUGIN_ARCHITECTURE §3). It is
 * still written as a literal of the compiled-in ones: reading the file should tell you
 * what a stock faucet has, and `registerModuleClass` is how anything else arrives.
 *
 * The list is the faucet's own modules and nothing else. An installed module's classes
 * are configured in `faucet-config.yaml` by the same keys they always were - the difference is that
 * the classes behind them arrive through the loader instead of from an import here.
 */
export const MODULE_CLASSES: {[key: string]: any} = {
  "authenticatoor": AuthenticatoorModule,
  "captcha": CaptchaModule,
  "concurrency-limit": ConcurrencyLimitModule,
  "ensname": EnsNameModule,
  "ethinfo": EthInfoModule,
  "faucet-balance": FaucetBalanceModule,
  "faucet-outflow": FaucetOutflowModule,
  "github": GithubModule,
  "ipinfo": IPInfoModule,
  "mainnet-wallet": MainnetWalletModule,
  "passport": PassportModule,
  "pow": PoWModule,
  "recurring-limits": RecurringLimitsModule,
  "voucher": VoucherModule,
  "whitelist": WhitelistModule,
  "zupass": ZupassModule,
}

/**
 * Adds a module class under a config key, for a module.
 *
 * Refuses a key that is already taken rather than replacing it. A module that shadowed
 * `pow` would be a faucet that silently stops paying miners, and the failure would look
 * like anything but a module - so it fails at load, where the module's name is still in
 * hand.
 */
export function registerModuleClass(name: string, moduleClass: any) {
  if(!name || typeof name !== "string")
    throw new Error("module key must be a non-empty string, got " + JSON.stringify(name));
  if(MODULE_CLASSES[name])
    throw new Error("module key '" + name + "' is already registered; a module may not replace a module");
  if(typeof moduleClass !== "function")
    throw new Error("module '" + name + "' is not a class");
  MODULE_CLASSES[name] = moduleClass;
}
