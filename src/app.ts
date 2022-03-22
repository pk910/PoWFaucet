import { EthWeb3Manager } from "./services/EthWeb3Manager";
import { PoWContext } from "./websock/PoWContext";
import { FaucetHttpServer } from "./webserv/FaucetWebServer";
import { FaucetStore } from "./services/FaucetStore";
import { ServiceManager } from "./common/ServiceManager";
import { PoWValidator } from "./validator/PoWValidator";

(() => {

  ServiceManager.InitService(FaucetStore);
  ServiceManager.InitService(EthWeb3Manager);
  ServiceManager.InitService(PoWValidator);

  new FaucetHttpServer();

})();

