import Web3, { HttpProvider, WebSocketProvider } from 'web3';
import { ethRpcMethods } from 'web3-rpc-methods';
import IpcProvider from 'web3-providers-ipc';

import { faucetConfig } from '../config/FaucetConfig.js';
import { EthRpcHostConfig, IRpcEndpointConfig } from '../config/ConfigSchema.js';
import { ServiceManager } from '../common/ServiceManager.js';
import { FaucetLogLevel, FaucetProcess } from '../common/FaucetProcess.js';

export interface RpcEndpointState {
  config: IRpcEndpointConfig;
  label: string;
  web3: Web3;
  provider: any;
  online: boolean;
  blockHeight: number;
  lastCheck: number;
  lastError?: string;
  blockLagOffline: boolean;
  requestCount: number;
}

export interface IRpcEndpointStatus {
  url: string;
  priority: number;
  metered: boolean;
  online: boolean;
  ready: boolean;
  blockLag: boolean;
  blockHeight: number;
  lastCheck: number;
  lastError: string | null;
  requestCount: number;
}

interface NormalizedEndpoint {
  url: string | object;
  name?: string;
  priority: number;
  metered: boolean;
}

export class RpcEndpointPool {
  private endpoints: RpcEndpointState[] = [];
  private monitorInterval: NodeJS.Timeout = null;
  private disposed: boolean = false;

  public initialize(rawConfig: EthRpcHostConfig): void {
    this.disposeEndpoints();
    this.disposed = false;

    const configs = this.normalizeConfig(rawConfig);
    this.endpoints = configs.map((cfg) => this.createEndpoint(cfg));

    // Run an initial health check so we know the state before first use
    this.checkAllEndpoints().catch(() => {});

    if (this.monitorInterval)
      clearInterval(this.monitorInterval);
    this.monitorInterval = setInterval(() => this.runMonitorTick(), 1000);
  }

  public dispose(): void {
    this.disposed = true;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.disposeEndpoints();
  }

  public getEndpoints(): RpcEndpointState[] {
    return this.endpoints;
  }

  public getReadyEndpoints(): RpcEndpointState[] {
    return this.endpoints
      .filter((ep) => ep.online && !ep.blockLagOffline)
      .sort((a, b) => (b.config.priority || 1) - (a.config.priority || 1));
  }

  // Returns endpoints ordered the way they would actually be used:
  // ready endpoints first (highest priority first), then non-ready endpoints by priority.
  public getStatusList(): IRpcEndpointStatus[] {
    const sorted = this.endpoints.slice().sort((a, b) => {
      const aReady = a.online && !a.blockLagOffline;
      const bReady = b.online && !b.blockLagOffline;
      if (aReady !== bReady)
        return aReady ? -1 : 1;
      if (a.online !== b.online)
        return a.online ? -1 : 1;
      return (b.config.priority || 1) - (a.config.priority || 1);
    });
    return sorted.map((ep) => ({
      url: ep.label,
      priority: ep.config.priority || 1,
      metered: !!ep.config.metered,
      online: ep.online,
      ready: ep.online && !ep.blockLagOffline,
      blockLag: ep.blockLagOffline,
      blockHeight: ep.blockHeight,
      lastCheck: ep.lastCheck,
      lastError: ep.lastError || null,
      requestCount: ep.requestCount,
    }));
  }

  // Returns the highest-priority ready Web3, or the first endpoint as a fallback
  // (so callers always get a usable instance and surface natural errors on failure).
  public getActiveWeb3(): Web3 {
    const ready = this.getReadyEndpoints();
    if (ready.length > 0)
      return ready[0].web3;
    return this.endpoints[0]?.web3 || null;
  }

  public hasReadyEndpoint(): boolean {
    return this.endpoints.some((ep) => ep.online && !ep.blockLagOffline);
  }

