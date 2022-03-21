import { TypedEmitter } from 'tiny-typed-emitter';


interface PoWStatusLogEvents {
  'event': () => void;
}

export enum PoWStatusLogLevel {
  ERROR = "ERROR",
  WARNING = "WARNING",
  INFO = "INFO",
}

export class PoWStatusLog extends TypedEmitter<PoWStatusLogEvents> {
  private static _instance: PoWStatusLog;

  public static get(): PoWStatusLog {
    if(!this._instance)
      this._instance = new PoWStatusLog();
    return this._instance;
  }

  private constructor() {
    super();
  }

  public emitLog(level: PoWStatusLogLevel, message: string, data?: any) {
    
  }

}
