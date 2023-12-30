import path, { dirname, basename } from "path";
import { fileURLToPath } from "url";
import { isMainThread, workerData } from "node:worker_threads";
import { loadFaucetConfig, setAppBasePath } from "./config/FaucetConfig.js";
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

(async () => {
  if(!isMainThread) {
    FaucetWorkers.loadWorkerClass();
  }
  else {
    try {
      let importUrl = fileURLToPath(import.meta.url);
      const __dirname = dirname(importUrl);

      setAppBasePath(path.join(__dirname, ".."))
      loadFaucetConfig()
      ServiceManager.GetService(FaucetProcess).initialize();
      ServiceManager.GetService(FaucetWorkers).initialize(importUrl);
      ServiceManager.GetService(FaucetStatus).initialize();
      ServiceManager.GetService(FaucetStatsLog).initialize();
      await ServiceManager.GetService(FaucetDatabase).initialize();
      await ServiceManager.GetService(EthWalletManager).initialize();
      await ServiceManager.GetService(ModuleManager).initialize();
      await ServiceManager.GetService(SessionManager).initialize();
      await ServiceManager.GetService(EthClaimManager).initialize();
      ServiceManager.GetService(FaucetHttpServer).initialize();

      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Faucet initialization complete.");
    } catch(ex) {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Faucet initialization failed: " + ex.toString() + " " + ex.stack);
      process.exit(0);
    }
  }
})();



