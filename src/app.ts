import { loadFaucetConfig } from "./common/FaucetConfig";
import { EthWeb3Manager } from "./services/EthWeb3Manager";
import { EnsWeb3Manager } from "./services/EnsWeb3Manager";
import { FaucetHttpServer } from "./webserv/FaucetWebServer";
import { FaucetStore } from "./services/FaucetStore";
import { ServiceManager } from "./common/ServiceManager";
import { PoWValidator } from "./validator/PoWValidator";
import { FaucetStatsLog } from "./services/FaucetStatsLog";
import { FaucetWebApi } from "./webserv/FaucetWebApi";

(() => {

  loadFaucetConfig()
  ServiceManager.InitService(FaucetStore);
  ServiceManager.InitService(EthWeb3Manager);
  ServiceManager.InitService(EnsWeb3Manager);
  ServiceManager.InitService(PoWValidator);
  ServiceManager.InitService(FaucetStatsLog);
  ServiceManager.InitService(FaucetWebApi);
  ServiceManager.InitService(FaucetHttpServer);

})();

