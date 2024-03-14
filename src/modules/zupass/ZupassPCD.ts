import assert from 'node:assert';
import { Worker } from "node:worker_threads";
import JSONBig from "json-bigint";

import { faucetConfig } from "../../config/FaucetConfig.js";
import { decryptStr, encryptStr } from "../../utils/CryptoUtils.js";
import { ZupassModule } from "./ZupassModule.js";
import { BABY_JUB_NEGATIVE_ONE, booleanToBigInt, generateSnarkMessageHash, hexToBigInt, numberToBigInt, requireDefinedParameter, uuidToBigInt } from './ZupassUtils.js';
import { PromiseDfd } from "../../utils/PromiseDfd.js";
import { ServiceManager } from "../../common/ServiceManager.js";
import { FaucetWorkers } from "../../common/FaucetWorker.js";


/**
 * Max supported size of validEventIds field in ZKEdDSAEventTicketPCDArgs.
 */
export const VALID_EVENT_IDS_MAX_LEN = 20;

export const STATIC_TICKET_PCD_NULLIFIER = generateSnarkMessageHash(
  "dummy-nullifier-for-eddsa-event-ticket-pcds"
);

export type NumericString = `${number}` | string;
export type SignalValueType = NumericString | number | bigint | SignalValueType[];
export interface CircuitSignals {
    [signal: string]: SignalValueType;
}
export interface Groth16Proof {
    pi_a: NumericString[];
    pi_b: NumericString[][];
    pi_c: NumericString[];
    protocol: string;
    curve: string;
}

/**
 * An EdDSA public key is represented as a point on the elliptic curve, with each point being
 * a pair of coordinates consisting of hexadecimal strings. The public key is maintained in a standard
 * format and is internally converted to and from the Montgomery format as needed.
 */
export type EdDSAPublicKey = [string, string];

export enum TicketCategory {
  ZuConnect = 0,
  Devconnect = 1,
  PcdWorkingGroup = 2,
  Zuzalu = 3
}

export interface ITicketData {
  // The fields below are not signed and are used for display purposes.
  attendeeName: string;
  attendeeEmail: string;
  eventName: string;
  ticketName: string;
  checkerEmail: string | undefined;
  // The fields below are signed using the passport-server's private EdDSA key
  // and can be used by 3rd parties to represent their own tickets.
  ticketId: string; // The ticket ID is a unique identifier of the ticket.
  eventId: string; // The event ID uniquely identifies an event.
  productId: string; // The product ID uniquely identifies the type of ticket (e.g. General Admission, Volunteer etc.).
  timestampConsumed: number;
  timestampSigned: number;
  attendeeSemaphoreId: string;
  isConsumed: boolean;
  isRevoked: boolean;
  ticketCategory: TicketCategory;
}

export const ZKEdDSAEventTicketPCDTypeName = "zk-eddsa-event-ticket-pcd";


export interface PCD<C = unknown, P = unknown> {
  /**
   * Uniquely identifies this instance. Zupass cannot have more than one
   * {@link PCD} with the same id. In practice this is often a UUID generated
   * by the {@link PCDPackage#prove} function.
   */
  id: string;

  /**
   * Refers to {@link PCDPackage#name} - each {@link PCD} must come from a
   * particular {@link PCDPackage}. By convention, this is a string like
   * `'semaphore-identity-pcd'`, or `'rsa-ticket-pcd'`. These type names
   * are intended to be globally unique - i.e. no two distinct PCD types
   * should have the same type name.
   */
  type: string;

  /**
   * Information encoded in this PCD that is intended to be consumed by the
   * business logic of some application. For example, a type of PCD that could
   * exist is one that is able to prove that its creator knows the prime factorization
   * of a really big number. In that case, the really big number would be the claim,
   * and a ZK proof of its prime factorization would go in the {@link PCD#proof}.
   *
   */
  claim: C;

