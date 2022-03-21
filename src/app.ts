import { EthWeb3Manager } from "./common/EthWeb3Manager";
import { PowController } from "./common/PowController";
import { FaucetHttpServer } from "./common/FaucetWebServer";
import { FaucetStore } from "./common/FaucetStore";

(() => {

  let faucetStore = new FaucetStore();
  let web3Manager = new EthWeb3Manager();
  let powController = new PowController(web3Manager, faucetStore);
  let httpServer = new FaucetHttpServer(powController);

})();

