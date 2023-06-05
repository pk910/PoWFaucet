
import sinon from 'sinon';
import { WebSocket, RawData } from 'ws';
import { TypedEmitter } from 'tiny-typed-emitter';
import { FaucetProcess } from '../src/common/FaucetProcess';
import { ServiceManager } from '../src/common/ServiceManager';
import { CaptchaVerifier } from '../src/protection/captcha/CaptchaVerifier';
import { EnsResolver } from '../src/services/EnsResolver';
import { EthWalletManager } from '../src/services/EthWalletManager';
import { IPInfoResolver } from '../src/protection/ipinfo/IPInfoResolver';
import { PassportVerifier } from '../src/protection/passport/PassportVerifier';
import { sleepPromise } from '../src/utils/SleepPromise';
import { PoWSession } from '../src/protection/pow/PoWSession';
import { PoWClient } from '../src/protection/pow/PoWClient';

let fakeWebSockets: FakeWebSocket[] = [];

export function bindTestStubs(stubs?) {
  if(!stubs)
    stubs = {};
  return {
    "FakeWebSocket.send": sinon.stub(FakeWebSocket.prototype, "send"),
    "FakeWebSocket.close": sinon.stub(FakeWebSocket.prototype, "close"),
    "FakeWebSocket.ping": sinon.stub(FakeWebSocket.prototype, "ping"),
    "FakeWebSocket.pong": sinon.stub(FakeWebSocket.prototype, "pong"),

    "FaucetProcess.emitLog": sinon.stub(FaucetProcess.prototype, "emitLog"),
    "IPInfoResolver.getIpInfo": sinon.stub(IPInfoResolver.prototype, "getIpInfo").resolves({
      status: "success", country: "United States", countryCode: "US",
      region: "Virginia", regionCode: "VA", city: "Ashburn", cityCode: "Ashburn",
      locLat: 39.03, locLon: -77.5, zone: "America/New_York",
      isp: "Google LLC", org: "Google Public DNS", as: "AS15169 Google LLC",
      proxy: false, hosting: true,
    }),
    "PassportVerifier.getPassport": sinon.stub(PassportVerifier.prototype, "getPassport").resolves({
      found: false,
      parsed: Math.floor((new Date()).getTime()/1000),
      newest: 0,
    }),
    "CaptchaVerifier.verifyToken": sinon.stub(CaptchaVerifier.prototype, "verifyToken").resolves(true),
    "EnsResolver.resolveEnsName": sinon.stub(EnsResolver.prototype, "resolveEnsName").resolves(null),
    "EthWalletManager.getWalletBalance": sinon.stub(EthWalletManager.prototype, "getWalletBalance").resolves(BigInt(0)),
    "EthWalletManager.checkIsContract": sinon.stub(EthWalletManager.prototype, "checkIsContract").resolves(false),
    "EthWalletManager.getFaucetBalance": sinon.stub(EthWalletManager.prototype, "getFaucetBalance").returns(BigInt(0)),
    ...stubs,
  }
}

export async function unbindTestStubs() {
  fakeWebSockets.forEach((fakeWebSocket) => {
    fakeWebSocket.emit("close");
  });
  fakeWebSockets = [];
  PoWSession.resetSessionData();
  ServiceManager.ClearAllServices();
  sinon.restore();
}

export async function awaitSleepPromise(timeout: number, poll: () => boolean) {
  let start = new Date().getTime();
  while(true) {
    let now = new Date().getTime();
    if(now - start >= timeout)
      return;
    if(poll())
      return;
    await sleepPromise(10);
  }
}

export class FakeWebSocket extends WebSocket {
  constructor() {
    super(null);
    fakeWebSockets.push(this);
  }
}

export class FakePoWClient extends PoWClient {
  private sentMessages: {
    action: string;
    data: any;
    rsp: any;
  }[] = [];

  public emitClientMessage(data: RawData) {
    return this.onClientMessage(data, false);
  }

  public override sendMessage(action: string, data?: any, rsp?: any) {
    this.sentMessages.push({
      action: action,
      data: data,
      rsp: rsp
    });
  }

  public getSentMessage(action: string): any {
    for(let i = 0; i < this.sentMessages.length; i++) {
      if(this.sentMessages[i].action === action)
        return this.sentMessages[i];
    }
  }

  public clearSentMessages() {
    this.sentMessages = [];
  }
}

export class FakeProvider extends TypedEmitter {
  private idCounter = 1;
  private responseDict: {
    [method: string]: any
  } = {};

  public injectResponse(method: string, response: any) {
    this.responseDict[method] = response;
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