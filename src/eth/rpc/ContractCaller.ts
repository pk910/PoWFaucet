import { Abi, AbiFunction, encodeFunctionData, decodeFunctionResult, decodeEventLog, parseAbi, Hex } from 'viem';
import { EthLog, IEthRpcClient } from "./EthRpcClient.js";

export interface DecodedEventLog {
  eventName: string;
  args: { [name: string]: unknown };
  log: EthLog;
}

/** A JSON ABI (parsed or as the string the config carries) or human-readable signatures. */
export type ContractAbiInput = Abi | readonly unknown[] | string | string[];

export function parseContractAbi(abi: ContractAbiInput): Abi {
  if (typeof abi === 'string') {
    const text = abi.trim();
    if (text.startsWith('['))
      return JSON.parse(text) as Abi;
    return parseAbi([text]);
  }
  if (Array.isArray(abi) && abi.length > 0 && typeof abi[0] === 'string')
    return parseAbi(abi as string[]);
  return abi as Abi;
}

/** Config values arrive as strings; the ABI says what they are. */
export function coerceAbiValue(type: string, value: unknown): unknown {
  if (type.endsWith(']')) {
    const baseType = type.substring(0, type.lastIndexOf('['));
    return Array.isArray(value) ? value.map((v) => coerceAbiValue(baseType, v)) : value;
  }
  if (/^u?int\d*$/.test(type)) {
    if (typeof value === 'string' || typeof value === 'number')
      return BigInt(value);
    return value;
  }
  if (type === 'bool' && typeof value === 'string')
    return value === 'true' || value === '1';
  return value;
}

/**
 * Encode and call functions of one contract by name, the way the refill config and the ERC20
 * handling address them. Replaces web3's Contract for the faucet's needs.
 *
 * `from` is the sender of every eth_call: a contract that answers by msg.sender (a vault's
 * "what may the caller withdraw") sees that account instead of the zero address.
 */
export class ContractCaller {
  public readonly address: string;
  public readonly abi: Abi;
  public readonly from: string | null;
  private client: IEthRpcClient;

  public constructor(client: IEthRpcClient, address: string, abi: ContractAbiInput, from?: string) {
    this.client = client;
    this.address = address;
    this.abi = parseContractAbi(abi);
    this.from = from || null;
  }

  public hasFunction(name: string): boolean {
    return this.abi.some((item) => item.type === 'function' && item.name === name);
  }

  /** The call data for `fn(args)` of any abi, without a client or an address. */
  public static encodeCall(abi: ContractAbiInput, fnName: string, args: unknown[] = []): Hex {
    return new ContractCaller(null, "0x0000000000000000000000000000000000000000", abi).encode(fnName, args);
  }

  private getFunction(name: string, argCount?: number): AbiFunction {
    const candidates = this.abi.filter((item): item is AbiFunction => item.type === 'function' && item.name === name);
    if (candidates.length === 0)
      throw new Error("function '" + name + "' not found in contract abi");
    if (typeof argCount === 'number') {
      const exact = candidates.find((fn) => fn.inputs.length === argCount);
      if (exact)
        return exact;
    }
    return candidates[0];
  }

  /** The call data for `fn(args)`. */
  public encode(fnName: string, args: unknown[] = []): Hex {
    const fn = this.getFunction(fnName, args.length);
    const coerced = fn.inputs.map((input, idx) => coerceAbiValue(input.type, args[idx]));
    return encodeFunctionData({ abi: [fn], functionName: fnName, args: coerced } as any);
  }

  /** The receipt logs this contract's abi can name; logs of other events (or other contracts) are skipped. */
  public decodeLogs(logs: EthLog[]): DecodedEventLog[] {
    let decoded: DecodedEventLog[] = [];
    for (const log of logs) {
      try {
        const event = decodeEventLog({ abi: this.abi, data: log.data as Hex, topics: log.topics as [Hex, ...Hex[]] });
        decoded.push({ eventName: event.eventName, args: (event.args || {}) as { [name: string]: unknown }, log });
      } catch (ex) {
        // not one of ours
      }
    }
    return decoded;
  }

  /** eth_call `fn(args)` as `from` and decode: the single output value, or an array for several outputs. */
  public async call(fnName: string, args: unknown[] = []): Promise<unknown> {
    const fn = this.getFunction(fnName, args.length);
    const data = await this.client.call(this.address, this.encode(fnName, args), this.from || undefined);
    if (!data || data === "0x") {
      if (fn.outputs.length === 0)
        return undefined;
      throw new Error("empty response from " + fnName + "() at " + this.address);
    }
    return decodeFunctionResult({ abi: [fn], functionName: fnName, data: data as Hex } as any);
  }
}
