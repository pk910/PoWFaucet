import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml'
import randomBytes from 'randombytes'

export interface IFaucetConfig {
  appBasePath: string; // base path (set automatically)
  faucetVersion: string; // faucet version (set automatically)
  staticPath: string; // path to the /static directory (set automatically)
  faucetPidFile: string; // path to file to write the process pid to

  buildSeoIndex: boolean; // build SEO optimized index.seo.html and deliver as index page (the blank loader page just looks bad when parsed by search engines)
  buildSeoMeta: {[name: string]: string}; // some additional meta tags to add to the SEO optimized page
  faucetStore: string;

  faucetTitle: string; // title of the faucet
  faucetImage: string; // faucet image displayed on the startpage
  faucetHomeHtml: string; // some additional html to show on the startpage
  faucetCoinSymbol: string; // symbol (short name) of the coin that can be mined
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
  powScryptParams: { // scrypt parameters
    cpuAndMemory: number; // N - iterations count (affects memory and CPU usage, must be a power of 2)
    blockSize: number; // r - block size (affects memory and CPU usage)
    paralellization: number; // p - parallelism factor (threads to run in parallel, affects the memory, CPU usage), should be 1 as webworker is single threaded
    keyLength: number; // klen - how many bytes to generate as output, e.g. 16 bytes (128 bits)
    difficulty: number; // number of 0-bits the scrypt hash needs to start with to be egliable for a reward
  };
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
  verifyMinerReward: number; // reward for responding to a verification request in time
  verifyMinerMissPenalty: number; // penalty for not responding to a verification request (shouldn't be lower than powShareReward, but not too high as this can happen regularily in case of connection loss or so)

  captchas: IFaucetCaptchaConfig | null; // captcha related settings or null to disable all captchas
  concurrentSessions: number; // number of concurrent mining sessions allowed per IP (0 = unlimited)
  ipInfoApi: string; // ip info lookup api url (defaults: http://ip-api.com/json/{ip}?fields=21155839)
  ipRestrictedRewardShare: null | { // ip based restrictions
    hosting?: number; // percentage of reward per share if IP is in a hosting range
    proxy?: number; // percentage of reward per share if IP is in a proxy range
    [country: string]: number; // percentage of reward per share if IP is from given country code (DE/US/...)
  };
  ipInfoMatchRestrictedReward: null | { // ip info pattern based restrictions
    [pattern: string]: number; // percentage of reward per share if IP info matches regex pattern
  };
  ipInfoMatchRestrictedRewardFile: null | { // ip info pattern based restrictions from file
    file: string; // path to file
    refresh: number; // refresh interval
  };
  faucetBalanceRestrictedReward: null | { // reward restriction based on faucet wallet balance. lowest value applies
    [limit: number]: number; // limit: min balance in wei, value: percent of normal reward (eg. 50 = half rewards)
  };
  faucetBalanceRestriction: IFaucetBalanceRestrictionConfig;

  spareFundsAmount: number; // minimum balance to leave in the faucet wallet
  lowFundsBalance: number; // minimum balance to show the low funds warning
  lowFundsWarning: string | boolean; // low faucet balance warning message / true to show the generic message / false to disable the warning
  noFundsError: string | boolean; // empty faucet error message / true to show the generic message / false to disable the error
  rpcConnectionError: string | boolean; // RPC unreachable error message / true to show the generic message / false to disable the error
  denyNewSessions: string | boolean; // prevent creation of new sessions (used for maintenance)

  ethRpcHost: string; // ETH execution layer RPC host
  ethWalletKey: string; // faucet wallet private key
  ethChainId: number | null; // ETH chain id
  ethTxGasLimit: number; // transaction gas limit (wei)
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
    withdrawGasLimit: number; // gas limit for withdraw transaction (in wei)
    checkContractBalance: boolean | string; // check balance of contract before withdrawing
    contractDustBalance: number; // don't request funds if contract balance is lower than this

    triggerBalance: number;
    cooldownTime: number;
    requestAmount: number;
  };

  ensResolver: IFaucetEnsResolverConfig | null; // ENS resolver options or null to disable ENS names
  faucetStats: IFaucetStatsConfig | null; // faucet stats config or null to disable stats
  resultSharing: IFaucetResultSharingConfig; // result sharing settings (eg. twitter tweet)
}

export interface IFaucetCaptchaConfig {
  provider: "hcaptcha"|"recaptcha"|"custom";
  siteKey: string; // site key
  secret: string; // secret key
  checkSessionStart: boolean; // require captcha to start a new mining session
  checkBalanceClaim: boolean; // require captcha to claim mining rewards
}

export interface IFaucetBalanceRestrictionConfig {
  enabled: boolean;
  targetBalance: number;
}

export interface IFaucetEnsResolverConfig {
  rpcHost: string; // ETH execution layer RPC host for ENS resolver
  ensAddr: string | null; // ENS Resolver contract address or null for default resolver
}

export interface IFaucetStatsConfig {
  logfile: string;
}

export interface IFaucetResultSharingConfig {
  [provider: string]: string;
}

let cliArgs = (function() {
  let args = {};
  let arg, key;
  for(let i = 0; i < process.argv.length; i++) {
      if((arg = /^--([^=]+)(?:=(.+))?$/.exec(process.argv[i]))) {
          key = arg[1];
          args[arg[1]] = arg[2] || true;
      }
      else if(key) {
          args[key] = process.argv[i];
          key = null;
      }
  }
  return args;
})();

