
import sinon from 'sinon';
import { WebSocket } from 'ws';
import { FaucetProcess } from '../src/common/FaucetProcess';
import { ServiceManager } from '../src/common/ServiceManager';
import { CaptchaVerifier } from '../src/services/CaptchaVerifier';
import { EnsResolver } from '../src/services/EnsResolver';
import { EthWalletManager } from '../src/services/EthWalletManager';
import { IPInfoResolver } from '../src/services/IPInfoResolver';
import { PassportVerifier } from '../src/services/PassportVerifier';
import { sleepPromise } from '../src/utils/SleepPromise';
import { PoWSession } from '../src/websock/PoWSession';

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