import { MessagePort } from "worker_threads";
import assert from 'node:assert';
import { BaseDriver } from "./driver/BaseDriver";
import { FaucetDatabaseOptions } from "./FaucetDatabase";
import { SQLiteDriver } from "./driver/SQLiteDriver";

export class DatabaseWorker {
  private port: MessagePort;
  private driver: BaseDriver;

  public constructor(port: MessagePort) {
    this.port = port;
    this.port.on("message", (evt) => this.onControlMessage(evt));
    this.port.postMessage({ cmd: "init" });
  }

  private async onControlMessage(msg: any) {
    assert.equal(msg && (typeof msg === "object"), true);

    //console.log(evt);
    
    let result: any = {
      req: msg.req,
    };
    try {
      switch(msg.cmd) {
        case "open":
          result.result = await this.onCtrlOpen(msg.args);
          break;
        case "close":
          result.result = await this.driver.close();
          break;
        case "exec":
          result.result = await this.driver.exec(msg.args[0]);
          break;
        case "run":
          result.result = await this.driver.run(msg.args[0], msg.args[1]);
          break;
        case "all":
          result.result = await this.driver.all(msg.args[0], msg.args[1]);
          break;
        case "get":
          result.result = await this.driver.get(msg.args[0], msg.args[1]);
          break;
        
      }
    }
    catch(ex) {
      result.error = ex;
    }
    this.port.postMessage(result);
  }

  private async onCtrlOpen(args: any[]) {
    let driverOpts: FaucetDatabaseOptions = args[0];
    switch(driverOpts.driver) {
      case "sqlite":
        this.driver = new SQLiteDriver();
        await this.driver.open(driverOpts);
        break;
      default:
        throw "unknown database driver: " + driverOpts.driver;
    }
  }

}