let packageJson = require('../../package.json');
let basePath = path.join(__dirname, "..", "..");
let configFile: string;
if(cliArgs['config']) {
  if(cliArgs['config'].match(/^\//))
    configFile = cliArgs['config'];
  else
    configFile = path.join(basePath, cliArgs['config']);
}
else
  configFile = path.join(basePath, "faucet-config.yaml");
let defaultConfig: IFaucetConfig = {
  appBasePath: basePath,
  faucetVersion: packageJson.version,
  staticPath: path.join(basePath, "static"),
  faucetPidFile: null,
  buildSeoIndex: true,
  buildSeoMeta: {
    "keywords": "powfaucet,faucet,ethereum,ethereum faucet,evm,eth,pow",
  },
  faucetStore: path.join(basePath, "faucet-store.json"),

  powPingInterval: 10,
  powPingTimeout: 30,
  faucetTitle: "PoW Faucet",
  faucetImage: "/images/fauceth_420.jpg",
  faucetHomeHtml: "",
  faucetCoinSymbol: "ETH",
  faucetLogFile: null,
  faucetLogStatsInterval: 600,
  serverPort: 8080,
  faucetSecret: null,
  powShareReward:     25000000000000000, // 0,025 ETH
  claimMinAmount:    100000000000000000, // 0,1 ETH
  claimMaxAmount:  10000000000000000000, // 10 ETH
  powSessionTimeout: 3600,
  claimSessionTimeout: 7200,
  powIdleTimeout: 1800,
  claimAddrCooldown: 7200,
  claimAddrMaxBalance: null,
  claimAddrDenyContract: false,
  powScryptParams: {
    cpuAndMemory: 4096,
    blockSize: 8,
    paralellization: 1,
    keyLength: 16,
    difficulty: 9
  },
  powNonceCount: 1,
  powHashrateSoftLimit: 0,
  powHashrateHardLimit: 0,
  verifyLocalPercent: 10,
  verifyLocalMaxQueue: 100,
  verifyMinerPeerCount: 2,
  verifyLocalLowPeerPercent: 100,
  verifyMinerPercent: 100,
  verifyMinerIndividuals: 2,
  verifyMinerMaxPending: 10,
  verifyMinerMaxMissed: 10,
  verifyMinerTimeout: 15,
  verifyMinerReward: 0,
  verifyMinerMissPenalty: 10000000000000000,
  captchas: null,
  concurrentSessions: 0,
  ipInfoApi: "http://ip-api.com/json/{ip}?fields=21155839",
  ipRestrictedRewardShare: null,
  ipInfoMatchRestrictedReward: null,
  ipInfoMatchRestrictedRewardFile: null,
  faucetBalanceRestrictedReward: null,
  faucetBalanceRestriction: null,
  spareFundsAmount:   10000000000000000, // 0,01 ETH
  lowFundsBalance: 10000000000000000000, // 10 ETH
  lowFundsWarning: true,
  noFundsError: true,
  rpcConnectionError: true,
  denyNewSessions: false,
  ethRpcHost: "http://127.0.0.1:8545/",
  ethWalletKey: "fc2d0a2d823f90e0599e1e9d9202204e42a5ed388000ab565a34e7cbb566274b",
  ethChainId: null,
  ethTxGasLimit: 21000,
  ethTxMaxFee: 1800000000,
  ethTxPrioFee: 800000000,
  ethMaxPending: 12,
  ethQueueNoFunds: false,
  ethTxExplorerLink: null,
  ethRefillContract: null,
  ensResolver: null,
  faucetStats: null,
  resultSharing: null,
};

export let faucetConfig: IFaucetConfig = null;

export function loadFaucetConfig() {
  let config: IFaucetConfig;

  if(!fs.existsSync(configFile)) {
    // create copy of faucet-config.example.yml
    let exampleConfigFile = path.join(basePath, "faucet-config.example.yaml")
    if(!fs.existsSync(exampleConfigFile))
      throw exampleConfigFile + " not found";

    let exampleYamlSrc = fs.readFileSync(exampleConfigFile, "utf8");
    exampleYamlSrc = exampleYamlSrc.replace(/^ethWalletKey:.*$/m, 'ethWalletKey: "' + randomBytes(32).toString("hex") + '"');
    exampleYamlSrc = exampleYamlSrc.replace(/^faucetSecret:.*$/m, 'faucetSecret: "' + randomBytes(40).toString("hex") + '"');

    fs.writeFileSync(configFile, exampleYamlSrc);
  }

  console.log("Loading yaml faucet config from " + configFile);
  let yamlSrc = fs.readFileSync(configFile, "utf8");
  let yamlObj = YAML.parse(yamlSrc);
  config = yamlObj;

  if(!config.faucetSecret) {
    if((config as any).powSessionSecret)
      config.faucetSecret = (config as any).powSessionSecret;
    else
      throw "faucetSecret in config must not be left empty";
  }
  if(!config.captchas && (config as any).hcaptcha)
    config.captchas = (config as any).hcaptcha;

  if(!faucetConfig)
    faucetConfig = {} as any;
  Object.assign(faucetConfig, defaultConfig, config);
}
