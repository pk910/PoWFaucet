import { TypedEmitter } from 'tiny-typed-emitter';

export class FakeProvider extends TypedEmitter {
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

  public send(payload) {
    let response;
    if(Array.isArray(payload))
      response = this.getResponses(payload);
    else
      response = this.getResponse(payload);
    
    return response;
  }

  public sendAsync(payload, callback) {
    let response;
    if(Array.isArray(payload))
      response = this.getResponses(payload);
    else
      response = this.getResponse(payload);
    
    setTimeout(function(){
      callback(null, response);
    }, 1);
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
    return rspStub;
  }
}
