import { loadFaucetConfig } from "./common/FaucetConfig";
import { EthWalletManager } from "./services/EthWalletManager";
import { EnsResolver } from "./services/EnsResolver";
import { FaucetHttpServer } from "./webserv/FaucetWebServer";
import { FaucetStoreDB } from "./services/FaucetStoreDB";
import { FaucetStore } from "./services/FaucetStore";
import { ServiceManager } from "./common/ServiceManager";
import { PoWValidator } from "./validator/PoWValidator";
import { FaucetStatsLog } from "./services/FaucetStatsLog";
import { FaucetWebApi } from "./webserv/FaucetWebApi";
import { PoWSession } from "./websock/PoWSession";
import { FaucetProcess } from "./common/FaucetProcess";
import { EthClaimManager } from "./services/EthClaimManager";

(() => {

  loadFaucetConfig()
  ServiceManager.GetService(FaucetProcess).initialize();
  ServiceManager.GetService(FaucetStoreDB).initialize();
  ServiceManager.GetService(FaucetStore).initialize();
  ServiceManager.GetService(EthWalletManager).initialize();
  ServiceManager.GetService(EthClaimManager).initialize();
  ServiceManager.GetService(EnsResolver).initialize();
  ServiceManager.InitService(PoWValidator);
  ServiceManager.InitService(FaucetStatsLog);
  ServiceManager.InitService(FaucetWebApi);
  ServiceManager.InitService(FaucetHttpServer);
  PoWSession.loadSessionData();

})();

