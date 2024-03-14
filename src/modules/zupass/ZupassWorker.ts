import assert from 'node:assert';
import { MessagePort } from "worker_threads";

// @ts-ignore
import vkey from "./circuit.json" with { type: "json" };
import { IZupassVerifyRequest } from './ZupassPCD';

export class ZupassWorker {
  private port: MessagePort;
  private groth16: any;
  
  public constructor(port: MessagePort) {
    this.port = port;
    this.port.on("message", (evt) => this.onControlMessage(evt));

    this.initLibrary().then(() => {
      this.port.postMessage({ action: "init" });
    }, (err) => {
      this.port.postMessage({ action: "error" });
    });
  }

  private async initLibrary(): Promise<void> {
    let module = await import("../../../libs/groth16.cjs");
    if(module.default) {
      module = module.default;
    }
    await module.init();
    this.groth16 = module.groth16;
  }
  
  private onControlMessage(msg: any) {
    assert.equal(msg && (typeof msg === "object"), true);

    //console.log(evt);
    
    switch(msg.action) {
      case "verify":
        this.onCtrlVerify(msg.data);
        break;
    }
  }

  private async onCtrlVerify(req: IZupassVerifyRequest) {
    return this.groth16.verify(vkey, { 
      publicSignals: req.publicSignals, 
      proof: req.proof
    }).catch((ex) => {
      console.error(ex);
      return false
    }).then((res) => {
      this.port.postMessage({
        action: "verified", 
        data: {
          reqId: req.reqId,
          isValid: res
        }
      });
    });
  }

}
