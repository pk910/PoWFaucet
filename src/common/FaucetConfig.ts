import * as fs from 'fs';
import * as path from 'path';

export interface IFaucetConfig {
  appBasePath: string;
  faucetVersion: string;
  staticPath?: string;
  faucetStore: string;

  faucetTitle: string;
  faucetImage: string;
  faucetLogFile: string;
  serverPorts: IFaucetPortConfig[];

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
  let defaultConfig: IFaucetConfig = {
    appBasePath: basePath,
    faucetVersion: packageJson.version,
    staticPath: path.join(basePath, "static"),
    faucetStore: path.join(basePath, "faucet-store.json"),

    powPingInterval: 10,
    powPingTimeout: 30,
    faucetTitle: "PoW Faucet",
    faucetImage: "https://ligi.de/assets/img/fauceth_420.jpg",
    faucetLogFile: null,
    serverPorts: [
      { port: 8080 }
    ],
    powShareReward:     25000000000000000,
    claimMinAmount:    100000000000000000,
    claimMaxAmount:  10000000000000000000,
    powSessionTimeout: 3600,
    claimSessionTimeout: 7200,
    claimAddrCooldown: 7200,
    powSessionSecret: "***insecure***",
    powScryptParams: {
      cpuAndMemory: 4096,
      blockSize: 8,
      paralellization: 1,
      keyLength: 16,
      difficulty: 9
    },
    powNonceCount: 2,
    verifyLocalPercent: 10,
    verifyLocalMaxQueue: 100,
    verifyMinerPeerCount: 2,
    verifyLocalLowPeerPercent: 100,
    verifyMinerPercent: 100,
    verifyMinerIndividuals: 2,
    verifyMinerMissPenalty: 10000000000000000,
    hcaptcha: null,
    ethRpcHost: "http://127.0.0.1:8545/",
    ethWalletKey: "fc2d0a2d823f90e0599e1e9d9202204e42a5ed388000ab565a34e7cbb566274b",
    ethChainId: 1337802,
    ethTxGasLimit: 500000,
    ethTxMaxFee: 1800000000,
    ethTxPrioFee: 800000000,
    ethMaxPending: 12
  };

  let configFlle = path.join(defaultConfig.appBasePath, "faucet-config.json");
  let configJson = fs.readFileSync(configFlle, "utf8");
  return Object.assign(defaultConfig, JSON.parse(configJson));
})();


