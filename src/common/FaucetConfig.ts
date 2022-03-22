import * as fs from 'fs';
import * as path from 'path';

export interface IFaucetConfig {
  appBasePath: string;
  faucetVersion: string;

  faucetTitle: string;
  faucetImage: string;
  faucetLogFile: string;

  serverPorts: IFaucetPortConfig[];
  staticPath?: string;
  faucetStore: string;

  powShareReward: number;
  claimMinAmount: number;
  claimMaxAmount: number;
  powSessionTimeout: number;
  claimSessionTimeout: number;
  claimAddrCooldown: number;
  powSessionSecret: string;
  powPingInterval: number;
  powPingTimeout: number;
  powScryptParams: {
    cpuAndMemory: number;
    blockSize: number;
    paralellization: number;
    keyLength: number;
    difficulty: number;
  };
  powNonceCount: number;

  verifyLocalPercent: number;
  verifyLocalMaxQueue: number;
  verifyMinerPeerCount: number;
  verifyLocalLowPeerPercent: number;
  verifyMinerPercent: number;
  verifyMinerIndividuals: number;
  verifyMinerMissPenalty: number;

  hcaptcha: IFaucetHCaptchaConfig | null;

  ethRpcHost: string;
  ethWalletKey: string;
  ethChainId: number;
  ethTxGasLimit: number;
  ethTxMaxFee: number;
  ethTxPrioFee: number;
  ethMaxPending: number;
}

export interface IFaucetPortConfig {
  port: number;
}

export interface IFaucetHCaptchaConfig {
  siteKey: string;
  secret: string;
  checkSessionStart: boolean;
  checkBalanceClaim: boolean;
}

export let faucetConfig: IFaucetConfig = (() => {
  var packageJson = require('../../package.json');
  var basePath = path.join(__dirname, "..", "..");
  let baseConfig = {
    appBasePath: basePath,
    faucetVersion: packageJson.version,

    staticPath: path.join(basePath, "static"),
    faucetStore: path.join(basePath, "faucet-store.json"),
    powPingInterval: 10,
    powPingTimeout: 30,
  };

  let configFlle = path.join(baseConfig.appBasePath, "faucet-config.json");
  let configJson = fs.readFileSync(configFlle, "utf8");
  return Object.assign(baseConfig, JSON.parse(configJson));
})();


