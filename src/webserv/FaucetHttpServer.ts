import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'node:stream';
import { createServer, IncomingMessage, Server as HttpServer, ServerResponse } from 'http';
import { Server as StaticServer } from '@brettz9/node-static';
import { WebSocket, WebSocketServer } from 'ws';
import { faucetConfig } from '../config/FaucetConfig.js';
import { encode } from 'html-entities';
import { OutgoingHttpHeaders } from 'http2';
import { FaucetWebApi } from './FaucetWebApi.js';
import { ServiceManager } from '../common/ServiceManager.js';
import { FaucetProcess, FaucetLogLevel } from '../common/FaucetProcess.js';

export class FaucetHttpResponse {
  public readonly code: number;
  public readonly reason: string;
  public readonly body: string;
  public readonly headers: OutgoingHttpHeaders;

  public constructor(code: number, reason: string, body?: string, headers?: OutgoingHttpHeaders) {
    this.code = code;
    this.reason = reason;
    this.body = body;
    this.headers = headers;
  }
}

export interface FaucetWssEndpoint {
  pattern: RegExp;
  handler: (req: IncomingMessage, ws: WebSocket, remoteIp: string) => void;
}

const MAX_BODY_SIZE = 1024 * 1024 * 10; // 10MB

export class FaucetHttpServer {
  private initialized: boolean;
  private httpServer: HttpServer;
  private wssServer: WebSocketServer;
  private wssEndpoints: {[key: string]: FaucetWssEndpoint} = {};
  private staticServer: StaticServer;
  private cachedSeoIndex: string;

  public initialize() {
    if(this.initialized)
      return;
    this.initialized = true;

    this.httpServer = createServer();
    this.httpServer.on("request", (req, rsp) => this.onHttpRequest(req, rsp));
    this.httpServer.on("upgrade", (req, sock, head) => this.onHttpUpgrade(req, sock, head));
    this.httpServer.listen(faucetConfig.serverPort);

    this.wssServer = new WebSocketServer({
      noServer: true
    });

    this.staticServer = new StaticServer(faucetConfig.staticPath, {
      serverInfo: Buffer.from("pow-faucet/" + faucetConfig.faucetVersion)
    });

    if(faucetConfig.buildSeoIndex) {
      this.buildSeoIndex();
      ServiceManager.GetService(FaucetProcess).addListener("reload", () => {
        this.buildSeoIndex();
      });
    }
  }

  public getListenPort(): number {
    let addr = this.httpServer.address();
    if(typeof addr === "object")
      return addr.port;
    else
      return faucetConfig.serverPort;
  }

  public addWssEndpoint(key: string, pattern: RegExp, handler: (req: IncomingMessage, ws: WebSocket, remoteIp: string) => void) {
    this.wssEndpoints[key] = {
      pattern: pattern,
      handler: handler,
    };
  }

  public removeWssEndpoint(key: string) {
    delete this.wssEndpoints[key];
  }

