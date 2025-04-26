import { ServiceManager } from "../../common/ServiceManager.js";
import { EthWalletManager } from "../../eth/EthWalletManager.js";
import { FaucetSession, FaucetSessionStatus } from "../../session/FaucetSession.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { defaultConfig, IVoucherConfig } from './VoucherConfig.js';
import { FaucetError } from '../../common/FaucetError.js';
import { FaucetDatabase } from "../../db/FaucetDatabase.js";
import { FaucetLogLevel, FaucetProcess } from "../../common/FaucetProcess.js";
import { VoucherDB } from './VoucherDB.js';

export class VoucherModule extends BaseModule<IVoucherConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  private voucherDb: VoucherDB;

  protected override async startModule(): Promise<void> {
    this.voucherDb = await ServiceManager.GetService(FaucetDatabase).createModuleDb(VoucherDB, this);

    this.moduleManager.addActionHook(
      this, ModuleHookAction.ClientConfig, 1, "Voucher config",
      async (clientConfig: any) => {
        clientConfig[this.moduleName] = {
          voucherLabel: this.moduleConfig.voucherLabel,
          infoHtml: this.moduleConfig.infoHtml,
        };
      }
    );

    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionStart, 2, "Voucher check",
      (session: FaucetSession, userInput: any) => this.processSessionStart(session, userInput)
    );

    return Promise.resolve();
  }

  protected override stopModule(): Promise<void> {
    return Promise.resolve();
  }

  private async processSessionStart(session: FaucetSession, userInput: any): Promise<void> {
    const voucherCode = userInput?.voucherCode as string | undefined;

    if (!voucherCode) {
      throw new FaucetError("VOUCHER_REQUIRED", "A valid voucher code is required.");
    }

    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, `Voucher code provided for session ${session.getSessionId()}: ${voucherCode}`);
    const voucher = await this.voucherDb.getVoucher(voucherCode);

    if (!voucher) {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, `Invalid voucher code provided for session ${session.getSessionId()}: ${voucherCode}`);
      throw new FaucetError(
        "VOUCHER_INVALID",
        "The provided voucher code is not valid.",
      );
    }

    if (voucher.sessionId) {
      const usedSession = await ServiceManager.GetService(FaucetDatabase).getSession(voucher.sessionId);
      if (!usedSession || usedSession.status !== FaucetSessionStatus.FAILED) {
        throw new FaucetError(
          "VOUCHER_USED",
          "This voucher code has already been used.",
        );
      }
    }

    await this.voucherDb.updateVoucher(
      voucher.code,
      session.getSessionId(),
      session.getTargetAddr(),
      session.getStartTime()
    );

    if (voucher.dropAmount) {
      const overrideMaxDropAmount = BigInt(voucher.dropAmount);
      session.setDropAmount(overrideMaxDropAmount);
      session.setSessionData("overrideMaxDropAmount", voucher.dropAmount);
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.INFO,
        `Voucher ${voucherCode} overrides max drop amount to ${ServiceManager.GetService(EthWalletManager).readableAmount(BigInt(voucher.dropAmount))} for session ${session.getSessionId()}`
      );
    }
  }
}
