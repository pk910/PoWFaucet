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
import { Socket } from 'node:net';
import { ModuleLoader, moduleAssetUrl } from '../loader/ModuleLoader.js';

/**
 * The methods the faucet answers. A HEAD is served by the GET path: node sets
 * `_hasBody = false` on the response for a HEAD request, so every write is dropped for us
 * and the client gets the GET's headers with no body, which is what HEAD is.
 */
const ALLOWED_METHODS = ["GET", "HEAD", "POST", "OPTIONS"];

/**
 * `/modules/<name>/<path>` - a module's own client files.
 *
 * The name is matched against the loaded modules rather than the filesystem, so a request
 * can only reach a directory a module actually registered, and `<path>` is resolved and
 * then checked to be inside that directory. A module directory is operator-supplied and
 * `..` in a url is the oldest trick there is.
 */
const MODULE_ASSET_PATH = /^\/modules\/([a-z0-9][a-z0-9-]*)\/(.+)$/;

/** Wasm modules under /js/, the only assets shipped with precompressed siblings. */
/**
 * `/js/powfaucet.8bad6781.js`, `/css/powfaucet.73d07567.css` - the content-hashed client
 * build. Eight hex characters between the name and the extension, which is what
 * `[contenthash:8]` emits and what nothing else in `static/` looks like.
 */
const HASHED_ASSET = /^\/(js|css)\/[A-Za-z0-9._-]+\.[0-9a-f]{8}\.(js|css)$/;

/**
 * The index page names the hashed assets, so it is the one file that must never be cached:
 * a browser holding it is a browser running the previous deploy and reporting bugs about it.
 */
const INDEX_HEADERS: OutgoingHttpHeaders = {
  "Content-Type": "text/html",
  "Cache-Control": "no-cache",
};

/**
 * The two headers that make a page cross-origin isolated, or nothing when it is switched off.
 *
 * `SharedArrayBuffer` is only handed to an isolated page, and a module whose client shares memory
 * with a worker wants
 * shared ring for the per-frame view (frontend TASK-48). Both headers are needed and they have to
 * be on the *document*; the assets carry them too, so a cached copy of the page cannot end up
 * isolated while its scripts are not.
 *
 * `credentialless` before `require-corp` when a choice is offered: it asks cross-origin iframes to
 * opt in but leaves ordinary images, fonts and scripts alone, which is the difference between a
 * captcha that still loads and one that silently does not.
 */
function isolationHeaders(): OutgoingHttpHeaders {
  let mode = faucetConfig.crossOriginIsolation;
  if(!mode || mode === "off")
    return {};
  return {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": mode,
  };
}

/** Encodings to look for beside a module's asset, best first. */
const PRECOMPRESSED = [
  { encoding: "br", suffix: ".br" },
  { encoding: "gzip", suffix: ".gz" },
];

export class FaucetHttpResponse {
  public readonly code: number;
  public readonly reason: string;
  public readonly body: string;
  public readonly headers: OutgoingHttpHeaders;

  public constructor(code: number, reason: string, body?: string, headers?: OutgoingHttpHeaders) {
    this.code = code;
    this.reason = reason;
    this.body = body;
    this.headers = headers || {};
  }
}

export interface FaucetWssEndpoint {
  pattern: RegExp;
  wssHandler?: (req: IncomingMessage, ws: WebSocket, remoteIp: string) => void;
  rawHandler?: (req: IncomingMessage, socket: stream.Duplex, head: Buffer, remoteIp: string) => void;
}

const MAX_BODY_SIZE = 1024 * 1024 * 10; // 10MB

export class FaucetHttpServer {
  private initialized: boolean;
  private httpServer: HttpServer;
  private wssServer: WebSocketServer;
  private wssEndpoints: {[key: string]: FaucetWssEndpoint} = {};
  private staticServer: StaticServer;
  private cachedSeoIndex: string;
  private cachedModuleIndex: string;

