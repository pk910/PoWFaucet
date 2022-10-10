import { faucetConfig, PoWHashAlgo } from "../common/FaucetConfig";

export function getPoWParamsStr(): string {
  switch(faucetConfig.powHashAlgo) {
    case PoWHashAlgo.SCRYPT:
      return PoWHashAlgo.SCRYPT.toString() +
      "|" + faucetConfig.powScryptParams.cpuAndMemory +
      "|" + faucetConfig.powScryptParams.blockSize +
      "|" + faucetConfig.powScryptParams.paralellization +
      "|" + faucetConfig.powScryptParams.keyLength +
      "|" + faucetConfig.powScryptParams.difficulty;
    case PoWHashAlgo.CRYPTONIGHT:
      return PoWHashAlgo.CRYPTONIGHT.toString() +
      "|" + faucetConfig.powCryptoNightParams.algo +
      "|" + faucetConfig.powCryptoNightParams.variant +
      "|" + faucetConfig.powCryptoNightParams.height +
      "|" + faucetConfig.powCryptoNightParams.difficulty;
  }
}
