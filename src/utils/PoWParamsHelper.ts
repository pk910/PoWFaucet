import { faucetConfig, PoWHashAlgo } from "../common/FaucetConfig";

export function getPoWParamsStr(): string {
  switch(faucetConfig.powHashAlgo) {
    case PoWHashAlgo.SCRYPT:
      return PoWHashAlgo.SCRYPT.toString() +
      "|" + faucetConfig.powScryptParams.cpuAndMemory +
      "|" + faucetConfig.powScryptParams.blockSize +
      "|" + faucetConfig.powScryptParams.parallelization +
      "|" + faucetConfig.powScryptParams.keyLength +
      "|" + faucetConfig.powScryptParams.difficulty;
    case PoWHashAlgo.CRYPTONIGHT:
      return PoWHashAlgo.CRYPTONIGHT.toString() +
      "|" + faucetConfig.powCryptoNightParams.algo +
      "|" + faucetConfig.powCryptoNightParams.variant +
      "|" + faucetConfig.powCryptoNightParams.height +
      "|" + faucetConfig.powCryptoNightParams.difficulty;
    case PoWHashAlgo.ARGON2:
      return PoWHashAlgo.ARGON2.toString() +
      "|" + faucetConfig.powArgon2Params.type +
      "|" + faucetConfig.powArgon2Params.version +
      "|" + faucetConfig.powArgon2Params.timeCost +
      "|" + faucetConfig.powArgon2Params.memoryCost +
      "|" + faucetConfig.powArgon2Params.parallelization +
      "|" + faucetConfig.powArgon2Params.keyLength +
      "|" + faucetConfig.powArgon2Params.difficulty;
  }
}
