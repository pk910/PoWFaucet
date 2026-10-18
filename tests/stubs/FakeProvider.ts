/**
 * A JSON-RPC stub in the shape of a web3-era provider: a full envelope in, an envelope out.
 * EthRpcClient.rawRequest unwraps the envelope, so this plugs in wherever a URL would
 * (`ethRpcHost`, a module's `rpcHost`). Responses are injected per method, either as a value or
 * as a function of the request payload; a function may throw to produce a JSON-RPC error, or
 * return `{ _throw: err }` to make the provider itself fail (a transport error).
 */
export class FakeProvider {

  private idCounter = 1;
  private responseDict: {
    [method: string]: any
  } = {};
  private requestDict: {
    [method: string]: any[]
  } = {};


  public injectResponse(method: string, response: any) {
    this.responseDict[method] = response;
  }

  private getLastRequest(method: string): any {
    let methodCalls;
    if(!(methodCalls = this.requestDict[method]))
      return null;
    return methodCalls[methodCalls.length - 1];
  }

  private getResponses(payloads) {
    return payloads.map((payload) => this.getResponse(payload));
  }

  private getResponse(payload) {
    if(!this.requestDict[payload.method])
      this.requestDict[payload.method] = [ payload ];
    else
      this.requestDict[payload.method].push(payload);
    //console.log("payload", JSON.stringify(payload, null, 2));
    let rsp = this.responseDict[payload.method];
    if(!rsp) {
      console.log("no mock for request: ", payload);
    }
    let rspStub;
    try {
      if(typeof rsp === "function")
        rsp = rsp(payload);
      rspStub = {
        jsonrpc: '2.0',
        id: payload.id || this.idCounter++,
        result: rsp
      };
      if(rsp && (rsp._return || rsp._throw)) {
        rspStub = rsp;
      }
    } catch(ex) {
      rspStub = {
        jsonrpc: '2.0',
        id: payload.id || this.idCounter++,
        error: {
          code: 1234,
          message: 'Stub error: ' + ex?.toString()
        }
      };
    }
    if(rspStub && rspStub._throw) {
      throw rspStub._throw;
    }
    return rspStub;
  }

  public getStatus(): string {
    throw new Error("not implemented");
  }

  public supportsSubscriptions() {
    return false;
  }

  public async request(payload: any): Promise<any> {
    //console.log("stub.request", payload)
    let response;
    if(Array.isArray(payload))
      response = this.getResponses(payload);
    else
      response = this.getResponse(payload);

    return response;
  }

  public on() {
    throw new Error("not implemented");
  }

  public removeListener() {
    throw new Error("not implemented");
  }

  public once() {
    throw new Error("not implemented");
  }

  public removeAllListeners() {
    throw new Error("not implemented");
  }

  public connect() {
    throw new Error("not implemented");
  }

  public disconnect() {
    throw new Error("not implemented");
  }

  public reset() {
    throw new Error("not implemented");
  }

  public reconnect() {
    throw new Error("not implemented");
  }
}
