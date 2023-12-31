import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml'
import randomBytes from 'randombytes'

import { ServiceManager } from '../common/ServiceManager.js';
import { FaucetLogLevel, FaucetProcess } from '../common/FaucetProcess.js';
import { IConfigSchema } from './ConfigSchema.js';
import { getDefaultConfig } from './DefaultConfig.js';

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


let internalBasePath = path.join(".");
let basePath: string;
if(cliArgs['datadir']) {
  basePath = cliArgs['datadir'];
  if(!path.isAbsolute(basePath))
    basePath = resolveRelativePath(basePath, process.cwd());
}
else
  basePath = process.cwd();


export let faucetConfigFile: string;
if(cliArgs['config']) {
  if(path.isAbsolute(cliArgs['config']))
    faucetConfigFile = cliArgs['config'];
  else
    faucetConfigFile = path.join(basePath, cliArgs['config']);
}
else
  faucetConfigFile = path.join(basePath, "faucet-config.yaml");

export let faucetConfig: IConfigSchema = null;

export function setAppBasePath(basePath: string) {
  internalBasePath = basePath;
}

export function loadFaucetConfig(loadDefaultsOnly?: boolean) {
  let config: IConfigSchema;
  let configFile = faucetConfigFile;

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
    console.log("Created default config at " + configFile);
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
    appBasePath: basePath,
    faucetVersion: faucetVersion,
  } as any);
}

export function resolveRelativePath(inputPath: string, customBasePath?: string): string {
  if(!inputPath || typeof inputPath !== "string" || inputPath === ":memory:")
    return inputPath;
  let outputPath: string = inputPath;
  if(!customBasePath)
    customBasePath = basePath;
  if(inputPath.match(/^~app\//))
    outputPath = path.join(internalBasePath, inputPath.replace(/^~app\//, ""));
  else if(!path.isAbsolute(inputPath))
    outputPath = path.join(customBasePath, inputPath);
  return outputPath;
}
