import { FaucetDbDriver } from "../db/FaucetDatabase.js";
import { FaucetCoinType } from "../eth/EthWalletManager.js";
import { IConfigSchema } from "./ConfigSchema.js";
import { resolveRelativePath } from "./FaucetConfig.js";

export function getDefaultConfig(): IConfigSchema {
  return {
    version: 2,

    appBasePath: null,
    faucetVersion: "",
    staticPath: resolveRelativePath("~app/static"),
    faucetPidFile: null, // path to file to write the process pid to

    database: {
      driver: FaucetDbDriver.SQLITE,
      file: resolveRelativePath("faucet-store.db"),
    },

    faucetCoinSymbol: "ETH",
    faucetCoinType: FaucetCoinType.NATIVE,
    faucetCoinContract: null,
    faucetLogFile: null,
    faucetLogStatsInterval: 600,
    serverPort: 8080,
    httpProxyCount: 0,
    faucetSecret: null, // mandatory

    ethRpcHost: null, // mandatory
    ethWalletKey: null, // mandatory
    ethWalletAddr: null,
    ethChainId: null,
    ethTxGasLimit: 100000,
    ethTxMaxFee: 100000000000,
    ethTxPrioFee: 2000000000,
    ethMaxPending: 20,
    ethQueueNoFunds: false,
    ethTxExplorerLink: null,

    maxDropAmount: 1000000000000000000, // 1 ETH
    minDropAmount: 10000000000000000, // 0.01 ETH
    sessionTimeout: 86400,
    sessionCleanup: 2592000,
    sessionSaveTime: 120,

    modules: {},

    spareFundsAmount: 10000000000000000, // 0.01 ETH
    noFundsBalance: 100000000000000000, // 0.1 ETH
    lowFundsBalance: 10000000000000000000, // 10 ETH
    lowFundsWarning: true,
    noFundsError: true,
    rpcConnectionError: true,
    denyNewSessions: false,
    ethRefillContract: null,
    faucetStats: null,
    faucetStatus: {
      json: "faucet-status.json",
      yaml: "faucet-status.yaml",
    },

    gitcoinApiToken: null,
    gitcoinScorerId: null,
    gitcoinMinimumScore: 3,
  };
}
