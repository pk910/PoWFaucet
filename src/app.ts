// IMPORTANT: Make sure to import `instrument.js` at the top of your file.
import "./instrument.js";

import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { isMainThread } from "node:worker_threads";
import {
  faucetConfig,
  loadFaucetConfig,
  setAppBasePath,
} from "./config/FaucetConfig.js";
import { FaucetWorkers } from "./common/FaucetWorker.js";
import { EthWalletManager } from "./eth/EthWalletManager.js";
import { FaucetHttpServer } from "./webserv/FaucetHttpServer.js";
import { FaucetDatabase } from "./db/FaucetDatabase.js";
import { ServiceManager } from "./common/ServiceManager.js";
import { FaucetStatsLog } from "./services/FaucetStatsLog.js";
import { FaucetLogLevel, FaucetProcess } from "./common/FaucetProcess.js";
import { EthClaimManager } from "./eth/EthClaimManager.js";
import { ModuleManager } from "./modules/ModuleManager.js";
import { SessionManager } from "./session/SessionManager.js";
import { FaucetStatus } from "./services/FaucetStatus.js";
import { PromMetricsService } from "./services/PromMetrics.js";
import { GitcoinClaimer } from "./modules/gitcoin-claimer/GitcoinClaimer.js";

import * as Sentry from "@sentry/node";

(async () => {
  if (!isMainThread) {
    FaucetWorkers.loadWorkerClass();
  } else {
    try {
      let srcfile: string;
      if (typeof require !== "undefined") {
        srcfile = require.main.filename;
      } else {
        srcfile = fileURLToPath(import.meta.url);
      }
      let basepath = path.join(dirname(srcfile), "..");

      setAppBasePath(basepath);
      loadFaucetConfig();
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.INFO,
        "Initializing PoWFaucet v" +
          faucetConfig.faucetVersion +
          " (AppBasePath: " +
          faucetConfig.appBasePath +
          ", InternalBasePath: " +
          basepath +
          ")"
      );
      ServiceManager.GetService(FaucetProcess).initialize();
      ServiceManager.GetService(FaucetWorkers).initialize(srcfile);
      ServiceManager.GetService(FaucetStatus).initialize();
      ServiceManager.GetService(FaucetStatsLog).initialize();
      await ServiceManager.GetService(FaucetDatabase).initialize();
      await ServiceManager.GetService(EthWalletManager).initialize();
      await ServiceManager.GetService(ModuleManager).initialize();
      await ServiceManager.GetService(SessionManager).initialize();
      await ServiceManager.GetService(EthClaimManager).initialize();
      await ServiceManager.GetService(GitcoinClaimer).initialize();
      ServiceManager.GetService(FaucetHttpServer).initialize();
      ServiceManager.GetService(PromMetricsService).initialize();

      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.INFO,
        "Faucet initialization complete."
      );
    } catch (ex) {
      const msg = "Faucet initialization failed";
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.ERROR,
        `${msg}: ${ex.toString()} ${ex.stack}`
      );
      Sentry.captureException(ex, {
        extra: { origin: msg },
      });
      process.exit(0);
    }
  }
})();
