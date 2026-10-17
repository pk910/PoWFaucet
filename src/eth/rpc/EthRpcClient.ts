import {
  createPublicClient, custom, http, webSocket, Transport, Hex, Address,
  RpcRequestError, UnknownRpcError, HttpRequestError, TimeoutError, WebSocketRequestError,
} from 'viem';
import { ipc } from 'viem/node';
import { normalize } from 'viem/ens';
import { redactUrl, redactUrlsInText } from './redact.js';

/**
 * The provider contract the faucet speaks internally: EIP-1193 style `request({ method, params })`.
 * A provider may answer with the bare result (viem transports) or with a JSON-RPC envelope
 * (`{ jsonrpc, id, result | error }`, the shape of web3 providers and of the FakeProvider test
 * stub); EthRpcClient.rawRequest accepts both, so pre-built provider objects in `ethRpcHost` keep
 * working unchanged.
 */
export interface IRpcProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: 'error' | 'end', listener: (...args: any[]) => void): unknown;
  disconnect?(): void | Promise<void>;
}

/** Our own receipt type: the fields the faucet reads, parsed leniently from the node's JSON. */
export interface EthTxReceipt {
  transactionHash: string;
  status: boolean;
  blockNumber: number;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  logs: EthLog[];
  raw: any;
}

export interface EthLog {
  address: string;
  topics: string[];
  data: string;
  logIndex: number | null;
}

export type EthBlockTag = 'latest' | 'pending' | 'earliest' | 'safe' | 'finalized';

const RPC_TIMEOUT = 15000;

