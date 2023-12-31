import { PoWCryptoParams, PoWHashAlgo } from "../PoWConfig.js";

export interface IPoWValidatorValidateRequest {
  shareId: string;
  nonces: number[];
  preimage: string;
  algo: PoWHashAlgo;
  params: PoWCryptoParams;
  difficulty: number;
}