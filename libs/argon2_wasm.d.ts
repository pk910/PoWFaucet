
export type Argon2 = (input: string, salt: string, hashlen: number, iterations: number, memory: number, parallelism: number, type: number, version: number) => string;

/* type
* 0: Argon2d 
* 1: Argon2i
* 2: Argon2id
* 10: Argon2u
*/

/* version
* 10: Argon2 v10
* 13: Argon2 v13
*/

export function getArgon2(): Argon2;
export function getArgon2ReadyPromise(): Promise<void>;