  // Broadcast a signed raw tx to the top-N priority ready endpoints in parallel.
  // Returns the first successful tx hash. Errors are ignored as long as at least
  // one submission succeeded (other endpoints commonly return "already known").
  public async broadcastSendRawTransaction(rawTxHex: string): Promise<string> {
    const broadcastCount = Math.max(1, faucetConfig.ethTxBroadcastCount || 1);
    let targets = this.getReadyEndpoints();
    if (targets.length === 0)
      targets = this.endpoints.slice(); // last-resort: try every endpoint

    targets = targets.slice(0, broadcastCount);
    if (targets.length === 0)
      throw new Error('no RPC endpoints configured');

    const results = await Promise.allSettled(
      targets.map((ep) => ethRpcMethods.sendRawTransaction(ep.web3.eth.requestManager, rawTxHex))
    );

    let firstHash: string = null;
    let firstError: any = null;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const ep = targets[i];
      if (r.status === 'fulfilled') {
        if (!firstHash)
          firstHash = r.value as string;
      } else {
        if (!firstError)
          firstError = r.reason;
        ServiceManager.GetService(FaucetProcess).emitLog(
          FaucetLogLevel.WARNING,
          `Tx broadcast to ${ep.label} failed: ${this.errorString(r.reason)}`
        );
      }
    }

