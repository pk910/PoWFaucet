import { encodeAbiParameters, parseAbiParameters, keccak256, recoverMessageAddress, Hex } from "../../eth/rpc/index.js";

/**
 * A partner ticket proof as the event app puts it into the claim url.
 *
 * Wire format (query string): v, id, tier, partner, event, exp, sig.
 * See efdevcon/monorepo event-app/docs/ticket-proofs.md.
 */
export interface ITicketProof {
  version: number;
  /** stable per-ticket pseudonym, scoped to (event, partner) by the issuer */
  identifier: string;
  tier: string;
  partner: string;
  /** pretix event slug */
  event: string;
  /** unix seconds */
  exp: number;
  /** EIP-191 signature over the payload hash */
  signature: string;
}

export interface ITicketProofVerifyOptions {
  signerAddress: string;
  domain: string;
  version: number;
  partner: string;
  events: string[];
  tiers: string[];
  /** unix seconds; defaults to now */
  now?: number;
}

export type TicketProofVerdict =
  | { valid: true }
  | { valid: false; code: string; reason: string };

const PROOF_ABI_PARAMS = parseAbiParameters("string, bytes32, string, string, string, uint64");

/**
 * Read a proof out of the query parameters. Returns null when a field is missing or
 * has the wrong shape; the signature check decides everything else.
 */
export function parseTicketProof(params: {[key: string]: unknown}): ITicketProof | null {
  let read = (key: string): string | null => {
    let value = params[key];
    if(Array.isArray(value))
      value = value[0];
    if(typeof value === "number")
      return value.toString();
    if(typeof value !== "string" || value === "")
      return null;
    return value;
  };

  let version = read("v");
  let identifier = read("id");
  let tier = read("tier");
  let partner = read("partner");
  let event = read("event");
  let exp = read("exp");
  let signature = read("sig");
  if(!version || !identifier || !tier || !partner || !event || !exp || !signature)
    return null;
  if(!/^[0-9]+$/.test(version) || !/^[0-9]+$/.test(exp))
    return null;
  if(!/^0x[0-9a-fA-F]{64}$/.test(identifier))
    return null;
  if(!/^0x[0-9a-fA-F]{130}$/.test(signature))
    return null;

  return {
    version: parseInt(version, 10),
    identifier: identifier.toLowerCase(),
    tier: tier,
    partner: partner,
    event: event,
    exp: parseInt(exp, 10),
    signature: signature,
  };
}

/**
 * The hash the issuer signed: abi.encode (length prefixed, not packed), so the digest is
 * the same one a contract would rebuild with `abi.encode` and `ecrecover`.
 */
export function ticketProofPayloadHash(domain: string, proof: ITicketProof): string {
  let encoded = encodeAbiParameters(PROOF_ABI_PARAMS, [
    domain,
    proof.identifier as Hex,
    proof.tier,
    proof.partner,
    proof.event,
    BigInt(proof.exp),
  ]);
  return keccak256(encoded);
}

/**
 * Recover the EIP-191 signer of a proof; null when the signature does not parse.
 * The signed message is the 32 hash bytes themselves (prefix "\x19Ethereum Signed Message:\n32").
 */
export async function recoverTicketProofSigner(domain: string, proof: ITicketProof): Promise<string | null> {
  try {
    let hash = ticketProofPayloadHash(domain, proof);
    return await recoverMessageAddress({ message: { raw: hash as Hex }, signature: proof.signature as Hex });
  } catch(ex) {
    return null;
  }
}

/**
 * Verify a proof against the pinned signer and the faucet's own expectations.
 *
 * The signer is the whole point: a proof that carried its own signer address would
 * only prove it is internally consistent. Partner and event are checked because the
 * identifier is scoped to them by the issuer, so a proof minted for another partner
 * is a different pseudonym for the same ticket.
 */
export async function verifyTicketProof(proof: ITicketProof, options: ITicketProofVerifyOptions): Promise<TicketProofVerdict> {
  if(proof.version !== options.version)
    return { valid: false, code: "PROOF_VERSION", reason: "Unsupported proof version " + proof.version };
  if(proof.partner.toLowerCase() !== options.partner.toLowerCase())
    return { valid: false, code: "PROOF_PARTNER", reason: "This proof was issued for another partner" };
  if(options.events.length > 0 && options.events.indexOf(proof.event) === -1)
    return { valid: false, code: "PROOF_EVENT", reason: "This proof was issued for another event" };
  if(options.tiers.length > 0 && options.tiers.indexOf(proof.tier) === -1)
    return { valid: false, code: "PROOF_TIER", reason: "This ticket tier is not eligible" };

  let now = typeof options.now === "number" ? options.now : Math.floor(Date.now() / 1000);
  if(proof.exp < now)
    return { valid: false, code: "PROOF_EXPIRED", reason: "This proof has expired, please request a new one in the event app" };

  let signer = await recoverTicketProofSigner(options.domain, proof);
  if(!signer)
    return { valid: false, code: "PROOF_SIGNATURE", reason: "Malformed proof signature" };
  if(signer.toLowerCase() !== options.signerAddress.toLowerCase())
    return { valid: false, code: "PROOF_SIGNATURE", reason: "Proof signature does not match the event's signer" };

  return { valid: true };
}
