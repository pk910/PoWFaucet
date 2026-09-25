// A raw websocket client for the core's own socket tests.
//
// A module that serves its own websocket keeps an equivalent in its own tests. This one lived
// only in that tree until the module moved out, and `PoWSocketHandover` borrowed it from there - which was fine while both suites were one tree and is not now: a core
// test cannot import out of a module's tests. Two suites, two copies; this one follows the core's
// needs and that one follows the module's.
import * as crypto from "node:crypto";
import * as net from "node:net";

/**
 * A minimal websocket client that speaks the handshake by hand.
 *
 * The `ws` client only lets you send once it has seen the 101, which hides exactly
 * the race MD-WIRING-1 is about: a client whose first frame reaches the server in the
 * same read as the HTTP upgrade request, so the frame arrives as the upgrade `head`
 * rather than as socket data. This client can write frames before the handshake
 * completes, which is the harshest version of "sends Join before open".
 */
export class RawWsClient {
  public readonly frames: Buffer[] = [];
  public closed = false;
  public statusLine: string = null;

  private socket: net.Socket;
  private buffer = Buffer.alloc(0);
  private upgraded = false;

  /**
   * Connects and writes the HTTP upgrade request. When `firstFrame` is given it is
   * written in the very same tick, before any response has arrived.
   */
  public connect(port: number, path: string, firstFrame?: Uint8Array): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.socket = net.connect({ port: port, host: "127.0.0.1" }, () => {
        let key = crypto.randomBytes(16).toString("base64");
        this.socket.write(
          "GET " + path + " HTTP/1.1\r\n" +
          "Host: 127.0.0.1:" + port + "\r\n" +
          "Upgrade: websocket\r\n" +
          "Connection: Upgrade\r\n" +
          "Sec-WebSocket-Key: " + key + "\r\n" +
          "Sec-WebSocket-Version: 13\r\n" +
          "\r\n"
        );
        if(firstFrame)
          this.socket.write(encodeClientFrame(firstFrame));
        resolve();
      });
      this.socket.on("data", (chunk: Buffer) => this.onData(Buffer.from(chunk)));
      this.socket.on("close", () => { this.closed = true; });
      this.socket.on("error", (err) => { this.closed = true; reject(err); });
    });
  }

  public send(payload: Uint8Array) {
    if(!this.closed)
      this.socket.write(encodeClientFrame(payload));
  }

  public destroy() {
    if(this.socket)
      this.socket.destroy();
    this.closed = true;
  }

  private onData(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    if(!this.upgraded) {
      let end = this.buffer.indexOf("\r\n\r\n");
      if(end === -1)
        return;
      let headers = this.buffer.subarray(0, end).toString("latin1");
      this.statusLine = headers.split("\r\n")[0];
      this.buffer = this.buffer.subarray(end + 4);
      this.upgraded = true;
    }

    // server -> client frames are never masked
    while(this.buffer.length >= 2) {
      let length = this.buffer[1] & 0x7F;
      let offset = 2;
      if(length === 126) {
        if(this.buffer.length < 4)
          return;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      }
      else if(length === 127) {
        if(this.buffer.length < 10)
          return;
        length = Number(this.buffer.readBigUInt64BE(2));
        offset = 10;
      }
      if(this.buffer.length < offset + length)
        return;

      let opcode = this.buffer[0] & 0x0F;
      let payload = this.buffer.subarray(offset, offset + length);
      this.buffer = this.buffer.subarray(offset + length);
      if(opcode === 0x1 || opcode === 0x2)
        this.frames.push(Buffer.from(payload));
      else if(opcode === 0x8)
        this.closed = true;
    }
  }
}

/** One masked binary frame, as a browser would send it. */
export function encodeClientFrame(payload: Uint8Array): Buffer {
  let mask = crypto.randomBytes(4);
  let header: Buffer;
  if(payload.length < 126) {
    header = Buffer.alloc(2);
    header[1] = 0x80 | payload.length;
  }
  else if(payload.length < 65536) {
    header = Buffer.alloc(4);
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  }
  else {
    header = Buffer.alloc(10);
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  header[0] = 0x82; // FIN + binary

  let masked = Buffer.alloc(payload.length);
  for(let i = 0; i < payload.length; i++)
    masked[i] = payload[i] ^ mask[i % 4];

  return Buffer.concat([header, mask, masked]);
}