  /**
   * A cryptographic or mathematical proof of the {@link PCD#claim}.
   */
  proof: P;
}

/**
 * Claim part of a ZKEdDSAEventTicketPCD contains all public/revealed fields.
 */
export interface ZKEdDSAEventTicketPCDClaim {
  partialTicket: Partial<ITicketData>;
  watermark: string;
  signer: EdDSAPublicKey;

  // only if requested in PCDArgs
  validEventIds?: string[];
  externalNullifier?: string;
  nullifierHash?: string;
}

/**
 * ZKEdDSAEventTicketPCD PCD type representation.
 */
export class ZKEdDSAEventTicketPCD
  implements PCD<ZKEdDSAEventTicketPCDClaim, Groth16Proof>
{
  type = ZKEdDSAEventTicketPCDTypeName;

  public constructor(
    readonly id: string,
    readonly claim: ZKEdDSAEventTicketPCDClaim,
    readonly proof: Groth16Proof
  ) {
    this.id = id;
    this.claim = claim;
    this.proof = proof;
  }
}


export interface IZupassPDCData {
  ticketId: string;
  productId: string;
  eventId: string;
  attendeeId: string;
  token: string;
}

export interface IZupassVerifyRequest {
  reqId: number;
  publicSignals: string[];
  proof: any;
}

export class ZupassPCD {
  private module: ZupassModule;
  private worker: Worker;
  private readyDfd: PromiseDfd<void>;
  private verifyQueue: {[reqId: number]: PromiseDfd<boolean>} = {};
  private verifyIdCounter = 1;

  public constructor(module: ZupassModule, worker?: Worker) {
    this.module = module;

    this.readyDfd = new PromiseDfd<void>();
    this.worker = worker || ServiceManager.GetService(FaucetWorkers).createWorker("zupass-worker");
    this.worker.on("message", (msg) => this.onWorkerMessage(msg))
  }

  public parseTicket(pcdData: string): ZKEdDSAEventTicketPCD {
    const { id, claim, proof } = JSONBig({ useNativeBigInt: true }).parse(pcdData);
  
    requireDefinedParameter(id, "id");
    requireDefinedParameter(claim, "claim");
    requireDefinedParameter(proof, "proof");
  
    return new ZKEdDSAEventTicketPCD(id, claim, proof);
  }

  /**
   * Convert a list of valid event IDs from input format (variable-length list
   * of UUID strings) to snark signal format (fixed-length list of bigint
   * strings).  The result always has length VALID_EVENT_IDS_MAX_LEN with
   * unused fields are filled in with a value of BABY_JUB_NEGATIVE_ONE.
   */
  private snarkInputForValidEventIds(validEventIds: string[]): string[] {
    const snarkIds = new Array<string>(VALID_EVENT_IDS_MAX_LEN);
    let i = 0;
    for (const validId of validEventIds) {
      snarkIds[i] = uuidToBigInt(validId).toString();
      ++i;
    }
    for (; i < VALID_EVENT_IDS_MAX_LEN; ++i) {
      snarkIds[i] = BABY_JUB_NEGATIVE_ONE.toString();
    }
    return snarkIds;
  }

