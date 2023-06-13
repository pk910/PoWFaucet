import { IBaseModuleConfig } from "../BaseModule";

export interface IPoWConfig extends IBaseModuleConfig {
  /* PoW parameters */
  powShareReward: number; // reward amount per share (in wei)
  powSessionTimeout: number; // maximum mining session time in seconds
  powIdleTimeout: number; // maximum number of seconds a session can idle until it gets closed
  powPingInterval: number; // websocket ping interval
  powPingTimeout: number; // kill websocket if no ping/pong for that number of seconds
  powHashAlgo: PoWHashAlgo; // hash algorithm to use ("sc" = SCrypt, "cn" = CryptoNight), defaults to SCrypt
  powScryptParams: IPoWSCryptParams; // scrypt parameters
  powCryptoNightParams: IPoWCryptoNightParams; // cryptonight parameters
  powArgon2Params: IPoWArgon2Params; // argon2 parameters
  powNonceCount: number; // number of scrypt hashs to pack into a share (should be low as that just increases verification load on server side)
  powHashrateSoftLimit: number; // maximum allowed mining hashrate (will be throttled to this rate when faster)
  powHashrateHardLimit: number; // maximum allowed mining hashrate (reject shares with nonces that exceet the limit)

  /* PoW-share verification
  Proof of Work shares need to be verified to prevent malicious users from just sending in random numbers.
  As that can lead to a huge verification work load on the server, this faucet can redistribute shares back to other miners for verification.
  These randomly selected miners need to check the share and return its validity to the server within 10 seconds or they're penalized.
  If theres a missmatch in validity-result the share is checked again locally and miners returning a bad verification result are slashed.
  Bad shares always result in a slashing (termination of session and loss of all collected mining balance)
  */
  verifyLocalPercent: number; // percentage of shares validated locally (0 - 100)
  verifyLocalMaxQueue: number; // max number of shares in local validation queue
  verifyMinerPeerCount: number; // min number of mining sessions for verification redistribution - only local verification if not enough active sessions (should be higher than verifyMinerIndividuals)
  verifyLocalLowPeerPercent: number; // percentage of shares validated locally if there are not enough sessions for verification redistribution (0 - 100)
  verifyMinerPercent: number; // percentage of shares to redistribute to miners for verification (0 - 100)
  verifyMinerIndividuals: number; // number of other mining sessions to redistribute a share to for verification
  verifyMinerMaxPending: number; // max number of pending verifications per miner before not sending any more verification requests
  verifyMinerMaxMissed: number; // max number of missed verifications before not sending any more verification requests
  verifyMinerTimeout: number; // timeout for verification requests (client gets penalized if not responding within this timespan)
  verifyMinerRewardPerc: number; // percent of powShareReward as reward for responding to a verification request in time
  verifyMinerMissPenaltyPerc: number; // percent of powShareReward as penalty for not responding to a verification request (shouldn't be too high as this can happen regularily in case of connection loss or so)

  concurrentSessions: number; // number of concurrent mining sessions allowed per IP (0 = unlimited)
}

export enum PoWHashAlgo {
  SCRYPT      = "scrypt",
  CRYPTONIGHT = "cryptonight",
  ARGON2      = "argon2",
}

export interface IPoWSCryptParams {
  cpuAndMemory: number; // N - iterations count (affects memory and CPU usage, must be a power of 2)
  blockSize: number; // r - block size (affects memory and CPU usage)
  parallelization: number; // p - parallelism factor (threads to run in parallel, affects the memory, CPU usage), should be 1 as webworker is single threaded
  keyLength: number; // klen - how many bytes to generate as output, e.g. 16 bytes (128 bits)
  difficulty: number; // number of 0-bits the scrypt hash needs to start with to be egliable for a reward
}

export interface IPoWCryptoNightParams {
  algo: number;
  variant: number;
  height: number;
  difficulty: number; // number of 0-bits the scrypt hash needs to start with to be egliable for a reward
}

export interface IPoWArgon2Params {
  type: number;
  version: number;
  timeCost: number; // time cost (iterations), default: 1
  memoryCost: number; // memory size
  parallelization: number; // parallelism factor (threads to run in parallel, affects the memory, CPU usage), should be 1 as webworker is single threaded
  keyLength: number; // how many bytes to generate as output, e.g. 16 bytes (128 bits)
  difficulty: number; // number of 0-bits the scrypt hash needs to start with to be egliable for a reward
}

export type PoWCryptoParams = IPoWSCryptParams | IPoWCryptoNightParams | IPoWArgon2Params;

export const defaultConfig: IPoWConfig = {
  enabled: false,
  powShareReward: 0,
  powSessionTimeout: 7200,
  powIdleTimeout: 1800,
  powPingInterval: 60,
  powPingTimeout: 120,
  powHashAlgo: PoWHashAlgo.ARGON2,
  powScryptParams: {
    cpuAndMemory: 4096,
    blockSize: 8,
    parallelization: 1,
    keyLength: 16,
    difficulty: 11,
  },
  powCryptoNightParams: {
    algo: 0,
    variant: 0,
    height: 0,
    difficulty: 11,
  },
  powArgon2Params: {
    type: 0,
    version: 13,
    timeCost: 4,
    memoryCost: 4096,
    parallelization: 1,
    keyLength: 16,
    difficulty: 11,
  },
  powNonceCount: 1,
  powHashrateSoftLimit: 0,
  powHashrateHardLimit: 0,
  verifyLocalPercent: 10,
  verifyLocalMaxQueue: 100,
  verifyMinerPeerCount: 4,
  verifyLocalLowPeerPercent: 20,
  verifyMinerPercent: 50,
  verifyMinerIndividuals: 2,
  verifyMinerMaxPending: 3,
  verifyMinerMaxMissed: 5,
  verifyMinerTimeout: 20,
  verifyMinerRewardPerc: 15,
  verifyMinerMissPenaltyPerc: 10,
  concurrentSessions: 0,
}