/** Basic auth from the URL's userinfo as an Authorization header, so credentials never appear in logs or error text. */
export function extractAuth(url: string): { cleanUrl: string; headers: Record<string, string> } {
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

/** A provider over one of viem's wire transports. Retries are off: failover is the endpoint pool's job. */
abstract class TransportProvider implements IRpcProvider {
  protected transport: ReturnType<Transport>;

  protected constructor(transport: Transport) {
    this.transport = transport({ retryCount: 0, timeout: RPC_TIMEOUT });
  }

  public request(args: { method: string; params?: unknown[] }): Promise<unknown> {
    return this.transport.request(args as any);
  }

  public async disconnect(): Promise<void> {
    const value = this.transport.value as { getRpcClient?: () => Promise<{ close?: () => void }> } | undefined;
    if (value && typeof value.getRpcClient === 'function') {
      try {
        (await value.getRpcClient()).close?.();
      } catch (ex) {
        // never connected
      }
    }
  }
}

export class HttpProvider extends TransportProvider {
  public readonly url: string;
  public readonly headers: Record<string, string>;

  public constructor(url: string, headers: Record<string, string> = {}) {
    super(http(url, {
      fetchOptions: Object.keys(headers).length > 0 ? { headers } : undefined,
      retryCount: 0,
      timeout: RPC_TIMEOUT,
    }));
    this.url = url;
    this.headers = headers;
  }
}

export class WebSocketProvider extends TransportProvider {
  public constructor(url: string) {
    super(webSocket(url, { retryCount: 0, timeout: RPC_TIMEOUT, reconnect: true }));
  }
}

export class IpcProvider extends TransportProvider {
  public constructor(path: string) {
    super(ipc(path, { retryCount: 0, timeout: RPC_TIMEOUT, reconnect: true }));
  }
}

/**
 * Build a provider for an `ethRpcHost` entry: http(s) URL (user:pass@ becomes a basic auth header),
 * ws(s) URL (no credentials: the WebSocket transport has no header option and a URL with userinfo
 * would end up in error messages), an absolute IPC socket path, or a pre-built provider object
 * (anything with a `request` function).
 */
export function createRpcProvider(rpcHost: string | object): IRpcProvider {
  if (typeof rpcHost !== 'string') {
    if (rpcHost && typeof (rpcHost as IRpcProvider).request === 'function')
      return rpcHost as IRpcProvider;
    throw new Error("invalid rpc provider: expected a URL or an object with a request() function");
  }
  if (/^wss?:\/\//.test(rpcHost)) {
    const { headers } = extractAuth(rpcHost);
    if (Object.keys(headers).length > 0)
      throw new Error("WebSocket RPC URLs cannot carry credentials (" + redactUrl(rpcHost) + "): use an http(s) URL with user:pass@, or a reverse proxy");
    return new WebSocketProvider(rpcHost);
  }
  if (rpcHost.startsWith('/'))
    return new IpcProvider(rpcHost);
  const { cleanUrl, headers } = extractAuth(rpcHost);
  return new HttpProvider(cleanUrl, headers);
}

/** Lenient quantity parsing: nodes send 0x hex, test stubs send decimal strings, numbers or booleans. */
export function toBigInt(value: unknown, fallback: bigint = 0n): bigint {
  if (typeof value === 'bigint')
    return value;
  if (typeof value === 'number')
    return BigInt(Math.trunc(value));
  if (typeof value === 'boolean')
    return value ? 1n : 0n;
  if (typeof value === 'string' && value.length > 0) {
    try {
      return BigInt(value);
    } catch (ex) {
      return fallback;
    }
  }
  return fallback;
}

function normalizeReceipt(raw: any): EthTxReceipt {
  return {
    transactionHash: raw.transactionHash,
    status: toBigInt(raw.status, 0n) === 1n,
    blockNumber: Number(toBigInt(raw.blockNumber)),
    gasUsed: toBigInt(raw.gasUsed),
    effectiveGasPrice: toBigInt(raw.effectiveGasPrice),
    logs: Array.isArray(raw.logs) ? raw.logs.map((log: any) => ({
      address: log.address,
      topics: log.topics || [],
      data: log.data || "0x",
      logIndex: log.logIndex === undefined || log.logIndex === null ? null : Number(toBigInt(log.logIndex)),
    })) : [],
    raw: raw,
  };
}

const TRANSPORT_ERROR_PATTERN = /CONNECTION ERROR|invalid json response|ETIMEDOUT|ECONNREFUSED|ECONNRESET|EPIPE|EAI_AGAIN|socket hang up|fetch failed|request timed out|timed out|network error|WebSocket request failed|socket has been closed/i;

/**
 * True when the error says nothing about the request itself: the node was not reached, or its
 * answer was not JSON. The request may or may not have been executed. False for a JSON-RPC error
 * the node returned.
 */
export function isTransportError(ex: any): boolean {
  if (!ex)
    return false;
  if (ex instanceof RpcRequestError)
    return false;
  if (ex instanceof HttpRequestError || ex instanceof TimeoutError || ex instanceof WebSocketRequestError || ex instanceof UnknownRpcError)
    return true;
  if (ex.name === "FetchError" || ex.name === "AbortError" || ex.name === "RpcTransportError")
    return true;
  const texts = [ex.message, ex.details, ex.shortMessage, ex.cause?.message];
  return texts.some((text) => typeof text === "string" && TRANSPORT_ERROR_PATTERN.test(text));
}

const TX_ALREADY_KNOWN_PATTERN = /already known|known transaction|alreadyknown|nonce too low|replacement transaction underpriced|same hash was already imported|already imported/i;

/** The node has these bytes already (or the nonce is spent): a broadcast that says so has succeeded. */
export function isTxAlreadyKnownError(ex: any): boolean {
  return TX_ALREADY_KNOWN_PATTERN.test(rpcErrorString(ex));
}

/**
 * The text of an error as the faucet logs or shows it: viem's short message plus the node's own
 * message (`details`), with every URL in it redacted (viem quotes the endpoint URL in transport errors).
 */
export function rpcErrorString(ex: any): string {
  if (!ex)
    return "";
  if (typeof ex === "string")
    return redactUrlsInText(ex);
  const parts = [ex.shortMessage || ex.message, ex.details].filter((p) => typeof p === "string" && p.length > 0);
  return redactUrlsInText(parts.length > 0 ? parts.join(": ") : ex.toString());
}

/**
 * What the faucet asks of an RPC connection. EthRpcClient is one endpoint; RoutedRpcClient is
 * "whichever endpoint the pool currently prefers". Code that keeps a client (the wallet manager,
 * a ContractCaller) should hold the routed one, so an endpoint dying mid-way is never its problem.
 */
export interface IEthRpcClient {
  rawRequest<T = unknown>(method: string, params?: unknown[]): Promise<T>;
  getChainId(): Promise<number>;
  getBlockNumber(): Promise<number>;
  getBalance(address: string, blockTag?: EthBlockTag): Promise<bigint>;
  getTransactionCount(address: string, blockTag?: EthBlockTag): Promise<number>;
  getGasPrice(): Promise<bigint>;
  getCode(address: string): Promise<string>;
  call(to: string, data: string): Promise<string>;
  estimateGas(tx: { from?: string; to: string; data?: string; value?: bigint }): Promise<bigint>;
  sendRawTransaction(signedTx: string): Promise<string>;
  getTransactionReceipt(txHash: string): Promise<EthTxReceipt | null>;
  getEnsAddress(name: string, universalResolverAddress: string): Promise<string | null>;
}

/** Every call goes to the client `resolve()` returns at that moment (the pool's active endpoint). */
export class RoutedRpcClient implements IEthRpcClient {
  private resolve: () => IEthRpcClient;

  public constructor(resolve: () => IEthRpcClient) {
    this.resolve = resolve;
  }

  private target(): IEthRpcClient {
    const client = this.resolve();
    if (!client)
      throw new Error("no RPC endpoint available");
    return client;
  }

  public rawRequest<T = unknown>(method: string, params?: unknown[]): Promise<T> { return this.target().rawRequest<T>(method, params); }
  public getChainId(): Promise<number> { return this.target().getChainId(); }
  public getBlockNumber(): Promise<number> { return this.target().getBlockNumber(); }
  public getBalance(address: string, blockTag?: EthBlockTag): Promise<bigint> { return this.target().getBalance(address, blockTag); }
  public getTransactionCount(address: string, blockTag?: EthBlockTag): Promise<number> { return this.target().getTransactionCount(address, blockTag); }
  public getGasPrice(): Promise<bigint> { return this.target().getGasPrice(); }
  public getCode(address: string): Promise<string> { return this.target().getCode(address); }
  public call(to: string, data: string): Promise<string> { return this.target().call(to, data); }
  public estimateGas(tx: { from?: string; to: string; data?: string; value?: bigint }): Promise<bigint> { return this.target().estimateGas(tx); }
  public sendRawTransaction(signedTx: string): Promise<string> { return this.target().sendRawTransaction(signedTx); }
  public getTransactionReceipt(txHash: string): Promise<EthTxReceipt | null> { return this.target().getTransactionReceipt(txHash); }
  public getEnsAddress(name: string, universalResolverAddress: string): Promise<string | null> { return this.target().getEnsAddress(name, universalResolverAddress); }
}

/**
 * The faucet's view of one RPC endpoint: the handful of calls it makes, typed, over any provider.
 * viem does the encoding; nothing outside src/eth/rpc imports viem.
 */
export class EthRpcClient implements IEthRpcClient {
  public readonly provider: IRpcProvider;
  private client: ReturnType<typeof createPublicClient>;
  private nextId: number = 1;

  public static fromRpcHost(rpcHost: string | object): EthRpcClient {
    return new EthRpcClient(createRpcProvider(rpcHost));
  }

  public constructor(provider: IRpcProvider) {
    this.provider = provider;
    this.client = createPublicClient({
      cacheTime: 0,
      transport: custom({
        request: (args: { method: string; params?: unknown[] }) => this.rawRequest(args.method, args.params as unknown[]),
      }, { retryCount: 0 }),
    });
  }

  /** One JSON-RPC call on the provider; a JSON-RPC error becomes a viem RpcRequestError. */
  public async rawRequest<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
    const payload = { jsonrpc: '2.0' as const, id: this.nextId++, method, params };
    const rsp: any = await this.provider.request(payload);
    if (rsp && typeof rsp === 'object' && 'jsonrpc' in rsp) {
      if (rsp.error) {
        throw new RpcRequestError({
          body: { method, params },
          error: { code: rsp.error.code, message: rsp.error.message, data: rsp.error.data },
          url: 'rpc',
        });
      }
      return rsp.result as T;
    }
    return rsp as T;
  }

  public getChainId(): Promise<number> {
    return this.client.getChainId();
  }

  public async getBlockNumber(): Promise<number> {
    return Number(await this.client.getBlockNumber({ cacheTime: 0 }));
  }

  public getBalance(address: string, blockTag: EthBlockTag = 'latest'): Promise<bigint> {
    return this.client.getBalance({ address: address as Address, blockTag });
  }

  public getTransactionCount(address: string, blockTag: EthBlockTag = 'latest'): Promise<number> {
    return this.client.getTransactionCount({ address: address as Address, blockTag });
  }

  public getGasPrice(): Promise<bigint> {
    return this.client.getGasPrice();
  }

  public async getCode(address: string): Promise<string> {
    return (await this.client.getCode({ address: address as Address })) || "0x";
  }

  /** eth_call against `latest`; the raw return data. */
  public async call(to: string, data: string): Promise<string> {
    const res = await this.client.call({ to: to as Address, data: data as Hex });
    return res.data || "0x";
  }

  public estimateGas(tx: { from?: string; to: string; data?: string; value?: bigint }): Promise<bigint> {
    return this.client.estimateGas({
      account: tx.from as Address | undefined,
      to: tx.to as Address,
      data: tx.data as Hex | undefined,
      value: tx.value,
    });
  }

  public sendRawTransaction(signedTx: string): Promise<string> {
    return this.client.sendRawTransaction({ serializedTransaction: signedTx as Hex });
  }

  /** The receipt, or null while the transaction is pending. Read raw so lenient node responses still parse. */
  public async getTransactionReceipt(txHash: string): Promise<EthTxReceipt | null> {
    const raw = await this.rawRequest<any>('eth_getTransactionReceipt', [txHash]);
    if (!raw)
      return null;
    return normalizeReceipt(raw);
  }

  /** ENS forward resolution through a Universal Resolver (wildcard and offchain names included). */
  public async getEnsAddress(name: string, universalResolverAddress: string): Promise<string | null> {
    const addr = await this.client.getEnsAddress({
      name: normalize(name),
      universalResolverAddress: universalResolverAddress as Address,
    });
    return addr || null;
  }

  public dispose(): void {
    try {
      const res = this.provider.disconnect?.();
      if (res && typeof (res as Promise<void>).catch === 'function')
        (res as Promise<void>).catch(() => {});
    } catch (ex) {
      // some providers don't support disconnect
    }
  }
}
