
interface NickMiner {
    miner_init(): void;
    miner_set_config(inputHash: string, sigR: string, sigV: number, suffixMask: string, prefixMask: string, rounds: number, preimage: string): void;
    miner_run(nonce: string): string;
}

export function getNickMiner(): NickMiner;
export function getNickMinerReadyPromise(): Promise<void>;
