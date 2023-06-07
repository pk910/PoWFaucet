
import { ICaptchaConfig } from '../modules/captcha/CaptchaConfig';
import { IEnsNameConfig } from '../modules/ensname/EnsNameConfig';
import { IFaucetOutflowConfig } from '../modules/faucet-outflow/FaucetOutflowConfig';
import { IIPInfoRestrictionConfig } from '../modules/ipinfo/IPInfoConfig';
import { IPassportConfig } from '../modules/passport/PassportConfig';
import { IPoWArgon2Params, IPoWCryptoNightParams, IPoWSCryptParams, PoWHashAlgo } from '../modules/pow/PoWConfig';
import { FaucetCoinType } from '../eth/EthWalletManager';
import { IFaucetStatsConfig } from '../services/FaucetStatsLog';
import { IConfigSchemaV2 } from './ConfigSchemaV2';
import { IFaucetResultSharingConfig } from './ConfigShared';

export interface IConfigSchemaV1 {
  version?: 1;

  appBasePath: string; // base path (set automatically)
  faucetVersion: string; // faucet version (set automatically)
  staticPath: string; // path to the /static directory (set automatically)
  faucetPidFile: string; // path to file to write the process pid to

  buildSeoIndex: boolean; // build SEO optimized index.seo.html and deliver as index page (the blank loader page just looks bad when parsed by search engines)
  buildSeoMeta: {[name: string]: string}; // some additional meta tags to add to the SEO optimized page
  faucetStore: string;
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

  /* PoW parameters */
  powShareReward: number; // reward amount per share (in wei)
  claimMinAmount: number; // minimum balance to payout (in wei)
  claimMaxAmount: number; // maximum balance to payout (in wei)
  powSessionTimeout: number; // maximum mining session time in seconds
  claimSessionTimeout: number; // how long sessions can be payed out in seconds (should be higher than powSessionTimeout)
  powIdleTimeout: number; // maximum number of seconds a session can idle until it gets closed
  claimAddrCooldown: number; // number of seconds to wait before allow to reuse the same address to start another mining session
  claimAddrMaxBalance: null | number; // check balance and deny mining if balance exceeds the limit
  claimAddrDenyContract: boolean; // check and prevent mining if target address is a contract
  powPingInterval: number; // websocket ping interval
  powPingTimeout: number; // kill websocket if no ping/pong for that number of seconds
  powHashAlgo: PoWHashAlgo; // hash algorithm to use ("sc" = SCrypt, "cn" = CryptoNight), defaults to SCrypt
  powScryptParams: IPoWSCryptParams; // scrypt parameters
  powCryptoNightParams: IPoWCryptoNightParams; // cryptonight parameters
  powArgon2Params: IPoWArgon2Params; // argon2 parameters
  powNonceCount: number; // number of scrypt hashs to pack into a share (should be low as that just increases verification load on server side)
  powHashrateSoftLimit: number; // maximum allowed mining hashrate (will be throttled to this rate when faster)
  powHashrateHardLimit: number; // maximum allowed mining hashrate (reject shares with nonces that exceet the limit)

  /* PoW-share verification
  Proof of Work shares need to be verified to prevent malicious users from just sending in random numbers.
  As that can lead to a huge verification work load on the server, this faucet can redistribute shares back to other miners for verification.
  These randomly selected miners need to check the share and return its validity to the server within 10 seconds or they're penalized.
  If theres a missmatch in validity-result the share is checked again locally and miners returning a bad verification result are slashed.
  Bad shares always result in a slashing (termination of session and loss of all collected mining balance)
  */
  verifyLocalPercent: number; // percentage of shares validated locally (0 - 100)
  verifyLocalMaxQueue: number; // max number of shares in local validation queue
  verifyMinerPeerCount: number; // min number of mining sessions for verification redistribution - only local verification if not enough active sessions (should be higher than verifyMinerIndividuals)
  verifyLocalLowPeerPercent: number; // percentage of shares validated locally if there are not enough sessions for verification redistribution (0 - 100)
  verifyMinerPercent: number; // percentage of shares to redistribute to miners for verification (0 - 100)
  verifyMinerIndividuals: number; // number of other mining sessions to redistribute a share to for verification
  verifyMinerMaxPending: number; // max number of pending verifications per miner before not sending any more verification requests
  verifyMinerMaxMissed: number; // max number of missed verifications before not sending any more verification requests
  verifyMinerTimeout: number; // timeout for verification requests (client gets penalized if not responding within this timespan)
  verifyMinerRewardPerc: number; // percent of powShareReward as reward for responding to a verification request in time
  verifyMinerMissPenaltyPerc: number; // percent of powShareReward as penalty for not responding to a verification request (shouldn't be too high as this can happen regularily in case of connection loss or so)

