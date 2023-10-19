import { FaucetDbDriver } from "../db/FaucetDatabase";
import { FaucetCoinType } from "../eth/EthWalletManager";
import { IConfigSchema } from "./ConfigSchema";
import { resolveRelativePath } from "./FaucetConfig";

export function getDefaultConfig(): IConfigSchema {
  return {
    version: 2,

    appBasePath: null,
    faucetVersion: "",
    staticPath: resolveRelativePath("~app/static"),
    faucetPidFile: null, // path to file to write the process pid to

    buildSeoIndex: true,
    buildSeoMeta: {},
    database: {
      driver: FaucetDbDriver.SQLITE,
      file: resolveRelativePath("faucet-store.db"),
    },

    faucetTitle: "Test Faucet",
    faucetImage: "/images/fauceth_420.jpg",
    faucetHomeHtml: "",
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
    ethChainId: null,
    ethTxGasLimit: 100000,
    ethLegacyTx: false,
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
    },
    resultSharing: {
      preHtml: '<div class="sh-opt">Do you like the faucet? Give that project a <iframe src="https://ghbtns.com/github-btn.html?user=pk910&repo=PoWFaucet&type=star&count=true" frameborder="0" scrolling="0" width="150" height="20" title="GitHub"></iframe></div>',
      postHtml: '',
      caption: null,
    },
  };
}

