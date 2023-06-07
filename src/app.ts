import { loadFaucetConfig } from "./config/FaucetConfig";
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

  loadFaucetConfig()
  ServiceManager.GetService(FaucetProcess).initialize();
  ServiceManager.GetService(FaucetDatabase).initialize();
  ServiceManager.GetService(EthWalletManager).initialize();
  ServiceManager.GetService(FaucetStatsLog).initialize();
  ServiceManager.GetService(FaucetHttpServer).initialize();
  ServiceManager.GetService(ModuleManager).initialize();
  await ServiceManager.GetService(SessionManager).initialize();
  ServiceManager.GetService(EthClaimManager).initialize();

})();

