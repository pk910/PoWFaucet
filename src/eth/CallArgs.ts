import { keccak256, Hex } from './rpc/index.js';
import { EthClaimInfo } from './EthClaimManager.js';

/**
 * What a config-driven contract call may refer to. The refill contract and the claim transaction
 * templates share this: an operator writes `{amount}` in the config, the faucet fills it in.
 */
export interface CallArgContext {
  /** the faucet wallet */
  walletAddr: string;
  /** the ERC20 the faucet pays out, null for the native coin */
  token: string | null;
  /** `{amount}` when no claims are given (refill: the requested amount) */
  amount?: string;
  /** the claims a transaction pays; `{amount}`/`{target}` read the first one, `{amounts[]}` all */
  claims?: EthClaimInfo[];
}

const PLACEHOLDER = /^\{([a-zA-Z0-9_.]+)(\[\])?\}$/;

function sessionHash(claim: EthClaimInfo): string {
  return keccak256(("0x" + Buffer.from(claim.session, "utf8").toString("hex")) as Hex);
}

function sessionValue(claim: EthClaimInfo, key: string): unknown {
  let value = claim.data ? claim.data[key] : undefined;
  if(value === undefined || value === null)
    throw new Error("claim " + claim.session + " has no session data '" + key + "' for the transaction template");
  return value;
}

/** One claim's value for a placeholder name, or undefined when the name is not per-claim. */
function claimValue(name: string, claim: EthClaimInfo): unknown {
  switch(name) {
    case "target":
      return claim.target;
    case "amount":
      return claim.amount;
    case "sessionId":
      return claim.session;
    case "sessionHash":
      return sessionHash(claim);
  }
  if(name.startsWith("session."))
    return sessionValue(claim, name.substring("session.".length));
  return undefined;
}

/**
 * Resolve one argument. Placeholders are whole-string matches, as in the refill config:
 *   {walletAddr} {token}                      the faucet's own addresses
 *   {amount} {target} {sessionId} {sessionHash} {session.<key>}   the (first) claim
 *   {amounts[]} {targets[]} {sessionIds[]} {sessionHashes[]} {session.<key>[]}   one per claim
 *   {sum}                                     the claims' amounts added up
 * Anything else is passed through untouched (the ABI type decides how it is encoded).
 */
export function resolveCallArg(arg: unknown, ctx: CallArgContext): unknown {
  if(typeof arg !== "string")
    return arg;
  let match = PLACEHOLDER.exec(arg);
  if(!match)
    return arg;
  let name = match[1];
  let isList = !!match[2];
  let claims = ctx.claims || [];

  if(isList) {
    // plural spellings for readability; the singular is accepted too
    let singular = name.replace(/^(amounts|targets|sessionIds|sessionHashes)$/, (m) => ({
      amounts: "amount", targets: "target", sessionIds: "sessionId", sessionHashes: "sessionHash",
    } as {[key: string]: string})[m]);
    return claims.map((claim) => {
      let value = claimValue(singular, claim);
      if(value === undefined)
        throw new Error("unknown list placeholder " + arg);
      return value;
    });
  }

  switch(name) {
    case "walletAddr":
      return ctx.walletAddr;
    case "token":
      if(!ctx.token)
        throw new Error("{token} used in a transaction template, but the faucet pays the native coin");
      return ctx.token;
    case "sum":
      return claims.reduce((sum, claim) => sum + BigInt(claim.amount), 0n).toString();
    case "amount":
      if(claims.length === 0)
        return ctx.amount;
      break;
  }
  if(claims.length > 0) {
    let value = claimValue(name, claims[0]);
    if(value !== undefined)
      return value;
  }
  throw new Error("unknown placeholder " + arg);
}

export function resolveCallArgs(args: unknown[], ctx: CallArgContext): unknown[] {
  return (args || []).map((arg) => resolveCallArg(arg, ctx));
}