  captchas: ICaptchaConfig | null; // captcha related settings or null to disable all captchas
  concurrentSessions: number; // number of concurrent mining sessions allowed per IP (0 = unlimited)
  ipInfoApi: string; // ip info lookup api url (defaults: http://ip-api.com/json/{ip}?fields=21155839)
  ipInfoCacheTime: number; // ip info caching time
  ipInfoRequired: boolean; // require valid ip info for session start / resume / recovery
  ipRestrictedRewardShare: null | { // ip based restrictions
    hosting?: number | IIPInfoRestrictionConfig; // percentage of reward per share if IP is in a hosting range
    proxy?: number | IIPInfoRestrictionConfig; // percentage of reward per share if IP is in a proxy range
    [country: string]: number | IIPInfoRestrictionConfig; // percentage of reward per share if IP is from given country code (DE/US/...)
  };
  ipInfoMatchRestrictedReward: null | { // ip info pattern based restrictions
    [pattern: string]: number | IIPInfoRestrictionConfig; // percentage of reward per share if IP info matches regex pattern
  };
  ipInfoMatchRestrictedRewardFile: null | { // ip info pattern based restrictions from file
    file?: string; // path to file
    yaml?: string|string[]; // path to yaml file (for more actions/kill messages/etc.)
    refresh: number; // refresh interval
  };
  faucetBalanceRestrictedReward: null | { // reward restriction based on faucet wallet balance. lowest value applies
    [limit: number]: number; // limit: min balance in wei, value: percent of normal reward (eg. 50 = half rewards)
  };
  faucetBalanceRestriction: {
    enabled: boolean;
    targetBalance: number;
  };
  faucetOutflowRestriction: IFaucetOutflowConfig;

  spareFundsAmount: number; // minimum balance to leave in the faucet wallet
  noFundsBalance: number; // minimum balance to show the empty faucet error message
  lowFundsBalance: number; // minimum balance to show the low funds warning
  lowFundsWarning: string | boolean; // low faucet balance warning message / true to show the generic message / false to disable the warning
  noFundsError: string | boolean; // empty faucet error message / true to show the generic message / false to disable the error
  rpcConnectionError: string | boolean; // RPC unreachable error message / true to show the generic message / false to disable the error
  denyNewSessions: string | boolean; // prevent creation of new sessions (used for maintenance)

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

  ensResolver: IEnsNameConfig | null; // ENS resolver options or null to disable ENS names
  faucetStats: IFaucetStatsConfig | null; // faucet stats config or null to disable stats
  resultSharing: IFaucetResultSharingConfig; // result sharing settings (eg. twitter tweet)
  passportBoost: IPassportConfig | null; // passport boost options or null to disable
};

export function convertConfigV1(config: IConfigSchemaV1): IConfigSchemaV2 {
  // check renamed options for compatibility with older configs
  if(!config.faucetSecret && (config as any).powSessionSecret)
    config.faucetSecret = (config as any).powSessionSecret;
  if(!config.captchas && (config as any).hcaptcha)
    config.captchas = (config as any).hcaptcha;
  if(config.powScryptParams && typeof config.powScryptParams.parallelization !== "number")
    config.powScryptParams.parallelization = (config.powScryptParams as any).paralellization || 1;
  if(!config.verifyMinerRewardPerc && (config as any).verifyMinerReward)
    config.verifyMinerRewardPerc = Math.floor((config as any).verifyMinerReward * 10000 / config.powShareReward) / 100;
  if(!config.verifyMinerMissPenaltyPerc && (config as any).verifyMinerMissPenalty)
    config.verifyMinerMissPenaltyPerc = Math.floor((config as any).verifyMinerMissPenalty * 10000 / config.powShareReward) / 100;

  

  return null;
}