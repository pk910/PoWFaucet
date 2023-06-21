import path from "path";
import { isMainThread, workerData } from "node:worker_threads";
import { loadFaucetConfig, setAppBasePath } from "./config/FaucetConfig";
import { FaucetWorkers } from "./common/FaucetWorker";
import { EthWalletManager } from "./eth/EthWalletManager";
import { FaucetHttpServer } from "./webserv/FaucetHttpServer";
import { FaucetDatabase } from "./db/FaucetDatabase";
import { ServiceManager } from "./common/ServiceManager";
import { FaucetStatsLog } from "./services/FaucetStatsLog";
import { FaucetLogLevel, FaucetProcess } from "./common/FaucetProcess";
import { EthClaimManager } from "./eth/EthClaimManager";
import { ModuleManager } from "./modules/ModuleManager";
import { SessionManager } from "./session/SessionManager";

(async () => {
  if(!isMainThread) {
    FaucetWorkers.loadWorkerClass();
  }
  else {
    try {
      setAppBasePath(path.join(__dirname, ".."))
      loadFaucetConfig()
      ServiceManager.GetService(FaucetProcess).initialize();
      ServiceManager.GetService(FaucetWorkers).initialize(__filename);
      ServiceManager.GetService(FaucetStatsLog).initialize();
      await ServiceManager.GetService(FaucetDatabase).initialize();
      await ServiceManager.GetService(EthWalletManager).initialize();
      await ServiceManager.GetService(ModuleManager).initialize();
      await ServiceManager.GetService(SessionManager).initialize();
      await ServiceManager.GetService(EthClaimManager).initialize();
      ServiceManager.GetService(FaucetHttpServer).initialize();

      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Faucet initialization complete.");
    } catch(ex) {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Faucet initialization failed: " + ex.toString());
      process.exit(0);
    }
  }
})();



