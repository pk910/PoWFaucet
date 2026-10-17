/**
 * The faucet's Ethereum layer. Everything that touches viem lives in this directory; the rest of
 * the code imports from here, so a library change stays inside src/eth/rpc.
 */
export * from './EthRpcClient.js';
export * from './ContractCaller.js';
export * from './EthSigner.js';
export * from './redact.js';
export { encodeAbiParameters, parseAbiParameters, keccak256, recoverMessageAddress, isAddress, getAddress, getCreate2Address } from 'viem';
export type { Hex, Address } from 'viem';
export { namehash, normalize } from 'viem/ens';