  private publicSignalsFromClaim(claim: ZKEdDSAEventTicketPCDClaim): string[] {
    const t = claim.partialTicket;
    const ret: string[] = [];
  
    const negOne = BABY_JUB_NEGATIVE_ONE.toString();
  
    // Outputs appear in public signals first
    ret.push(
      t.ticketId === undefined ? negOne : uuidToBigInt(t.ticketId).toString()
    );
    ret.push(
      t.eventId === undefined ? negOne : uuidToBigInt(t.eventId).toString()
    );
    ret.push(
      t.productId === undefined ? negOne : uuidToBigInt(t.productId).toString()
    );
    ret.push(
      t.timestampConsumed === undefined ? negOne : t.timestampConsumed.toString()
    );
    ret.push(
      t.timestampSigned === undefined ? negOne : t.timestampSigned.toString()
    );
    ret.push(t.attendeeSemaphoreId || negOne);
    ret.push(
      t.isConsumed === undefined
        ? negOne
        : booleanToBigInt(t.isConsumed).toString()
    );
    ret.push(
      t.isRevoked === undefined ? negOne : booleanToBigInt(t.isRevoked).toString()
    );
    ret.push(
      t.ticketCategory === undefined
        ? negOne
        : numberToBigInt(t.ticketCategory).toString()
    );
    // Placeholder for reserved fields
    ret.push(negOne, negOne, negOne);
    ret.push(claim.nullifierHash || negOne);
  
    // Public inputs appear in public signals in declaration order
    ret.push(hexToBigInt(claim.signer[0]).toString());
    ret.push(hexToBigInt(claim.signer[1]).toString());
  
    for (const eventId of this.snarkInputForValidEventIds(claim.validEventIds || [])) {
      ret.push(eventId);
    }
    ret.push(claim.validEventIds !== undefined ? "1" : "0"); // checkValidEventIds
  
    ret.push(
      claim.externalNullifier?.toString() ||
        STATIC_TICKET_PCD_NULLIFIER.toString()
    );
  
    ret.push(claim.watermark);
  
    return ret;
  }

  public async verifyTicket(pcd: ZKEdDSAEventTicketPCD): Promise<boolean> {
    let resDfd = new PromiseDfd<boolean>();
    let req: IZupassVerifyRequest = {
      reqId: this.verifyIdCounter++,
      publicSignals: this.publicSignalsFromClaim(pcd.claim),
      proof: pcd.proof,
    };
    this.verifyQueue[req.reqId] = resDfd;
    this.readyDfd.promise.then(() => {
      this.worker.postMessage({
        action: "verify",
        data: req
      });
    });

    return resDfd.promise;
  }

  private onWorkerMessage(msg: any) {
    assert.equal(msg && (typeof msg === "object"), true);

    switch(msg.action) {
      case "init":
        this.readyDfd.resolve();
        break;
      case "verified":
        this.onWorkerVerified(msg.data);
        break;
    }
  }

  private onWorkerVerified(msg: any) {
    assert.equal(this.verifyQueue.hasOwnProperty(msg.reqId), true);
    
    let resDfd = this.verifyQueue[msg.reqId];
    delete this.verifyQueue[msg.reqId];

    resDfd.resolve(msg.isValid);
  }

  public getTicketData(pcd: ZKEdDSAEventTicketPCD): IZupassPDCData {
    let ticketData: IZupassPDCData = {
      ticketId: pcd.claim.partialTicket.ticketId || "",
      productId: pcd.claim.partialTicket.productId || "",
      eventId: pcd.claim.partialTicket.eventId || "",
      attendeeId: pcd.claim.partialTicket.attendeeSemaphoreId || "",
      token: "",
    };
    ticketData.token = this.generateFaucetToken(ticketData);
    return ticketData;
  }

  private getTokenPassphrase() {
    return faucetConfig.faucetSecret + "-" + this.module.getModuleName() + "-authtoken";
  }

  public generateFaucetToken(pcdData: IZupassPDCData): string {
    return encryptStr([
      this.module.getModuleName(),
      pcdData.ticketId,
      pcdData.productId,
      pcdData.eventId,
      pcdData.attendeeId,
    ].join("\n"), this.getTokenPassphrase());
  }

  public parseFaucetToken(faucetToken: string): IZupassPDCData | null {
    let tokenData = decryptStr(faucetToken, this.getTokenPassphrase())?.split("\n") || [];
    if(tokenData.length !== 5)
      return null;
    if(tokenData[0] !== this.module.getModuleName())
      return null;
    return {
      ticketId: tokenData[1],
      productId: tokenData[2],
      eventId: tokenData[3],
      attendeeId: tokenData[4],
      token: faucetToken,
    };
  }

}
