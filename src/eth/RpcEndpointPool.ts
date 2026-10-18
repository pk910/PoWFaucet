import { EthRpcClient, IEthRpcClient, IRpcProvider, RoutedRpcClient, createRpcProvider, isDefiniteRejection, isTransientRejection, isTransportError, isTxAlreadyKnownError, looksLikeSecret, redactUrl, redactUrlsInText, rpcErrorString } from './rpc/index.js';

import { faucetConfig } from '../config/FaucetConfig.js';
import { EthRpcHostConfig, IRpcEndpointConfig } from '../config/ConfigSchema.js';
import { ServiceManager } from '../common/ServiceManager.js';
import { FaucetLogLevel, FaucetProcess } from '../common/FaucetProcess.js';

/** What a broadcast attempt established, see RpcEndpointPool.broadcastSignedTransaction. */
export type BroadcastOutcome =
  | { status: "accepted"; hash: string }
  | { status: "ambiguous"; error: any }
  /** `definite`: every refusal was a validation error, so the bytes were never admitted anywhere; false for any other kind of no */
  | { status: "rejected"; error: any; definite: boolean };

export interface RpcEndpointState {
  config: IRpcEndpointConfig;
  label: string;
  client: EthRpcClient;
  provider: IRpcProvider;
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
  // one client for the lifetime of the pool: every call lands on the endpoint that is active right then
  private routedClient: RoutedRpcClient = new RoutedRpcClient(() => this.getActiveClient());
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

  // Returns the highest-priority ready client, or the first endpoint as a fallback
  // (so callers always get a usable instance and surface natural errors on failure).
  /** The client to keep: it follows failover, unlike the endpoint clients behind getActiveClient(). */
  public getClient(): IEthRpcClient {
    return this.routedClient;
  }

  public getActiveClient(): EthRpcClient {
    const ready = this.getReadyEndpoints();
    if (ready.length > 0)
      return ready[0].client;
    return this.endpoints[0]?.client || null;
  }

  public hasReadyEndpoint(): boolean {
    return this.endpoints.some((ep) => ep.online && !ep.blockLagOffline);
  }

  // Broadcast a signed raw tx to the top-N priority ready endpoints in parallel.
  // Returns the first successful tx hash. Errors are ignored as long as at least
  // one submission succeeded (other endpoints commonly return "already known").
  public async broadcastSendRawTransaction(rawTxHex: string): Promise<string> {
    const outcome = await this.broadcastSignedTransaction(rawTxHex);
    if (outcome.status === 'accepted')
      return outcome.hash;
    throw outcome.error;
  }

  /**
   * Broadcast to the top-N priority ready endpoints and say what that means:
   *  - accepted:  an endpoint took it, or already had it ("already known", "nonce too low")
   *  - rejected:  every endpoint answered, and every answer was a definite no
   *  - ambiguous: no endpoint confirmed it, and at least one did not answer (a transport error):
   *               the bytes may be in a mempool, nothing may be concluded from this attempt
   * A claim is only ever failed on `rejected`; `ambiguous` keeps it pending.
   */
  public async broadcastSignedTransaction(rawTxHex: string): Promise<BroadcastOutcome> {
    const broadcastCount = Math.max(1, faucetConfig.ethTxBroadcastCount || 1);
    let targets = this.getReadyEndpoints();
    if (targets.length === 0)
      targets = this.endpoints.slice(); // last-resort: try every endpoint

    targets = targets.slice(0, broadcastCount);
    if (targets.length === 0)
      return { status: 'rejected', error: new Error('no RPC endpoints configured'), definite: true };

    const results = await Promise.allSettled(
      targets.map((ep) => ep.client.sendRawTransaction(rawTxHex))
    );

    let hash: string = null;
    let ambiguous = false;
    let firstRejection: any = null;
    let definite = true;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const ep = targets[i];
      if (r.status === 'fulfilled') {
        if (!hash)
          hash = r.value as string;
        continue;
      }
      if (isTxAlreadyKnownError(r.reason)) {
        if (!hash)
          hash = '';
        continue;
      }
      if (isTransportError(r.reason) || isTransientRejection(r.reason))
        ambiguous = true; // the bytes may be out, or are worth sending again as they are: the receipt watch re-sends them
      else {
        if (!firstRejection)
          firstRejection = r.reason;
        if (!isDefiniteRejection(r.reason))
          definite = false;
      }
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.WARNING,
        `Tx broadcast to ${ep.label} failed: ${this.errorString(r.reason)}`
      );
    }

    if (hash !== null)
      return { status: 'accepted', hash };
    if (ambiguous)
      return { status: 'ambiguous', error: firstRejection || new Error('no RPC endpoint answered the broadcast') };
    return { status: 'rejected', error: firstRejection || new Error('all tx broadcasts failed'), definite };
  }

  /** The label of an endpoint that has this transaction (pool or chain), null when none does; endpoints that do not answer count as not having it. */
  public async endpointKnowingTransaction(txHash: string): Promise<string | null> {
    const endpoints = this.endpoints.filter((ep) => !!ep.client);
    const results = await Promise.allSettled(endpoints.map((ep) => ep.client.knowsTransaction(txHash)));
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled' && r.value)
        return endpoints[i].label;
    }
    return null;
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
    const provider = this.createProvider(cfg.url);
    const label = cfg.name || (typeof cfg.url === 'string' ? this.sanitizeUrl(cfg.url) : '<provider>');
    const ep: RpcEndpointState = {
      config: { url: cfg.url, name: cfg.name, priority: cfg.priority, metered: cfg.metered },
      label,
      client: null,
      provider,
      online: false,
      blockHeight: 0,
      lastCheck: 0,
      blockLagOffline: false,
      requestCount: 0,
    };
    this.instrumentProvider(ep);
    ep.client = new EthRpcClient(ep.provider);
    this.attachProviderHandlers(ep);
    return ep;
  }

  // The seam for tests; the real work is in src/eth/rpc.
  protected createProvider(url: string | object): IRpcProvider {
    return createRpcProvider(url);
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
      ep.provider = this.createProvider(ep.config.url);
      this.instrumentProvider(ep);
      ep.client = new EthRpcClient(ep.provider);
      this.attachProviderHandlers(ep);
    } catch (ex) {
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.ERROR,
        `RPC endpoint ${ep.label} reconnect failed: ${this.errorString(ex)}`
      );
    }
  }

  // Display-safe URL and error text: the redaction lives in src/eth/rpc/redact.ts, shared with
  // every other place that logs or shows RPC errors.
  private sanitizeUrl(url: string): string {
    return redactUrl(url);
  }

  private sanitizePath(pathname: string): string {
    if (!pathname || pathname === '/')
      return pathname;
    return pathname
      .split('/')
      .map((seg) => looksLikeSecret(seg) ? '<redacted>' : seg)
      .join('/');
  }

  private looksLikeSecret(value: string): boolean {
    return looksLikeSecret(value);
  }

  private sanitizeErrorMessage(message: string): string {
    return redactUrlsInText(message);
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
      const blockNumber = await ep.client.getBlockNumber();
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
        ep.client?.dispose();
      } catch (ex) {
        // some providers don't support disconnect
      }
    }
    this.endpoints = [];
  }

  private errorString(ex: any): string {
    // viem's short message plus the node's own words (a fee cap, a gas limit), URLs redacted
    return rpcErrorString(ex);
  }
}