  private onHttpRequest(req: IncomingMessage, rsp: ServerResponse) {
    if(req.method === "GET" || req.method === "POST") {
      let bodyParts = [];
      let bodySize = 0;
      req.on("data", (chunk: Buffer) => {
        bodyParts.push(chunk);
        bodySize += chunk.length;
        if(bodySize > MAX_BODY_SIZE) {
          req.destroy(new Error("body too big"));
        }
      });
      req.on("end", () => {
        if((req.url + "").match(/^\/api\//i)) {
          let body = req.method === "POST" ? Buffer.concat(bodyParts) : null;
          ServiceManager.GetService(FaucetWebApi).onApiRequest(req, body).then((res: object) => {
            if(res && typeof res === "object" && res instanceof FaucetHttpResponse) {
              rsp.writeHead(res.code, res.reason, res.headers);
              rsp.end(res.body);
            }
            else {
              let body = JSON.stringify(res);
              rsp.writeHead(200, {'Content-Type': 'application/json'});
              rsp.end(body);
            }
          }).catch((err) => {
            if(err && typeof err === "object" && err instanceof FaucetHttpResponse) {
              rsp.writeHead(err.code, err.reason, err.headers);
              rsp.end(err.body);
            }
            else {
              rsp.writeHead(500, "Internal Server Error");
              rsp.end(err ? err.toString() : "");
            }
          });
        }
        else {
          switch(req.url) {
            case "/":
            case "/index.html":
              if(faucetConfig.buildSeoIndex && this.cachedSeoIndex) {
                rsp.writeHead(200, {'Content-Type': 'text/html'});
                rsp.end(this.cachedSeoIndex);
              }
              else
                this.staticServer.serveFile("/index.html", 200, {}, req, rsp);
              break;
            default:
              this.staticServer.serve(req, rsp);
              break;
          }
        }
      });
    }
    req.resume();
  }

  private onHttpUpgrade(req: IncomingMessage, socket: stream.Duplex, head: Buffer) {
    let wssEndpoint: FaucetWssEndpoint;
    let allEndpoints = Object.values(this.wssEndpoints);
    for(let i = 0; i < allEndpoints.length; i++) {
      if(allEndpoints[i].pattern.test(req.url)) {
        wssEndpoint = allEndpoints[i];
        break;
      }
    }
    if(!wssEndpoint) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    
    this.wssServer.handleUpgrade(req, socket, head, (ws) => {
      let remoteAddr = ServiceManager.GetService(FaucetWebApi).getRemoteAddr(req);
      wssEndpoint.handler(req, ws, remoteAddr);
    });
  }

  private buildSeoIndex() {
    let indexFile = path.join(faucetConfig.staticPath, "index.html");
    if(!fs.existsSync(indexFile))
      return;
    
    let clientVersion: {version: string, build: number};
    try {
      let clientFile = path.join(faucetConfig.staticPath, "js", "powfaucet.js");
      let clientSrc = fs.readFileSync(clientFile, "utf8");
      let match = /@pow-faucet-client: ({[^}]+})/.exec(clientSrc);
      if(match)
        clientVersion = JSON.parse(match[1]);
    } catch(ex) {}

    let indexHtml = fs.readFileSync(indexFile, "utf8");
    let seoHtml = [
      '<div class="faucet-title">',
        '<h1 class="center">' + encode(faucetConfig.faucetTitle) + '</h1>',
      '</div>',
      '<div class="pow-header center">',
        '<div class="pow-status-container">',
          '<div class="pow-faucet-home">',
            faucetConfig.faucetImage ? '<img src="' + faucetConfig.faucetImage + '" className="image" />' : '',
          '</div>',
        '</div>',
      '</div>',
    ].join("");
    let seoMeta = "";
    if(faucetConfig.buildSeoMeta) {
      seoMeta = Object.keys(faucetConfig.buildSeoMeta).filter((metaName) => faucetConfig.buildSeoMeta.hasOwnProperty(metaName)).map((metaName) => {
        return '<meta name="' + metaName + '" content="' + faucetConfig.buildSeoMeta[metaName] + '">';
      }).join("");
    }

    indexHtml = indexHtml.replace(/<title>.*?<\/title>/, '<title>' + encode(faucetConfig.faucetTitle) + '</title>');
    indexHtml = indexHtml.replace(/<!-- pow-faucet-content -->/, seoHtml);
    indexHtml = indexHtml.replace(/<!-- pow-faucet-header -->/, seoMeta);
    indexHtml = indexHtml.replace(/<!-- pow-faucet-footer -->/, ServiceManager.GetService(FaucetWebApi).getFaucetHomeHtml());
    
    if(clientVersion) {
      indexHtml = indexHtml.replace(/"\/js\/powfaucet\.js"/, '"/js/powfaucet.js?' + clientVersion.build + '"');
      indexHtml = indexHtml.replace(/"\/css\/powfaucet\.css"/, '"/css/powfaucet.css?' + clientVersion.build + '"');
    }

    this.cachedSeoIndex = indexHtml;
    try {
      let seoFile = path.join(faucetConfig.staticPath, "index.seo.html");
      fs.writeFileSync(seoFile, indexHtml);
    } catch(ex) {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Could not write seo index to disk, because static folder is not writable. Serving seo index from memory.");
    }
  }
}
