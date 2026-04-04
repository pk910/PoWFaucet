import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml'
import randomBytes from 'randombytes'

import { ServiceManager } from '../common/ServiceManager.js';
import { FaucetLogLevel, FaucetProcess } from '../common/FaucetProcess.js';
import { IConfigSchema } from './ConfigSchema.js';
import { getDefaultConfig } from './DefaultConfig.js';
import { ICaptchaConfig } from '../modules/captcha/CaptchaConfig.js';
import { IGithubConfig } from '../modules/github/GithubConfig.js';

export let cliArgs = (function() {
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


let internalBasePath = path.join(".");
export let faucetConfig: IConfigSchema = null;

export function getAppDataDir(): string {
  let datadir: string;

  if(cliArgs['datadir']) {
    datadir = cliArgs['datadir'];
    if(!path.isAbsolute(datadir))
      datadir = resolveRelativePath(datadir, process.cwd());
  }
  else
    datadir = process.cwd();

  return datadir;
}

export function setAppBasePath(basePath: string) {
  internalBasePath = basePath;
}

export function loadFaucetConfig(loadDefaultsOnly?: boolean) {
  let datadir = getAppDataDir();
  let config: IConfigSchema;
  let configFile: string;

  if(cliArgs['config']) {
    if(path.isAbsolute(cliArgs['config']))
      configFile = cliArgs['config'];
    else
      configFile = path.join(datadir, cliArgs['config']);
  }
  else
    configFile = path.join(datadir, "faucet-config.yaml");

  let faucetVersion: string;
  if(typeof POWFAUCET_VERSION !== "undefined") {
    faucetVersion = POWFAUCET_VERSION;
  } else {
    let packageJson = JSON.parse(fs.readFileSync(path.join(internalBasePath, "package.json"), 'utf8'));
    faucetVersion = packageJson.version;
  }

  if(!fs.existsSync(configFile) && !loadDefaultsOnly) {
    // create copy of faucet-config.example.yml
    let exampleConfigFile = resolveRelativePath("~app/faucet-config.example.yaml");
    if(!fs.existsSync(exampleConfigFile))
      throw exampleConfigFile + " not found";

    let exampleYamlSrc = fs.readFileSync(exampleConfigFile, "utf8");
    exampleYamlSrc = exampleYamlSrc.replace(/^ethWalletKey:.*$/m, 'ethWalletKey: "' + randomBytes(32).toString("hex") + '"');
    exampleYamlSrc = exampleYamlSrc.replace(/^faucetSecret:.*$/m, 'faucetSecret: "' + randomBytes(40).toString("hex") + '"');

    fs.writeFileSync(configFile, exampleYamlSrc);
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Created default config at " + configFile);
  }
  if(cliArgs['create-config']) {
    process.exit(0);
  }

  if(!loadDefaultsOnly) {
    let yamlSrc = fs.readFileSync(configFile, "utf8");
    let yamlObj = YAML.parse(yamlSrc);

    if(!yamlObj.version || yamlObj.version == 1) {
      throw "V1 configuration is incompatible with V2."
    }
    else {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Loaded faucet config from yaml file: " + configFile);
      config = yamlObj;
    }
  }

  if(config) {
    if(!config.faucetSecret) config.faucetSecret = randomBytes(40).toString("hex");
    if(config.staticPath) config.staticPath = resolveRelativePath(config.staticPath);
    if(config.faucetPidFile) config.faucetPidFile = resolveRelativePath(config.faucetPidFile);
    if(config.faucetLogFile) config.faucetLogFile = resolveRelativePath(config.faucetLogFile);
    if(config.faucetStats?.logfile) config.faucetStats.logfile = resolveRelativePath(config.faucetStats.logfile);
  }
  else {
    config = {} as any;
  }

  if(!faucetConfig)
    faucetConfig = {} as any;
  Object.assign(faucetConfig, getDefaultConfig(), config, {
    appBasePath: datadir,
    faucetVersion: faucetVersion,
  } as any);

  applyEnvOverrides();
}

function applyEnvOverrides() {
  // Apply environment variable overrides (used by Docker image with internal nginx)
  if(process.env.FAUCET_SERVER_PORT) {
    faucetConfig.serverPort = parseInt(process.env.FAUCET_SERVER_PORT, 10);
  }
  if(process.env.FAUCET_HTTP_PROXY_OFFSET) {
    faucetConfig.httpProxyCount += parseInt(process.env.FAUCET_HTTP_PROXY_OFFSET, 10);
  }

  const envMap: {[key: string]: (value: string) => void} = {
    POWFAUCET_SECRET: (value) => faucetConfig.faucetSecret = value,
    POWFAUCET_RPC_HOST: (value) => faucetConfig.ethRpcHost = value,
    POWFAUCET_WALLET_KEY: (value) => faucetConfig.ethWalletKey = value,
    POWFAUCET_CHAIN_ID: (value) => faucetConfig.ethChainId = parseInt(value, 10),
    POWFAUCET_TITLE: (value) => faucetConfig.faucetTitle = value,
    POWFAUCET_IMAGE: (value) => faucetConfig.faucetImage = value,
    POWFAUCET_COIN_SYMBOL: (value) => faucetConfig.faucetCoinSymbol = value,
    POWFAUCET_COIN_TYPE: (value) => faucetConfig.faucetCoinType = value as any,
    POWFAUCET_COIN_CONTRACT: (value) => faucetConfig.faucetCoinContract = value,
    POWFAUCET_TX_EXPLORER: (value) => faucetConfig.ethTxExplorerLink = value,
    POWFAUCET_CAPTCHA_SITE_KEY: (value) => {
      faucetConfig.modules = faucetConfig.modules || {};
      const captchaConfig = ((faucetConfig.modules.captcha || { enabled: false }) as ICaptchaConfig);
      captchaConfig.siteKey = value;
      faucetConfig.modules.captcha = captchaConfig;
    },
    POWFAUCET_CAPTCHA_SECRET: (value) => {
      faucetConfig.modules = faucetConfig.modules || {};
      const captchaConfig = ((faucetConfig.modules.captcha || { enabled: false }) as ICaptchaConfig);
      captchaConfig.secret = value;
      faucetConfig.modules.captcha = captchaConfig;
    },
    POWFAUCET_GITHUB_CLIENT_ID: (value) => {
      faucetConfig.modules = faucetConfig.modules || {};
      const githubConfig = ((faucetConfig.modules.github || { enabled: false }) as IGithubConfig);
      githubConfig.appClientId = value;
      faucetConfig.modules.github = githubConfig;
    },
    POWFAUCET_GITHUB_CLIENT_SECRET: (value) => {
      faucetConfig.modules = faucetConfig.modules || {};
      const githubConfig = ((faucetConfig.modules.github || { enabled: false }) as IGithubConfig);
      githubConfig.appSecret = value;
      faucetConfig.modules.github = githubConfig;
    },
    POWFAUCET_CORS_ALLOW_ORIGIN: (value) => {
      faucetConfig.corsAllowOrigin = value.split(",").map((origin) => origin.trim()).filter(Boolean);
    },
  };

  Object.keys(envMap).forEach((envKey) => {
    const value = process.env[envKey];
    if(value !== undefined && value !== "") {
      envMap[envKey](value);
    }
  });
}

export function resolveRelativePath(inputPath: string, customBasePath?: string): string {
  if(!inputPath || typeof inputPath !== "string" || inputPath === ":memory:")
    return inputPath;

  let outputPath: string = inputPath;
  if(inputPath.match(/^~app\//))
    outputPath = path.join(internalBasePath, inputPath.replace(/^~app\//, ""));
  else if(!path.isAbsolute(inputPath))
    outputPath = path.join(customBasePath || getAppDataDir(), inputPath);

  return outputPath;
}
