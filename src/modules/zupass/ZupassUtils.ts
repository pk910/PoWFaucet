import { sha256 } from "../../utils/CryptoUtils.js";
import { parse as uuidParse } from "uuid";

/**
 * Encoding of -1 in a Baby Jubjub field element (as p-1).
 */
export const BABY_JUB_NEGATIVE_ONE = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495616"
);

/**
 * Hashes a message to be signed with sha256 and truncates to fit into a
 * baby jub jub field element.  The result includes the top 248 bits of
 * the 256 bit hash.
 *
 * @param signal The initial message.
 * @returns The outputted hash, fed in as a signal to the Semaphore proof.
 */
export function generateSnarkMessageHash(signal: string): bigint {
  // right shift to fit into a field element, which is 254 bits long
  // shift by 8 ensures we have a 253 bit element
  return BigInt("0x" + sha256(signal)) >> BigInt(8);
}

/**
 * Converts a boolean to a bigint value of 0 or 1.
 */
export function booleanToBigInt(v: boolean): bigint {
  return BigInt(v ? 1 : 0);
}

/**
 * Converts a hex number to a bigint.
 */
export function hexToBigInt(v: string): bigint {
  if (!v.startsWith("0x")) {
    v = "0x" + v;
  }

  return BigInt(v);
}

/**
 * Converts a native number to a bigint.
 */
export function numberToBigInt(v: number): bigint {
  return BigInt(v);
}

/**
 * Converts a UUID string into a bigint.
 */
export function uuidToBigInt(v: string): bigint {
  // a uuid is just a particular representation of 16 bytes
  const bytes = uuidParse(v);
  const hex = "0x" + Buffer.from(bytes).toString("hex");
  return BigInt(hex);
}

/**
 * Check if a parameter is defined. If not, it throws an error.
 * @param parameter Parameter to be checked.
 * @param parameterName Name of the parameter.
 */
export function requireDefinedParameter(parameter: any, parameterName: string) {
  if (typeof parameter === "undefined") {
    throw new Error(`${parameterName} must be defined`);
  }
}

