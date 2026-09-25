import * as crypto from "crypto";

export function getHashedIp(remoteAddr: string, secret: string): string {
  let ipMatch: RegExpExecArray;
  let hashParts: string[] = [];
  let hashGlue: string;
  let getHash = (input: string, len?: number) => {
    let hash = crypto.createHash("sha256");
    hash.update(secret + "\r\n");
    hash.update("iphash\r\n");
    hash.update(input);
    let hashStr = hash.digest("hex");
    if(len)
      hashStr = hashStr.substring(0, len);
    return hashStr;
  };

  let hashBase = "";
  if((ipMatch = /^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/.exec(remoteAddr))) {
    // IPv4
    hashGlue = ".";

    for(let i = 0; i < 4; i++) {
      hashParts.push(getHash(hashBase + ipMatch[i+1], 3));
      hashBase += (hashBase ? "." : "") + ipMatch[i+1];
    }
  }
  else {
    // IPv6
    hashGlue = ":";

    let ipSplit = remoteAddr.split(":");
    let ipParts: string[] = [];
    for(let i = 0; i < ipSplit.length; i++) {
      if(ipSplit[i] === "") {
        let skipLen = 8 - ipSplit.length + 1;
        for(let j = 0; j < skipLen; j++)
          ipParts.push("0");
        break;
      }
      ipParts.push(ipSplit[i]);
    }
    for(let i = 0; i < 8; i++) {
      hashParts.push(ipParts[i] === "0" ? "0" : getHash(hashBase + ipParts[i], 3));
      hashBase += (hashBase ? "." : "") + ipParts[i];
    }
  }

  return hashParts.join(hashGlue);
}

/**
 * How much of the address hash is kept, in hex characters.
 *
 * `getHashedIp` keeps **3** per part, which is right for an octet - 256 values into 4,096 buckets - and
 * the first spec for this asked for "one IP-part's worth". An address is not an octet: 3 hex characters
 * is 4,096 buckets for the whole address space, and hashing a thousand distinct addresses gave 886
 * distinct hashes with **214 of those addresses sharing a hash with a stranger**. For a key whose
 * question is "have I seen this address before", a collision is a false link between unrelated players -
 * the expensive direction of wrong.
 *
 * So it keeps **20**, like `getHashedSessionId`: 80 bits, which collides on the order of once in a
 * million million million pairs. The master settled it with the numbers above.
 */
export const HASHED_ADDR_LENGTH = 20;

/**
 * The target address, salted with the faucet secret, for a detector that must correlate without
 * seeing it.
 *
 * Lower-cased first, because the same address arrives checksummed from one client and flat from the
 * next and two spellings of one address must not hash apart. No `"addrhash\r\n"` domain tag: the spec
 * is `secret + "\r\n" + addr.toLowerCase()`, which is `getHashedSessionId`'s shape rather than
 * `getHashedIp`'s, so an address and a session id of the same text would hash alike - they never are
 * (one is `0x`-prefixed hex of 40 digits, the other a uuid), and the tag is not mine to add without
 * the host agreeing, since it changes the bytes on both sides of the wire.
 */
export function getHashedAddr(addr: string, secret: string): string {
  // An empty address is not a player, and hashing it would be worse than refusing: the result is a
  // perfectly valid-looking 20-hex key that every address-less session shares, so a detector keying
  // on it sees one player doing everything - which is the exact failure this field exists to
  // prevent, dressed as data. Absent stays absent all the way to the wire, where the field is
  // omitted.
  if(!addr || !addr.trim())
    return "";
  let hash = crypto.createHash("sha256");
  hash.update(secret + "\r\n");
  hash.update(addr.toLowerCase());
  return hash.digest("hex").substring(0, HASHED_ADDR_LENGTH);
}

export function getHashedSessionId(sessionId: string, secret: string): string {
  let sessionIdHash = crypto.createHash("sha256");
  sessionIdHash.update(secret + "\r\n");
  sessionIdHash.update(sessionId);
  return sessionIdHash.digest("hex").substring(0, 20);
}

