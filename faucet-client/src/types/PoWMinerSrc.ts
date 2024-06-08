import { joinUrl } from "../utils/QueryUtils";

export enum PoWHashAlgo {
  SCRYPT      = "scrypt",
  CRYPTONIGHT = "cryptonight",
  ARGON2      = "argon2",
}

export type PoWMinerWorkerSrc = {
  [algo in PoWHashAlgo]: string;
};

export function getPoWMinerDefaultSrc(baseUrl: string): PoWMinerWorkerSrc {
  return {
    [PoWHashAlgo.SCRYPT]: joinUrl(baseUrl, "/js/powfaucet-worker-sc.js?" + FAUCET_CLIENT_BUILDTIME),
    [PoWHashAlgo.CRYPTONIGHT]: joinUrl(baseUrl, "/js/powfaucet-worker-cn.js?" + FAUCET_CLIENT_BUILDTIME),
    [PoWHashAlgo.ARGON2]: joinUrl(baseUrl, "/js/powfaucet-worker-a2.js?" + FAUCET_CLIENT_BUILDTIME),
  };
}