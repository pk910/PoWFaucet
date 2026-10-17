import { IBaseModuleConfig } from "../BaseModule.js";

/**
 * Ticket proof login: a partner proof minted by an event app (Devcon 8's
 * "partner ticket proofs") is swapped for a faucet login token.
 *
 * The event app signs `keccak256(abi.encode(domain, identifier, tier, partner, event, exp))`
 * with a dedicated key (EIP-191) and sends the attendee to our claim url with the
 * proof in the query string. We verify it against the pinned signer address, nothing
 * else: there is no callback and no api on the event side.
 */
export interface ITicketProofConfig extends IBaseModuleConfig {
  /** the event app's signing address (pinned out of band, never read from the link) */
  signerAddress: string | null;
  /** domain separator baked into every signature */
  domain: string;
  /** wire-format version the proof must carry */
  version: number;
  /** the partner key the event app registered for this faucet; bound into the signature */
  partner: string | null;
  /** accepted event slugs; empty = any event the signer vouches for */
  events: string[];
  /** accepted tiers; empty = any tier */
  tiers: string[];
  /** where the login button sends an attendee to mint a proof (the event app) */
  appUrl: string | null;
  /** name of the event app for the login button */
  appLabel: string | null;
  /** how long a faucet login token stays valid after the proof was swapped (seconds, 0 = forever) */
  tokenValidity: number;
  requireLogin: boolean;
  concurrencyLimit: number;
  grants: ITicketProofGrantConfig[];
  loginLogo: string | null;
  loginLabel: string | null;
  userLabel: string | null;
  infoHtml: string | null;
}

export interface ITicketProofGrantConfig {
  /** only apply this grant to these tiers; empty/undefined = every tier */
  tiers?: string[];
  limitCount: number;
  limitAmount: number;
  duration: number;
  skipModules?: string[];
  rewardFactor?: number;
  overrideMaxDrop?: number;
  required?: boolean;
  message?: string;
}

export const defaultConfig: ITicketProofConfig = {
  enabled: false,
  signerAddress: null,
  domain: "devcon-ticket-proof-v1",
  version: 1,
  partner: null,
  events: [],
  tiers: [],
  appUrl: null,
  appLabel: null,
  tokenValidity: 0,
  requireLogin: false,
  concurrencyLimit: 0,
  grants: [],
  loginLogo: null,
  loginLabel: null,
  userLabel: null,
  infoHtml: null,
}
