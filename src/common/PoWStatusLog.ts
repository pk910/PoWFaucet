import * as fs from 'fs';
import * as path from 'path';
import { TypedEmitter } from 'tiny-typed-emitter';
import { FaucetStore } from '../services/FaucetStore';
import { renderDate } from '../utils/DateUtils';
import { strPadRight } from '../utils/StringUtils';
import { faucetConfig, loadFaucetConfig } from './FaucetConfig';
import { ServiceManager } from './ServiceManager';


interface PoWStatusLogEvents {
  'event': () => void;
  'reload': () => void;
}

export enum PoWStatusLogLevel {
  ERROR   = "ERROR",
  WARNING = "WARNING",
  INFO    = "INFO",
  HIDDEN  = "HIDDEN",
}

export class PoWStatusLog extends TypedEmitter<PoWStatusLogEvents> {

  public constructor() {
    super();

    if(faucetConfig.faucetPidFile) {
      fs.writeFileSync(faucetConfig.faucetPidFile, process.pid.toString());
    }

    process.on('uncaughtException', (err, origin) => {
      this.emitLog(PoWStatusLogLevel.ERROR, `### Caught unhandled exception: ${err}\r\n` + `  Exception origin: ${origin}\r\n` + `  Stack Trace: ${err.stack}\r\n`);
      this.shutdown(1);
    });
    process.on('unhandledRejection', (reason: any, promise) => {
      let stack;
      try {
        throw new Error();
      } catch(ex) {
        stack = ex.stack;
      }
      this.emitLog(PoWStatusLogLevel.ERROR, `### Caught unhandled rejection: ${reason}\r\n` + `  Stack Trace: ${reason && reason.stack ? reason.stack : stack}\r\n`);
    });
    process.on('SIGUSR1', () => {
      this.emitLog(PoWStatusLogLevel.INFO, `# Received SIGURS1 signal - reloading faucet config`);
      loadFaucetConfig();
      this.emit("reload");
    });
    process.on('SIGINT', () => {
      // CTRL+C
      this.emitLog(PoWStatusLogLevel.INFO, `# Received SIGINT signal - shutdown faucet`);
      this.shutdown(0);
    });
    process.on('SIGQUIT', () => {
      // Keyboard quit
      this.emitLog(PoWStatusLogLevel.INFO, `# Received SIGQUIT signal - shutdown faucet`);
      this.shutdown(0);
    });
    process.on('SIGTERM', () => {
      // `kill` command
      this.emitLog(PoWStatusLogLevel.INFO, `# Received SIGTERM signal - shutdown faucet`);
      this.shutdown(0);
    });
  }

  private shutdown(code: number) {
    try {
      ServiceManager.GetService(FaucetStore).saveStore(true);
    } catch(ex) {}
    process.exit(code);
  }

  public emitLog(level: PoWStatusLogLevel, message: string, data?: any) {
    if(level === PoWStatusLogLevel.HIDDEN)
      return;
    
    let logLine = renderDate(new Date(), true, true) + "  " + strPadRight(level, 7, " ") + "  " + message;

    if(faucetConfig.faucetLogFile) {
      let logFile = faucetConfig.faucetLogFile.match(/^\//) ? faucetConfig.faucetLogFile : path.join(faucetConfig.appBasePath, faucetConfig.faucetLogFile);
      fs.appendFileSync(logFile, logLine + "\r\n");
    }

    console.log(logLine);
  }

}
