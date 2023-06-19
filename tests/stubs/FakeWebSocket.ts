import { WebSocket, RawData } from 'ws';

export let fakeWebSockets: FakeWebSocket[] = [];

export function disposeFakeWebSockets() {
  fakeWebSockets.forEach((fakeWs) => fakeWs.dispose());
}


export class FakeWebSocket extends WebSocket {
  private sentMessages: any[] = [];
  public isReady = true;

  constructor() {
    super(null);
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