  public initialize() {
    if(this.initialized)
      return;
    this.initialized = true;

    this.httpServer = createServer();
    this.httpServer.on("request", (req, rsp) => this.onHttpRequest(req, rsp));
    this.httpServer.on("upgrade", (req, sock, head) => this.onHttpUpgrade(req, sock as Socket, head));
    this.httpServer.listen(faucetConfig.serverPort);

    this.wssServer = new WebSocketServer({
      noServer: true
    });

    this.staticServer = new StaticServer(faucetConfig.staticPath, {
      serverInfo: Buffer.from("pow-faucet/" + faucetConfig.faucetVersion),
      // Content-hashed client files get `Cache-Control: immutable` from `getCacheHeaders`, and
      // `false` here keeps node-static from adding its own max-age on top: two Cache-Control
      // values let a cache pick the shorter one. Everything else keeps its default hour.
      cache: { "/js/*.*.js": false, "/css/*.*.css": false, "**": 3600 } as any,
    });


    if(faucetConfig.buildSeoIndex) {
      this.buildSeoIndex();
      ServiceManager.GetService(FaucetProcess).addListener("reload", () => {
        this.buildSeoIndex();
      });
    }
    else {
      // the index still has to name the hashed bundle and carry any module's tags when the
      // seo rewrite is off
      this.buildModuleIndex();
    }
  }

  public getListenPort(): number {
    let addr = this.httpServer.address();
    if(typeof addr === "object")
      return addr.port;
    else
      return faucetConfig.serverPort;
  }

  public addWssEndpoint(key: string, pattern: RegExp, wssHandler: (req: IncomingMessage, ws: WebSocket, remoteIp: string) => void) {
    this.wssEndpoints[key] = {
      pattern: pattern,
      wssHandler: wssHandler,
    };
  }

  public addRawEndpoint(key: string, pattern: RegExp, rawHandler: (req: IncomingMessage, socket: Socket, head: Buffer, remoteIp: string) => void) {
    this.wssEndpoints[key] = {
      pattern: pattern,
      rawHandler: rawHandler
    };
  }

  public removeWssEndpoint(key: string) {
    delete this.wssEndpoints[key];
  }

