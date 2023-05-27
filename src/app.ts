import { loadFaucetConfig } from "./common/FaucetConfig";
import { EthWeb3Manager } from "./services/EthWeb3Manager";
import { EnsWeb3Manager } from "./services/EnsWeb3Manager";
import { FaucetHttpServer } from "./webserv/FaucetWebServer";
import { FaucetStoreDB } from "./services/FaucetStoreDB";
import { FaucetStore } from "./services/FaucetStore";
import { ServiceManager } from "./common/ServiceManager";
import { PoWValidator } from "./validator/PoWValidator";
import { FaucetStatsLog } from "./services/FaucetStatsLog";
import { FaucetWebApi } from "./webserv/FaucetWebApi";
import { PoWSession } from "./websock/PoWSession";
import { FaucetProcess } from "./common/FaucetProcess";

(() => {

  loadFaucetConfig()
  ServiceManager.InitService(FaucetProcess).initialize();
  ServiceManager.InitService(FaucetStoreDB).initialize();
  ServiceManager.InitService(FaucetStore).initialize();
  ServiceManager.InitService(EthWeb3Manager).initialize();
  ServiceManager.InitService(EnsWeb3Manager).initialize();
  ServiceManager.InitService(PoWValidator);
  ServiceManager.InitService(FaucetStatsLog);
  ServiceManager.InitService(FaucetWebApi);
  ServiceManager.InitService(FaucetHttpServer);
  PoWSession.loadSessionData();

})();