    if (firstHash)
      return firstHash;
    throw firstError || new Error('all tx broadcasts failed');
  }

  private normalizeConfig(raw: EthRpcHostConfig): NormalizedEndpoint[] {
    if (!raw)
      return [];
    let list: any[];
    if (Array.isArray(raw))
      list = raw;
    else
      list = [raw];

    return list
      .map((item) => this.normalizeItem(item))
      .filter((ep) => !!ep);
  }

  private normalizeItem(item: any): NormalizedEndpoint | null {
    if (!item)
      return null;
    if (typeof item === 'string')
      return { url: item, priority: 1, metered: false };
    // Object with `url` field is an endpoint config
    if (typeof item === 'object' && 'url' in item && item.url) {
      return {
        url: item.url,
        name: typeof item.name === 'string' && item.name.length > 0 ? item.name : undefined,
        priority: typeof item.priority === 'number' ? item.priority : 1,
        metered: !!item.metered,
      };
    }
    // Object without `url` is treated as a pre-built provider instance
    if (typeof item === 'object')
      return { url: item, priority: 1, metered: false };
    return null;
  }

  private createEndpoint(cfg: NormalizedEndpoint): RpcEndpointState {
    const provider = this.makeProvider(cfg.url);
    const label = cfg.name || (typeof cfg.url === 'string' ? this.sanitizeUrl(cfg.url) : '<provider>');
    const ep: RpcEndpointState = {
      config: { url: cfg.url, name: cfg.name, priority: cfg.priority, metered: cfg.metered },
      label,
      web3: null,
      provider,
      online: false,
      blockHeight: 0,
      lastCheck: 0,
      blockLagOffline: false,
      requestCount: 0,
    };
    this.instrumentProvider(ep);
    ep.web3 = new Web3(ep.provider);
    this.attachProviderHandlers(ep);
    return ep;
  }

  // Wrap the provider's `request` method so we can count outgoing JSON-RPC calls.
  // A single batched request still counts as one — that mirrors the network cost.
  private instrumentProvider(ep: RpcEndpointState): void {
    const provider = ep.provider;
    if (!provider || typeof provider.request !== 'function')
      return;
    if ((provider as any).__powFaucetWrapped)
      return;
    const orig = provider.request.bind(provider);
    provider.request = (payload: any, opts?: any) => {
      ep.requestCount++;
      return orig(payload, opts);
    };
    (provider as any).__powFaucetWrapped = true;
  }

  private attachProviderHandlers(ep: RpcEndpointState): void {
    try {
      ep.provider.on?.('error', (e: any) => {
        ServiceManager.GetService(FaucetProcess).emitLog(
          FaucetLogLevel.WARNING,
          `RPC endpoint ${ep.label} provider error: ${this.errorString(e)}`
        );
        ep.online = false;
      });
      ep.provider.on?.('end', () => {
        ServiceManager.GetService(FaucetProcess).emitLog(
          FaucetLogLevel.WARNING,
          `RPC endpoint ${ep.label} connection lost`
        );
        ep.online = false;
        if (this.disposed)
          return;
        setTimeout(() => this.recreateProvider(ep), 2000);
      });
    } catch (ex) {
      // some providers don't support .on (e.g. plain HttpProvider, or test fakes)
    }
  }

  private recreateProvider(ep: RpcEndpointState): void {
    if (this.disposed)
      return;
    try {
      ep.provider = this.makeProvider(ep.config.url);
      this.instrumentProvider(ep);
      ep.web3 = new Web3(ep.provider);
      this.attachProviderHandlers(ep);
    } catch (ex) {
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.ERROR,
        `RPC endpoint ${ep.label} reconnect failed: ${this.errorString(ex)}`
      );
    }
  }

  private makeProvider(url: any): any {
    if (typeof url !== 'string')
      return url; // pre-built provider object
    if (/^wss?:\/\//.test(url)) {
      const { cleanUrl, headers } = this.extractAuth(url);
      const wsOptions = Object.keys(headers).length > 0 ? { headers } : undefined;
      return new WebSocketProvider(cleanUrl, wsOptions);
    }
    if (url.startsWith('/'))
      return new IpcProvider(url);
    const { cleanUrl, headers } = this.extractAuth(url);
    const httpOptions = Object.keys(headers).length > 0 ? { providerOptions: { headers } } : undefined;
    return new HttpProvider(cleanUrl, httpOptions);
  }

  private extractAuth(url: string): { cleanUrl: string; headers: Record<string, string> } {
    try {
      const u = new URL(url);
      if (u.username || u.password) {
        const user = decodeURIComponent(u.username);
        const pass = decodeURIComponent(u.password);
        u.username = '';
        u.password = '';
        return {
          cleanUrl: u.toString(),
          headers: { Authorization: 'Basic ' + Buffer.from(user + ':' + pass).toString('base64') },
        };
      }
    } catch (ex) {
      // not a parseable URL, return as-is
    }
    return { cleanUrl: url, headers: {} };
  }

  // Returns a display-safe version of the URL: strips userinfo, redacts long path segments
  // that look like API keys, and redacts known secret-bearing query parameters.
  private sanitizeUrl(url: string): string {
    try {
      const u = new URL(url);
      let dirty = false;
      if (u.username || u.password) {
        u.username = '';
        u.password = '';
        dirty = true;
      }
      const sanitizedPath = this.sanitizePath(u.pathname);
      if (sanitizedPath !== u.pathname) {
        u.pathname = sanitizedPath;
        dirty = true;
      }
      if (u.search) {
        const sanitizedSearch = this.sanitizeQuery(u.searchParams);
        if (sanitizedSearch !== null) {
          u.search = sanitizedSearch;
          dirty = true;
        }
      }
      return dirty ? u.toString() : url;
    } catch (ex) {
      return url;
    }
  }

  private sanitizePath(pathname: string): string {
    if (!pathname || pathname === '/')
      return pathname;
    return pathname
      .split('/')
      .map((seg) => this.looksLikeSecret(seg) ? '<redacted>' : seg)
      .join('/');
  }

  private sanitizeQuery(params: URLSearchParams): string | null {
    const SECRET_KEYS = /^(api[_-]?key|key|token|auth|secret|password|pw|access[_-]?token|x[_-]?api[_-]?key)$/i;
    let changed = false;
    const out = new URLSearchParams();
    for (const [k, v] of params.entries()) {
      if (SECRET_KEYS.test(k) || this.looksLikeSecret(v)) {
        out.append(k, '<redacted>');
        changed = true;
      } else {
        out.append(k, v);
      }
    }
    return changed ? '?' + out.toString() : null;
  }

  private looksLikeSecret(value: string): boolean {
    if (!value || value.length < 16)
      return false;
    // long opaque strings: hex / base64url / UUID — typical API key shapes
    return /^[A-Za-z0-9_\-]{16,}$/.test(value);
  }

  // Strip URLs from arbitrary error text and replace each with its sanitized form,
  // so things like fetch errors don't leak credentials in lastError fields.
  private sanitizeErrorMessage(message: string): string {
    if (!message)
      return message;
    return message.replace(/https?:\/\/[^\s"'`<>]+/gi, (match) => this.sanitizeUrl(match));
  }

  private async runMonitorTick(): Promise<void> {
    if (this.disposed)
      return;
    const now = Math.floor(Date.now() / 1000);
    const intervalNonMetered = Math.max(1, faucetConfig.ethRpcMonitorInterval || 10);
    const intervalMetered = Math.max(1, faucetConfig.ethRpcMonitorMeteredInterval || 60);

    for (const ep of this.endpoints) {
      const interval = ep.config.metered ? intervalMetered : intervalNonMetered;
      if (now - ep.lastCheck >= interval) {
        ep.lastCheck = now;
        this.checkEndpoint(ep).catch(() => {});
      }
    }
  }

  private async checkAllEndpoints(): Promise<void> {
    await Promise.all(this.endpoints.map((ep) => this.checkEndpoint(ep).catch(() => {})));
  }

  private async checkEndpoint(ep: RpcEndpointState): Promise<void> {
    ep.lastCheck = Math.floor(Date.now() / 1000);
    try {
      const blockNumber = Number(await ep.web3.eth.getBlockNumber());
      const wasOffline = !ep.online;
      ep.blockHeight = blockNumber;
      ep.online = true;
      ep.lastError = undefined;
      if (wasOffline) {
        ServiceManager.GetService(FaucetProcess).emitLog(
          FaucetLogLevel.INFO,
          `RPC endpoint ${ep.label} is online (block ${blockNumber})`
        );
      }
    } catch (ex) {
      const wasOnline = ep.online;
      ep.online = false;
      ep.lastError = this.errorString(ex);
      if (wasOnline) {
        ServiceManager.GetService(FaucetProcess).emitLog(
          FaucetLogLevel.WARNING,
          `RPC endpoint ${ep.label} health check failed: ${ep.lastError}`
        );
      }
    }
    this.updateBlockLagStatus();
  }

  private updateBlockLagStatus(): void {
    let maxH = 0;
    for (const ep of this.endpoints) {
      if (ep.online && ep.blockHeight > maxH)
        maxH = ep.blockHeight;
    }

    const maxDiff = faucetConfig.ethRpcMaxBlockHeightDiff || 10;
    for (const ep of this.endpoints) {
      const lag = maxH > 0 ? maxH - ep.blockHeight : 0;
      const shouldOffline = ep.online && maxH > 0 && lag > maxDiff;
      if (shouldOffline && !ep.blockLagOffline) {
        ServiceManager.GetService(FaucetProcess).emitLog(
          FaucetLogLevel.WARNING,
          `RPC endpoint ${ep.label} is behind by ${lag} blocks (head ${maxH}) - marking offline`
        );
      } else if (!shouldOffline && ep.blockLagOffline) {
        ServiceManager.GetService(FaucetProcess).emitLog(
          FaucetLogLevel.INFO,
          `RPC endpoint ${ep.label} caught up (block ${ep.blockHeight}) - back online`
        );
      }
      ep.blockLagOffline = shouldOffline;
    }
  }

  private disposeEndpoints(): void {
    for (const ep of this.endpoints) {
      try {
        (ep.provider as any)?.disconnect?.();
      } catch (ex) {
        // some providers don't support disconnect
      }
    }
    this.endpoints = [];
  }

  private errorString(ex: any): string {
    if (!ex) return '';
    let msg: string;
    if (typeof ex === 'string') msg = ex;
    else msg = ex.message || ex.toString();
    return this.sanitizeErrorMessage(msg);
  }
}
