import { PoWHashAlgo, PoWParams } from "../common/FaucetConfig";

export function getPoWParamsStr(params: PoWParams): string {
  switch(params.a) {
    case PoWHashAlgo.SCRYPT:
      return params.a+"|"+params.n + "|" + params.r + "|" + params.p + "|" + params.l + "|" + params.d;
    case PoWHashAlgo.CRYPTONIGHT:
      return params.a+"|"+params.c + "|" + params.v + "|" + params.h + "|" + params.d;
    case PoWHashAlgo.ARGON2:
      return params.a+"|"+params.t + "|" + params.v + "|" + params.i + "|" + params.m + "|" + params.p + "|" + params.l + "|" + params.d;
  }
}
