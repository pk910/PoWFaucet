import * as fs from 'fs';
import * as path from 'path';
import { TypedEmitter } from 'tiny-typed-emitter';
import { EthWeb3Manager } from '../services/EthWeb3Manager';
import { FaucetStore } from '../services/FaucetStore';
import { FaucetStoreDB } from '../services/FaucetStoreDB';
import { PoWOutflowLimiter } from '../services/PoWOutflowLimiter';
import { renderDate } from '../utils/DateUtils';
import { strPadRight } from '../utils/StringUtils';
import { PoWSession } from '../websock/PoWSession';
import { faucetConfig, loadFaucetConfig, resolveRelativePath } from './FaucetConfig';
import { ServiceManager } from './ServiceManager';


interface FaucetProcessEvents {
  'event': () => void;
  'reload': () => void;
}

export enum FaucetLogLevel {
  ERROR   = "ERROR",
  WARNING = "WARNING",
  INFO    = "INFO",
  HIDDEN  = "HIDDEN",
}

export class FaucetProcess extends TypedEmitter<FaucetProcessEvents> {

  public constructor() {
    super();

    if(faucetConfig.faucetPidFile) {
      fs.writeFileSync(faucetConfig.faucetPidFile, process.pid.toString());
    }

    process.on('uncaughtException', (err, origin) => {
      this.emitLog(FaucetLogLevel.ERROR, `### Caught unhandled exception: ${err}\r\n` + `  Exception origin: ${origin}\r\n` + `  Stack Trace: ${err.stack}\r\n`);
      this.shutdown(1);
    });
    process.on('unhandledRejection', (reason: any, promise) => {
      let stack;
      try {
        throw new Error();
      } catch(ex) {
        stack = ex.stack;
      }
      this.emitLog(FaucetLogLevel.ERROR, `### Caught unhandled rejection: ${reason}\r\n` + `  Stack Trace: ${reason && reason.stack ? reason.stack : stack}\r\n`);
    });
    process.on('SIGUSR1', () => {
      this.emitLog(FaucetLogLevel.INFO, `# Received SIGURS1 signal - reloading faucet config`);
      loadFaucetConfig();
      this.emit("reload");
    });
    process.on('SIGINT', () => {
      // CTRL+C
      this.emitLog(FaucetLogLevel.INFO, `# Received SIGINT signal - shutdown faucet`);
      this.shutdown(0);
    });
    process.on('SIGQUIT', () => {
      // Keyboard quit
      this.emitLog(FaucetLogLevel.INFO, `# Received SIGQUIT signal - shutdown faucet`);
      this.shutdown(0);
    });
    process.on('SIGTERM', () => {
      // `kill` command
      this.emitLog(FaucetLogLevel.INFO, `# Received SIGTERM signal - shutdown faucet`);
      this.shutdown(0);
    });
  }

  private shutdown(code: number) {
    try {
      PoWSession.saveSessionData();
      ServiceManager.GetService(PoWOutflowLimiter).saveOutflowState();
      ServiceManager.GetService(FaucetStoreDB).closeDatabase();
      ServiceManager.GetService(FaucetStore).saveRecoveryStore();
    } catch(ex) {}
    process.exit(code);
  }

  public emitLog(level: FaucetLogLevel, message: string, data?: any) {
    if(level === FaucetLogLevel.HIDDEN)
      return;
    
    let logLine = renderDate(new Date(), true, true) + "  " + strPadRight(level, 7, " ") + "  " + message;

    if(faucetConfig.faucetLogFile) {
      let logFile = resolveRelativePath(faucetConfig.faucetLogFile);
      fs.appendFileSync(logFile, logLine + "\r\n");
    }

    console.log(logLine);
  }

}
