import * as fs from 'fs';
import * as path from 'path';
import { TypedEmitter } from 'tiny-typed-emitter';
import { renderDate } from '../utils/DateUtils';
import { strPadRight } from '../utils/StringUtils';
import { faucetConfig } from './FaucetConfig';


interface PoWStatusLogEvents {
  'event': () => void;
}

export enum PoWStatusLogLevel {
  ERROR   = "ERROR",
  WARNING = "WARNING",
  INFO    = "INFO",
}

export class PoWStatusLog extends TypedEmitter<PoWStatusLogEvents> {

  public constructor() {
    super();
  }

  public emitLog(level: PoWStatusLogLevel, message: string, data?: any) {
    let logLine = renderDate(new Date(), true, true) + "  " + strPadRight(level, 7, " ") + "  " + message;

    if(faucetConfig.faucetLogFile) {
      let logFile = faucetConfig.faucetLogFile.match(/^\//) ? faucetConfig.faucetLogFile : path.join(faucetConfig.appBasePath, faucetConfig.faucetLogFile);
      fs.appendFileSync(logFile, logLine + "\r\n");
    }

    console.log(logLine);
  }

}
