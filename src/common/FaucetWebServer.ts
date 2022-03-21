import * as path from 'path';

import { createServer, IncomingMessage, Server as HttpServer, ServerResponse } from 'http';
import {Server as StaticServer, version, mime} from 'node-static';
import { WebSocketServer } from 'ws';
import * as stream from 'node:stream';
import { faucetConfig, IFaucetPortConfig } from './FaucetConfig';
import { PowController } from './PowController';


export class FaucetHttpServer {
  private httpServers: {[port: number]: {
    portConfig: IFaucetPortConfig,
    httpServer: HttpServer,
  }};
  private wssServer: WebSocketServer;
  private staticServer: StaticServer;
  private powController: PowController;

  public constructor(powController: PowController) {
    this.httpServers = {};
    faucetConfig.serverPorts.forEach((portConfig) => this.addServerPort(portConfig));

    this.wssServer = new WebSocketServer({
      noServer: true
    });

    console.log(faucetConfig.staticPath);
    this.staticServer = new StaticServer(faucetConfig.staticPath, {
      serverInfo: Buffer.from("pow-faucet/" + faucetConfig.faucetVersion)
    });

    this.powController = powController;
  }

  private addServerPort(port: IFaucetPortConfig) {
    let server = createServer();
    server.on("request", (req, rsp) => this.onHttpRequest(req, rsp));
    server.on("upgrade", (req, sock, head) => this.onHttpUpgrade(req, sock, head));
    server.listen(port.port);
    this.httpServers[port.port] = {
      portConfig: port,
      httpServer: server
    };
  }

  private onHttpRequest(req: IncomingMessage, rsp: ServerResponse) {
    if(req.method === "GET") {
      // serve static files
      req.on("end", () => {
        switch(req.url) {
          case "/":
            this.staticServer.serveFile("/index.html", 200, {}, req, rsp);
            break;
          default:
            this.staticServer.serve(req, rsp);
            break;
        }
      });
    }
    req.resume();
  }

  private onHttpUpgrade(req: IncomingMessage, socket: stream.Duplex, head: Buffer) {
    if(!req.url.match(/^\/pow/i)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    
    this.wssServer.handleUpgrade(req, socket, head, (ws) => {
      this.powController.addClientSocket(ws, req.socket.remoteAddress);
    });
  }


}
