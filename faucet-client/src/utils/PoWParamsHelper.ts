import { PoWHashAlgo, PoWParams } from "../common/FaucetConfig";

export function getPoWParamsStr(params: PoWParams, difficulty: number): string {
  switch(params.a) {
    case PoWHashAlgo.SCRYPT:
      return params.a+"|"+params.n + "|" + params.r + "|" + params.p + "|" + params.l + "|" + difficulty;
    case PoWHashAlgo.CRYPTONIGHT:
      return params.a+"|"+params.c + "|" + params.v + "|" + params.h + "|" + difficulty;
    case PoWHashAlgo.ARGON2:
      return params.a+"|"+params.t + "|" + params.v + "|" + params.i + "|" + params.m + "|" + params.p + "|" + params.l + "|" + difficulty;
  }
}
