export enum PoWHashAlgo {
  SCRYPT      = "scrypt",
  CRYPTONIGHT = "cryptonight",
  ARGON2      = "argon2",
}

export type PoWMinerWorkerSrc = {
  [algo in PoWHashAlgo]: string;
};

export let PoWMinerDefaultSrc: PoWMinerWorkerSrc = {
  [PoWHashAlgo.SCRYPT]: "/js/powfaucet-worker-sc.js?" + FAUCET_CLIENT_BUILDTIME,
  [PoWHashAlgo.CRYPTONIGHT]: "/js/powfaucet-worker-cn.js?" + FAUCET_CLIENT_BUILDTIME,
  [PoWHashAlgo.ARGON2]: "/js/powfaucet-worker-a2.js?" + FAUCET_CLIENT_BUILDTIME,
}