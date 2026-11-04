
/*
* yespower 1.0 (Openwall reference implementation), built by faucet-wasm/yespower.
*
* input: hex encoded bytes to hash (at most 128 bytes)
* N:     memory/CPU cost, power of 2 in 1024 ... 524288
* r:     block size, 8 ... 32 (memory per hash: 128 * N * r bytes)
* pers:  personalization string, at most 64 bytes ("" for none)
*
* Returns the 32 byte hash as 64 lowercase hex characters, or a string starting with "!" and the
* reason when the input or parameters are rejected.
*/
export type Yespower = (input: string, N: number, r: number, pers: string) => string;

/*
* "simd":     wasm SIMD build, used when the engine can compile it
* "baseline": build without SIMD instructions
*/
export type YespowerVariant = "simd" | "baseline";

export function getYespower(): Yespower;
export function getYespowerReadyPromise(): Promise<void>;
export function getYespowerVariant(): YespowerVariant;
export function loadYespowerVariant(variant: YespowerVariant): Promise<Yespower>;
