import { faucetConfig } from "../../config/FaucetConfig.js";
import { decryptStr, encryptStr, sha256 } from "../../utils/CryptoUtils.js";

/**
 * What the faucet keeps of a verified proof.
 *
 * The proof itself expires 30 minutes after minting, which suits a one-shot perk but
 * not a faucet used all week. So the proof is swapped once for this token, which the
 * client stores and sends with every session start. Nothing in it identifies the
 * attendee: the identifier is the issuer's salted pseudonym.
 */
export interface ITicketProofData {
  identifier: string;
  tier: string;
  event: string;
  /** unix seconds the proof was swapped */
  issuedAt: number;
  token: string;
}

export class TicketProofToken {
  private moduleName: string;

  public constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  private getPassphrase(): string {
    return faucetConfig.faucetSecret + "-" + this.moduleName + "-authtoken";
  }

  private checksum(fields: string[]): string {
    return sha256(this.getPassphrase() + "\n" + fields.join("\n")).substring(0, 32);
  }

  public generate(data: Omit<ITicketProofData, "token">): string {
    let fields = [
      this.moduleName,
      data.identifier,
      data.tier,
      data.event,
      data.issuedAt.toString(),
    ];
    // encryptStr is unauthenticated aes-cbc; the checksum rejects a token that
    // decrypted to something, just not what was issued.
    fields.push(this.checksum(fields));
    return encryptStr(fields.join("\n"), this.getPassphrase());
  }

  public parse(token: string): ITicketProofData | null {
    let fields: string[];
    try {
      fields = decryptStr(token, this.getPassphrase())?.split("\n") || [];
    } catch(ex) {
      return null;
    }
    if(fields.length !== 6)
      return null;
    if(fields[0] !== this.moduleName)
      return null;
    if(fields[5] !== this.checksum(fields.slice(0, 5)))
      return null;
    let issuedAt = parseInt(fields[4], 10);
    if(!Number.isFinite(issuedAt))
      return null;
    return {
      identifier: fields[1],
      tier: fields[2],
      event: fields[3],
      issuedAt: issuedAt,
      token: token,
    };
  }
}
