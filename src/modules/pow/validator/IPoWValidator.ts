import { PoWCryptoParams, PoWHashAlgo } from "../PoWConfig";

export interface IPoWValidatorValidateRequest {
  shareId: string;
  nonces: number[];
  preimage: string;
  algo: PoWHashAlgo;
  params: PoWCryptoParams;
}