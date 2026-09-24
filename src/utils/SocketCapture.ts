import { Socket } from "node:net";

/**
 * Holds on to everything a socket receives between the HTTP upgrade and the moment the
 * handle is passed to the gateway worker.
 *
 * MD-WIRING-1. Sending a socket to a child duplicates the file descriptor, so the child
 * inherits the kernel receive buffer - but not whatever this process has already read out
 * of it. Node's http server has a read in flight when it emits `upgrade` and `pause()`
 * does not cancel it, so bytes that arrive just after the request end up in this process'
 * stream buffer and are dropped when the handle is sent. Measured against the real stack:
 * `bytesRead=265 readableLength=33` in the main process versus `bytesRead=0` in the
 * worker - the 33 bytes being the client's entire `Join` frame, after which the gateway
 * kicked the next frame with `PROTOCOL expected join as first frame`.
 *
 * Pausing cannot fix that (the read is already in flight), so this does the opposite: it
 * reads *everything* and hands it to the worker appended to the upgrade `head`, which the
 * worker feeds into `handleUpgrade`. `release()` detaches and drains in one synchronous
 * step, so no chunk can slip in between.
 */
export class SocketCapture {
  private socket: Socket;
  private chunks: Buffer[] = [];
  private released = false;
  private onData = (chunk: Buffer) => { this.chunks.push(Buffer.from(chunk)); };

  public constructor(socket: Socket) {
    this.socket = socket;
    // an error here means the client went away before the hand-over; without a listener
    // that is an unhandled 'error' on the socket
    socket.on("error", () => { /* the request is abandoned */ });
    socket.on("data", this.onData);
  }

  public isReleased(): boolean {
    return this.released;
  }

  /**
   * Returns `head` plus everything received so far. Called immediately before the handle
   * is sent, with no await in between, so nothing can slip past.
   *
   * Capturing continues afterwards: `send()` is asynchronous, and until it completes this
   * process still owns the socket and still wins the race for incoming bytes. Those are
   * collected by drainLate().
   */
  public release(head: Buffer): Buffer {
    this.released = true;
    let parts = [head, ...this.take()];
    return parts.length === 1 ? head : Buffer.concat(parts);
  }

  /**
   * Everything captured since release(), after which this stops reading for good. Called
   * from the send callback, i.e. once the handle has reached the worker; whatever it
   * returns has to be forwarded separately, and anything arriving later is left in the
   * kernel buffer for the worker's own socket to read.
   */
  public drainLate(): Buffer {
    this.socket.removeListener("data", this.onData);
    let chunks = this.take();
    return chunks.length === 0 ? Buffer.alloc(0) : Buffer.concat(chunks);
  }

  private take(): Buffer[] {
    let chunks = this.chunks;
    this.chunks = [];
    let buffered: Buffer;
    while((buffered = this.socket.read()) !== null)
      chunks.push(buffered);
    return chunks;
  }
}
