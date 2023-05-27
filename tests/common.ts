
import sinon from 'sinon';
import { WebSocket } from 'ws';
import { FaucetProcess } from '../src/common/FaucetProcess';
import { CaptchaVerifier } from '../src/services/CaptchaVerifier';
import { EnsWeb3Manager } from '../src/services/EnsWeb3Manager';
import { EthWeb3Manager } from '../src/services/EthWeb3Manager';
import { IPInfoResolver } from '../src/services/IPInfoResolver';
import { PassportVerifier } from '../src/services/PassportVerifier';

export function bindTestStubs(stubs?) {
  if(!stubs)
    stubs = {};
  return {
    "WebSocket.send": sinon.stub(WebSocket.prototype, "send"),
    "WebSocket.close": sinon.stub(WebSocket.prototype, "close"),
    "WebSocket.ping": sinon.stub(WebSocket.prototype, "ping"),

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
    "EnsWeb3Manager.verifyToken": sinon.stub(EnsWeb3Manager.prototype, "resolveEnsName").resolves(null),
    "EthWeb3Manager.getWalletBalance": sinon.stub(EthWeb3Manager.prototype, "getWalletBalance").resolves(BigInt(0)),
    "EthWeb3Manager.checkIsContract": sinon.stub(EthWeb3Manager.prototype, "checkIsContract").resolves(false),
    ...stubs,
  }
}

export function unbindTestStubs() {
  sinon.restore();
}

export class FakeWebSocket extends WebSocket {
  constructor() {
    super(null);
  }
  public override send() {}
  public override ping() {}
  public override close() {}
}