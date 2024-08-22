import * as crypto from "crypto";
import { faucetConfig } from "../config/FaucetConfig.js";

export function getHashedIp(remoteAddr: string): string {
  let ipMatch: RegExpExecArray;
  const hashParts: string[] = [];
  let hashGlue: string;
  const secret = faucetConfig.faucetSecret;

  const getHash = (input: string, len?: number) => {
    const hash = crypto.createHash("sha256");
    hash.update(secret + "\r\n");
    hash.update("iphash\r\n");
    hash.update(input);
    let hashStr = hash.digest("hex");
    if (len) hashStr = hashStr.substring(0, len);
    return hashStr;
  };

  let hashBase = "";
  if (
    (ipMatch = /^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/.exec(
      remoteAddr
    ))
  ) {
    // IPv4
    hashGlue = ".";

    for (let i = 0; i < 4; i++) {
      hashParts.push(getHash(hashBase + ipMatch[i + 1], 3));
      hashBase += (hashBase ? "." : "") + ipMatch[i + 1];
    }
  } else {
    // IPv6
    hashGlue = ":";

    const ipSplit = remoteAddr.split(":");
    const ipParts: string[] = [];
    for (let i = 0; i < ipSplit.length; i++) {
      if (ipSplit[i] === "") {
        const skipLen = 8 - ipSplit.length + 1;
        for (let j = 0; j < skipLen; j++) ipParts.push("0");
        break;
      }
      ipParts.push(ipSplit[i]);
    }
    for (let i = 0; i < 8; i++) {
      hashParts.push(
        ipParts[i] === "0" ? "0" : getHash(hashBase + ipParts[i], 3)
      );
      hashBase += (hashBase ? "." : "") + ipParts[i];
    }
  }

  return hashParts.join(hashGlue);
}

export function getHashedSessionId(sessionId: string, secret: string): string {
  const sessionIdHash = crypto.createHash("sha256");
  sessionIdHash.update(secret + "\r\n");
  sessionIdHash.update(sessionId);
  return sessionIdHash.digest("hex").substring(0, 20);
}
