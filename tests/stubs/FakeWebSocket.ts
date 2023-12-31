import { WebSocket, RawData } from 'ws';
import { IncomingMessage } from 'http';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetHttpServer } from '../../src/webserv/FaucetHttpServer.js';

export let fakeWebSockets: FakeWebSocket[] = [];

export function disposeFakeWebSockets() {
  fakeWebSockets.forEach((fakeWs) => fakeWs.dispose());
}

export async function injectFakeWebSocket(url: string, ip: string): Promise<FakeWebSocket> {
  let fakeWs = new FakeWebSocket();
  let faucetHttpServer: any = ServiceManager.GetService(FaucetHttpServer);
  let wsHandler: (req: IncomingMessage, ws: WebSocket, remoteIp: string) => Promise<void> = null as any;
  for(let endpoint in faucetHttpServer.wssEndpoints) {
    if(faucetHttpServer.wssEndpoints[endpoint].pattern.test(url)) {
      wsHandler = faucetHttpServer.wssEndpoints[endpoint].handler;
    }
  }
  if(!wsHandler)
    throw "no ws handler for url";
  await wsHandler({
    url: url,
  } as any, fakeWs, ip)
  return fakeWs;
}

export class FakeWebSocket extends WebSocket {
  private sentMessages: any[] = [];
  public isReady = true;

  constructor() {
    super(null as any, undefined, {});
    fakeWebSockets.push(this);
  }

  public dispose() {
    let fakeWsIdx = fakeWebSockets.indexOf(this);
    if(fakeWsIdx !== -1) {
      fakeWebSockets.splice(fakeWsIdx, 1);
    }
  }

  public override send(data: any): void {
      this.sentMessages.push(JSON.parse(data));
  }

  public getSentMessage(action?: string) {
    return this.sentMessages.filter((msg) => !action || msg.action === action);
  }

  public override ping() {
    setTimeout(() => {
      this.emit("pong");
    }, 50);
  }

  public override close() {
    this.isReady = false;
  }
}