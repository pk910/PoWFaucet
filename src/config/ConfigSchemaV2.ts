
import { IBaseModuleConfig } from '../modules/BaseModule';
import { FaucetCoinType } from '../services/EthWalletManager';
import { IFaucetStatsConfig } from '../services/FaucetStatsLog';
import { IFaucetResultSharingConfig } from './ConfigShared';

export interface IConfigSchemaV2 {
  version?: 2;

  appBasePath: string; // base path (set automatically)
  faucetVersion: string; // faucet version (set automatically)
  staticPath: string; // path to the /static directory (set automatically)
  faucetPidFile: string; // path to file to write the process pid to

  buildSeoIndex: boolean; // build SEO optimized index.seo.html and deliver as index page (the blank loader page just looks bad when parsed by search engines)
  buildSeoMeta: {[name: string]: string}; // some additional meta tags to add to the SEO optimized page
  faucetDBFile: string;

  faucetTitle: string; // title of the faucet
  faucetImage: string; // faucet image displayed on the startpage
  faucetHomeHtml: string; // some additional html to show on the startpage
  faucetCoinSymbol: string; // symbol (short name) of the coin that can be mined
  faucetCoinType: FaucetCoinType; // coin type (native / erc20)
  faucetCoinContract: string; // erc20 coin contract (for erc20 coins)
  faucetLogFile: string; // logfile for faucet events / null for no log
  faucetLogStatsInterval: number; // print faucet stats to log interval (10min default)
  serverPort: number; // listener port
  faucetSecret: string; // random secret string that is used by the faucet to "sign" session data, so sessions can be restored automatically by clients when faucet is restarted / crashed

  ethRpcHost: string; // ETH execution layer RPC host
  ethWalletKey: string; // faucet wallet private key
  ethChainId: number | null; // ETH chain id
  ethTxGasLimit: number; // transaction gas limit (wei)
  ethLegacyTx: boolean; // use legacy (non-eip1559) transaction type
  ethTxMaxFee: number; // max transaction gas fee
  ethTxPrioFee: number; // max transaction priority fee
  ethMaxPending: number; // max number of unconfirmed transactions to create simultaneously
  ethQueueNoFunds: boolean; // queue transactions when faucet is out of funds
  ethTxExplorerLink: string; // link to eth transaction explorer with {txid} as placeholder for transaction id or null for no link

  maxDropAmount: number;
  minDropAmount: number;
  sessionTimeout: number;

  modules: {
    [moduleName: string]: IBaseModuleConfig;
  }

  spareFundsAmount: number; // minimum balance to leave in the faucet wallet
  noFundsBalance: number; // minimum balance to show the empty faucet error message
  lowFundsBalance: number; // minimum balance to show the low funds warning
  lowFundsWarning: string | boolean; // low faucet balance warning message / true to show the generic message / false to disable the warning
  noFundsError: string | boolean; // empty faucet error message / true to show the generic message / false to disable the error
  rpcConnectionError: string | boolean; // RPC unreachable error message / true to show the generic message / false to disable the error
  denyNewSessions: string | boolean; // prevent creation of new sessions (used for maintenance)

  ethRefillContract: null | { // refill from vault contract or null to disable automatic refilling
    contract: string; // vault contract address
    abi: string; // vault contract abi
    allowanceFn: string; // vault contract getAllowance function name
    allowanceFnArgs: string[]; // vault contract getAllowance function args
    withdrawFn: string; // vault contract withdraw function name
    withdrawFnArgs: string[]; // vault contract withdraw function args
    depositFn: string; // vault contract deposit function name
    depositFnArgs: string[]; // vault contract deposit function args
    withdrawGasLimit: number; // gas limit for withdraw/deposit transaction (in wei)
    checkContractBalance: boolean | string; // check balance of contract before withdrawing
    contractDustBalance: string; // don't request funds if contract balance is lower than this

    triggerBalance: string;
    overflowBalance: string;
    cooldownTime: number;
    requestAmount: string;
  };

  faucetStats: IFaucetStatsConfig | null; // faucet stats config or null to disable stats
  resultSharing: IFaucetResultSharingConfig; // result sharing settings (eg. twitter tweet)
};

