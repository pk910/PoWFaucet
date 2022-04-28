import { PoWHashAlgo, PoWParams } from "../common/IFaucetConfig";

export function getPoWParamsStr(params: PoWParams): string {
  switch(params.a) {
    case PoWHashAlgo.SCRYPT:
      return params.a+"|"+params.n + "|" + params.r + "|" + params.p + "|" + params.l + "|" + params.d;
    case PoWHashAlgo.CRYPTONIGHT:
      return params.a+"|"+params.c + "|" + params.v + "|" + params.h + "|" + params.d;
  }
}
