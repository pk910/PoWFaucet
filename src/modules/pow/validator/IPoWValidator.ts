import { PoWCryptoParams, PoWHashAlgo } from "../PoWConfig.js";

export interface IPoWValidatorValidateRequest {
  shareId: string;
  nonce: number;
  data: string;
  preimage: string;
  algo: PoWHashAlgo;
  params: PoWCryptoParams;
  difficulty: number;
}