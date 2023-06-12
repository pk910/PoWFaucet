import { BaseDriver, BindValues, QueryResult, RunResult } from "./BaseDriver";
import { Worker } from "worker_threads";
import { PromiseDfd } from "../../utils/PromiseDfd";

export interface IWorkerOptions {
  port: Worker;
}

export class WorkerDriver extends BaseDriver<IWorkerOptions> {
  private port: Worker;
  private reqDict: {[idx: number]: PromiseDfd<any>} = {};
  private reqIdx = 1;
  private readyDfd: PromiseDfd<void>;

  public constructor(port: Worker) {
    super();
    this.port = port;
    this.readyDfd = new PromiseDfd<void>();
    this.port.on("message", (msg) => this.onWorkerMessage(msg));
  }

  private sendRequest<TRes>(cmd: string, args: any[]): Promise<TRes> {
    return this.readyDfd.promise.then(() => {
      let reqIdx = this.reqIdx++;
      let resDfd = this.reqDict[reqIdx] = new PromiseDfd<TRes>();
      this.port.postMessage({
        req: reqIdx,
        cmd: cmd,
        args: args,
      });
      return resDfd.promise;
    });
  }

  private onWorkerMessage(msg: any) {
    if(msg.cmd === "init") {
      this.readyDfd.resolve();
      return;
    }
    if(!msg.req)
      return;
    let reqDfd = this.reqDict[msg.req];
    if(!reqDfd)
      return;
    delete this.reqDict[msg.req];
    if(msg.hasOwnProperty("result"))
      reqDfd.resolve(msg.result);
    else
      reqDfd.reject(msg.error);
  }

  public override async open(options: IWorkerOptions): Promise<void> {
    return this.sendRequest("open", [options]);
  }

  public override async close(): Promise<void> {
    return this.sendRequest("close", []);
  }

  public override async exec(sql: string): Promise<void> {
    return this.sendRequest("exec", [sql]);
  }

  public override async run(sql: string, values?: BindValues): Promise<RunResult> {
    return this.sendRequest("run", [sql, values]);
  }
  
  public override async all(sql: string, values?: BindValues): Promise<QueryResult[]> {
    return this.sendRequest("all", [sql, values]);
  }

  public override async get(sql: string, values?: BindValues): Promise<QueryResult | null> {
    return this.sendRequest("get", [sql, values]);
  }

}
