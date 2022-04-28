import { PoWCryptoParams, PoWHashAlgo } from "../common/FaucetConfig";

export interface IPoWValidatorValidateRequest {
  shareId: string;
  nonces: number[];
  preimage: string;
  algo: PoWHashAlgo;
  params: PoWCryptoParams;
}