  private onHttpRequest(req: IncomingMessage, rsp: ServerResponse) {
    // anything not in ALLOWED_METHODS used to fall out of this method with
    // no response written at all, leaving the client waiting for a reply that never came -
    // a plain `curl -I` against any url hung until it timed out. Answer instead.
    if(ALLOWED_METHODS.indexOf(req.method) === -1) {
      this.sendApiResponse(req, rsp, 405, "Method Not Allowed",
        { "Allow": ALLOWED_METHODS.join(", ") }, "");
      req.resume();
      return;
    }

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
        if(req.method === "OPTIONS") {
          this.sendApiResponse(req, rsp, 200, "OK", {}, null);
        } else {
          ServiceManager.GetService(FaucetWebApi).onApiRequest(req, body).then((res: object) => {
            if(res && typeof res === "object" && res instanceof FaucetHttpResponse)
              this.sendApiResponse(req, rsp, res.code, res.reason, res.headers, res.body);
            else
              this.sendApiResponse(req, rsp, 200, "OK", {'Content-Type': 'application/json'}, JSON.stringify(res));
          }).catch((err) => {
            if(err && typeof err === "object" && err instanceof FaucetHttpResponse)
              this.sendApiResponse(req, rsp, err.code, err.reason, err.headers, err.body);
            else
              this.sendApiResponse(req, rsp, 500, "Internal Server Error", {}, err ? err.toString() : "")
          });
        }
      }
      else if(req.method === "OPTIONS") {
        this.sendApiResponse(req, rsp, 200, "OK", {}, null);
      }
      else {
        /**
         * The **path**, not the url, decides what this is.
         *
         * `switch(req.url)` matched `/` and `/index.html` exactly, so `/?dev=1` - or any
         * campaign parameter, or `/?netcode=n1` - fell through to the static server and got
         * `static/index.html` straight off disk. That was invisible while the client half of
         * everything was compiled into the bundle, and became "it is simply not there" the day a
         * module's client had to be injected into the page: the injected `<script>` lives in the
         * built index, and a page served around it registers nothing, silently (found by
         * the browser gate, whose own url carries `?dev=1`).
         */
        let requestPath: string;
        try {
          requestPath = decodeURI(new URL(req.url, 'http://localhost').pathname);
        } catch {
          this.sendApiResponse(req, rsp, 400, "Bad Request", {}, "");
          return;
        }
        switch(requestPath) {
          case "/":
          case "/index.html":
            let indexHeaders = Object.assign({}, INDEX_HEADERS, isolationHeaders());
            if(faucetConfig.buildSeoIndex && this.cachedSeoIndex) {
              rsp.writeHead(200, indexHeaders);
              rsp.end(this.cachedSeoIndex);
            }
            else if(this.cachedModuleIndex) {
              rsp.writeHead(200, indexHeaders);
              rsp.end(this.cachedModuleIndex);
            }
            else
              this.staticServer.serveFile("/index.html", 200, isolationHeaders(), req, rsp);
            break;
          default:
            let pathname = requestPath;
            if(this.serveModuleAsset(pathname, req, rsp))
              break;
            // No precompressed handling here any more: the faucet's own build produces no wasm,
            // and a module's assets are served by `serveModuleAsset` out of the module's directory,
            // which picks the `.gz`/`.br` sibling itself. A copy under `static/` would be a
            // module's asset in the faucet's tree - the thing that silently served one build of a
            // simulation against another, and `check-modules` reports it now.
            let staticHeaders = Object.assign({}, this.getCorsHeaders(req),
                                              this.getCacheHeaders(pathname), isolationHeaders());
            this.staticServer.servePath(pathname, 200, staticHeaders, req, rsp, (status, headers) => {
              if(!rsp.headersSent && !rsp.writableEnded) {
                rsp.writeHead(status, headers);
                rsp.end();
              }
            });
            break;
        }
      }
    });
    req.resume();
  }

  /**
   * Serves `/modules/<name>/<file>` out of that module's directory, or returns false so
   * the request falls through to the normal static tree.
   *
   * `?v=<version>` makes it immutable, which is the point of the version being in the
   * client config: the client asks for the version it was told about, and a module upgrade
   * changes the url rather than needing a cache to expire. Without it the file is served
   * with no caching at all, because then nothing identifies which build it is.
   */
  private serveModuleAsset(pathname: string, req: IncomingMessage, rsp: ServerResponse): boolean {
    let match = pathname.match(MODULE_ASSET_PATH);
    if(!match)
      return false;

    let module = ServiceManager.GetService(ModuleLoader).getLoaded()
      .find((entry) => entry.manifest.name === match[1]);
    if(!module)
      return false;

    // resolve first, then check: `path.resolve` collapses `..`, so a traversal shows up as
    // a path that is no longer under the module's directory
    let root = path.resolve(module.dir, "client");
    let file = path.resolve(root, match[2]);
    if(file !== root && !file.startsWith(root + path.sep))
      return false;
    if(!fs.existsSync(file) || !fs.statSync(file).isFile())
      return false;

    let versioned = /[?&]v=/.test(req.url || "");
    // `isolationHeaders()` here for the reason its own comment gives: the assets carry them too, so
    // a cached page cannot end up isolated while its scripts are not. This route was written after
    // that comment and was the only one that skipped it, which did not look like a header problem
    // at all - under `credentialless` Chrome refuses a module's *worker script*
    // (`ERR_BLOCKED_BY_RESPONSE`) and the module simply never starts, with nothing else failing.
    // It is every script a module's bundle loads for itself, so it would have been the next module
    // too.
    let headers: OutgoingHttpHeaders = Object.assign({}, this.getCorsHeaders(req), isolationHeaders(), {
      "Content-Type": moduleAssetType(file),
      "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "no-cache",
    });

    /**
     * A precompressed sibling, when the module shipped one and the client takes it.
     *
     * The largest thing a page fetches here is a module's wasm - 320 kB plain against 108 kB
     * brotli - and a module's package step writes `.gz` and `.br` beside it for exactly this. The
     * The faucet's own tree has nothing like it - it builds no wasm at all - so this is the only
     * place that does it, and without it a module's largest asset costs three times what it should.
     *
     * The content type stays the file's own: an encoding is what the body is wrapped in, not what it
     * is. `Vary` is set whether or not a sibling was found, because a cache must not hand a
     * br-encoded body to a client that cannot read it.
     */
    let body = file;
    if(PRECOMPRESSED.some((candidate) => file.endsWith(candidate.suffix))) {
      // asking for the sibling directly is how a cache would poison itself
      return false;
    }
    headers["Vary"] = "Accept-Encoding";
    for(let candidate of PRECOMPRESSED) {
      if(!this.acceptsEncoding(req, candidate.encoding))
        continue;
      let sibling = file + candidate.suffix;
      if(fs.existsSync(sibling)) {
        body = sibling;
        headers["Content-Encoding"] = candidate.encoding;
        break;
      }
    }

    headers["Content-Length"] = fs.statSync(body).size;
    rsp.writeHead(200, headers);
    // HEAD is answered by the same path; node drops the body for us
    fs.createReadStream(body).pipe(rsp);
    return true;
  }

  /** Whether `Accept-Encoding` offers this encoding without weighting it away. */
  private acceptsEncoding(req: IncomingMessage, encoding: string): boolean {
    let header = req.headers["accept-encoding"];
    if(!header)
      return false;
    let offers = (Array.isArray(header) ? header.join(",") : header).split(",");
    return offers.some((offer) => {
      let parts = offer.trim().split(";");
      if(parts[0].trim().toLowerCase() !== encoding)
        return false;
      // "br;q=0" is a refusal, not an offer
      return !parts.slice(1).some((param) => /^\s*q\s*=\s*0(\.0+)?\s*$/i.test(param));
    });
  }

  /**
   * Extra caching headers for immutable static assets.
   *
   * Only what this build wrote: content-hashed client files, whose name *is* their version.
   * A module's assets are not here - they are served from the module's own directory and keyed
   * by the module's version (`serveModuleAsset`).
   */
  private getCacheHeaders(pathname: string): OutgoingHttpHeaders {
    // the client bundle and its workers, content-hashed by the build: the name *is* the
    // version, so it can be kept forever and a deploy is a different name
    if(HASHED_ASSET.test(pathname))
      return { "Cache-Control": "public, max-age=31536000, immutable" };
    // and the page that names them must not be: a cached index.html is a browser running
    // the previous deploy's bundle and reporting bugs about it
    if(/\.html$/.test(pathname))
      return { "Cache-Control": "no-cache" };
    return {};
  }

  private sendApiResponse(req: IncomingMessage, rsp: ServerResponse, code: number, reason: string, headers: OutgoingHttpHeaders, body: string) {
    Object.assign(headers, this.getCorsHeaders(req));
    rsp.writeHead(code, reason, headers);
    rsp.end(body);
  }

  private getCorsHeaders(req: IncomingMessage): OutgoingHttpHeaders {
    let headers: OutgoingHttpHeaders = {};
    let corsAllowOrigin = faucetConfig.corsAllowOrigin || [];
    if(corsAllowOrigin.length > 0) {
      let rspAllowOrigin: string;
      for(let i = 0; i < corsAllowOrigin.length; i++) {
        let allowOrigin = corsAllowOrigin[i];
        if(allowOrigin == "*" || allowOrigin == req.headers.origin) {
          rspAllowOrigin = allowOrigin;
          break;
        }
      }

      if(rspAllowOrigin) {
        headers["Access-Control-Allow-Origin"] = rspAllowOrigin;
        headers["Access-Control-Allow-Methods"] = "GET, POST";
        headers["Access-Control-Allow-Headers"] = "Content-Type";
      }
    }

    return headers;
  }

  private onHttpUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {
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

    let remoteAddr = ServiceManager.GetService(FaucetWebApi).getRemoteAddr(req);
    if(wssEndpoint.wssHandler) {
      this.wssServer.handleUpgrade(req, socket, head, (ws) => {
        wssEndpoint.wssHandler(req, ws, remoteAddr);
      });
    } else if(wssEndpoint.rawHandler) {
      wssEndpoint.rawHandler(req, socket, head, remoteAddr);
    } else {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
    }
  }

  /**
   * The index page with the loaded modules' tags in it, cached, or nothing when no module
   * ships a client half - then the static file is served as before.
   *
   * Only for the `buildSeoIndex: false` case; the seo rewrite injects the same tags itself.
   */
  private buildModuleIndex() {
    let indexHtml = this.readIndexHtml();
    if(indexHtml === null)
      return;
    this.cachedModuleIndex = this.injectModuleTags(indexHtml);
  }

  /** The index page to serve from, or null when this installation has none. */
  private readIndexHtml(): string {
    let file = path.join(faucetConfig.staticPath, "index.html");
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  }


  /**
   * Adds each loaded module's stylesheet to `<head>` and its script to the end of `<body>`.
   *
   * The scripts are `defer`, and the faucet's own bundle waits for DOMContentLoaded before
   * its first render: deferred scripts run after parsing and before that event, so a module
   * that registers something to render is in place before anything is drawn, and in manifest order. A
   * module script is not `async` for the same reason - order would stop being a thing.
   */
  private injectModuleTags(indexHtml: string): string {
    let modules = ServiceManager.GetService(ModuleLoader).getLoaded();
    let styles = "", scripts = "";
    modules.forEach((entry) => {
      let css = moduleAssetUrl(entry.manifest, entry.manifest.client?.css);
      if(css)
        styles += '<link rel="Stylesheet" type="text/css" href="' + encode(css) + '">';
      let script = moduleAssetUrl(entry.manifest, entry.manifest.client?.script);
      if(script)
        scripts += '<script defer src="' + encode(script) + '"></script>';
    });
    if(styles)
      indexHtml = indexHtml.replace(/<\/head>/, styles + '</head>');
    if(scripts)
      indexHtml = indexHtml.replace(/<\/body>/, scripts + '</body>');
    return indexHtml;
  }

  private buildSeoIndex() {
    let indexHtml = this.readIndexHtml();
    if(indexHtml === null)
      return;
    
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
    

    this.cachedSeoIndex = this.injectModuleTags(indexHtml);
    try {
      let seoFile = path.join(faucetConfig.staticPath, "index.seo.html");
      fs.writeFileSync(seoFile, this.cachedSeoIndex);
    } catch(ex) {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Could not write seo index to disk, because static folder is not writable. Serving seo index from memory.");
    }
  }
}

/** Content types for what a module may ship to a browser; anything else is a download. */
function moduleAssetType(file: string): string {
  switch(path.extname(file).toLowerCase()) {
    case ".js": return "application/javascript";
    case ".mjs": return "application/javascript";
    case ".css": return "text/css";
    case ".json": return "application/json";
    case ".wasm": return "application/wasm";
    case ".png": return "image/png";
    case ".jpg": case ".jpeg": return "image/jpeg";
    case ".svg": return "image/svg+xml";
    case ".webp": return "image/webp";
    case ".woff2": return "font/woff2";
    default: return "application/octet-stream";
  }
}
