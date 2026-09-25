import path, { dirname, basename } from "path";
import { fileURLToPath } from "url";
import { isMainThread, workerData } from "node:worker_threads";
import { faucetConfig, loadFaucetConfig, setAppBasePath } from "./config/FaucetConfig.js";
import { FaucetWorkers } from "./common/FaucetWorker.js";
import { EthWalletManager } from "./eth/EthWalletManager.js";
import { FaucetHttpServer } from "./webserv/FaucetHttpServer.js";
import { FaucetDatabase } from "./db/FaucetDatabase.js";
import { ServiceManager } from "./common/ServiceManager.js";
import { FaucetStatsLog } from "./services/FaucetStatsLog.js";
import { FaucetLogLevel, FaucetProcess } from "./common/FaucetProcess.js";
import { EthClaimManager } from "./eth/EthClaimManager.js";
import { ModuleLoader } from "./loader/ModuleLoader.js";
import { ModuleManager } from "./modules/ModuleManager.js";
import { SessionManager } from "./session/SessionManager.js";
import { FaucetStatus } from "./services/FaucetStatus.js";
import { createVoucher } from "./tools/createVoucher.js";
import { checkModules } from "./tools/checkModules.js";

(async () => {
  let srcfile: string;
  if(typeof require !== "undefined") {
    srcfile = require.main.filename;
  } else {
    srcfile = fileURLToPath(import.meta.url);
  }
  let basepath = path.join(dirname(srcfile), "..");

  setAppBasePath(basepath);
  ServiceManager.GetService(FaucetWorkers).initialize(srcfile);

  if(!isMainThread) {
    await FaucetWorkers.loadWorkerClass();
    return;
  }
  
  if(process.argv.length >= 3) {
    switch(process.argv[2]) {
      case "worker":
        // argv 4 and 5 are a module worker's backend and export: this process loads no modules, so
        // they are the only way it can find a class that is not compiled in
        await FaucetWorkers.loadWorkerClass(process.argv[3], undefined,
          process.argv[4] && process.argv[5]
            ? { backend: process.argv[4], export: process.argv[5] }
            : undefined);
        return;
      case "create-voucher":
        createVoucher();
        return;
      case "check-modules":
        await checkModules(process.argv.slice(3));
        return;
    }
  }
  
  try {
    loadFaucetConfig();
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Initializing PoWFaucet v" + faucetConfig.faucetVersion + " (AppBasePath: " + faucetConfig.appBasePath + ", InternalBasePath: " + basepath + ")");
    ServiceManager.GetService(FaucetProcess).initialize();
    ServiceManager.GetService(FaucetStatus).initialize();
    ServiceManager.GetService(FaucetStatsLog).initialize();
    await ServiceManager.GetService(FaucetDatabase).initialize();
    await ServiceManager.GetService(EthWalletManager).initialize();
    // before the modules: a module registers module and worker classes, and
    // ModuleManager builds from the registry
    await ServiceManager.GetService(ModuleLoader).loadAll(
      faucetConfig.appBasePath, faucetConfig.modulePaths);
    await ServiceManager.GetService(ModuleManager).initialize();
    await ServiceManager.GetService(SessionManager).initialize();
    await ServiceManager.GetService(EthClaimManager).initialize();
    ServiceManager.GetService(FaucetHttpServer).initialize();

    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Faucet initialization complete.");
  } catch(ex) {
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Faucet initialization failed: " + ex.toString() + " " + ex.stack);
    process.exit(0);
  }
})();
