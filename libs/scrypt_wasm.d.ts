
export type Scrypt = (password: string, salt: string, n: number, r: number, p: number, dklen: number) => string;

export function getScrypt(): Scrypt;
export function getScryptReadyPromise(): Promise<void>;
