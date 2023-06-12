import { isMainThread } from "node:worker_threads";
import { loadFaucetConfig } from "./config/FaucetConfig";
import { FaucetWorkers } from "./common/FaucetWorker";
import { EthWalletManager } from "./eth/EthWalletManager";
import { FaucetHttpServer } from "./webserv/FaucetHttpServer";
import { FaucetDatabase } from "./db/FaucetDatabase";
import { ServiceManager } from "./common/ServiceManager";
import { FaucetStatsLog } from "./services/FaucetStatsLog";
import { FaucetProcess } from "./common/FaucetProcess";
import { EthClaimManager } from "./eth/EthClaimManager";
import { ModuleManager } from "./modules/ModuleManager";
import { SessionManager } from "./session/SessionManager";

(async () => {
  if(!isMainThread) {
    FaucetWorkers.loadWorkerClass();
  }
  else {
    loadFaucetConfig()
    ServiceManager.GetService(FaucetProcess).initialize();
    ServiceManager.GetService(FaucetWorkers).initialize(__filename);
    await ServiceManager.GetService(FaucetDatabase).initialize();
    await ServiceManager.GetService(EthWalletManager).initialize();
    ServiceManager.GetService(FaucetStatsLog).initialize();
    ServiceManager.GetService(FaucetHttpServer).initialize();
    await ServiceManager.GetService(ModuleManager).initialize();
    await ServiceManager.GetService(SessionManager).initialize();
    await ServiceManager.GetService(EthClaimManager).initialize();
  }
})();



