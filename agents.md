# PoWFaucet Agent Guide

A step-by-step guide for LLM agents to obtain testnet ETH programmatically.
Zero browser, zero WebSocket, zero captcha.

## Prerequisites

- A target address (`0x...`, 40 hex chars)
- The faucet base URL (e.g. `https://hoodi-faucet.pk910.de`)
- Ability to compute scrypt / argon2 hashes (most runtimes support this)

## Step 1: Start a session

```http
POST {baseUrl}/api/startSession
Content-Type: application/json

{"addr": "0xYourTargetAddressHere"}
```

**Expected response**:
```json
{
  "session": "a1b2c3d4-...",
  "status": "running",
  "balance": "0",
  "target": "0xYourTargetAddressHere",
  "modules": {
    "pow": { "preImage": "YmFzZTY0IHByZWltYWdl" }
  }
}
```

Extract `session` and `modules.pow.preImage`.

If the response has `failedCode` instead, handle the error (see § Errors).

## Step 2: Get faucet config

```http
GET {baseUrl}/api/getFaucetConfig?session=<sessionId>
```

Extract the PoW algorithm and params from `modules.pow.powParams`.

Example response extract (Argon2, the most common default):
```json
{
  "modules": {
    "pow": {
      "powParams": { "a": "argon2", "t": 0, "v": 13, "i": 4, "m": 4096, "p": 1, "l": 16 },
      "powDifficulty": 11
    }
  }
}
```

### Supported algorithms

| `powParams.a`   | Hash       | Common instances         |
|-----------------|------------|--------------------------|
| `"argon2"`      | Argon2id   | Hoodi, Sepolia (default) |
| `"scrypt"`      | SCrypt     | Legacy                   |
| `"cryptonight"` | CryptoNight| Monero-derived           |
| `"nickminer"`   | Keccak-based | Specialized hardware   |

## Step 3: Solve the PoW challenge

This is the core computation.  You need to:

1. Fetch a nonce range
2. Iterate nonces, computing `hash(nonce_hex(16) . preimage_hex)` for each
3. Check if the hash meets the difficulty target
4. Submit any valid share

### Get a challenge

```http
GET {baseUrl}/api/powChallenge?session=<sessionId>
```

Response:
```json
{
  "algo": "argon2",
  "params": { "type": 0, "version": 13, "timeCost": 4, "memoryCost": 4096, "parallelization": 1, "keyLength": 16 },
  "difficulty": 11,
  "preimage": "YmFzZTY0IHByZWltYWdl",
  "nonceStart": 0,
  "nonceCount": 50000,
  "shareReward": 2000000000000000
}
```

**Key fields**:
- `preimage`: base64-encoded challenge seed  
- `nonceStart`..`nonceStart+nonceCount-1`: the nonces to try
- `difficulty`: number of leading zero bits required in the hash
- `shareReward`: wei earned per valid share

### Compute the hash (Python / Node.js / Go examples)

#### Python (using hashlib scrypt + argon2-cffi)

```python
import hashlib
import base64
import struct

def base64_to_hex(b64: str) -> str:
    return base64.b64decode(b64).hex()

def try_nonce(nonce: int, preimage_b64: str, params: dict, difficulty: int, algo: str):
    """Return (is_valid, hash_hex) for a single nonce."""
    preimg_hex = base64_to_hex(preimage_b64)
    nonce_hex = format(nonce, '016x')  # 16 hex chars, zero-padded

    if algo == 'scrypt':
        pw = nonce_hex.encode()
        salt = preimg_hex.encode()
        N = params['n']
        r = params['r']
        p = params['p']
        keylen = params['l']
        digest = hashlib.scrypt(pw, salt=salt, n=N, r=r, p=p, dklen=keylen)
        hash_hex = digest.hex()
    elif algo == 'argon2':
        # Requires: pip install argon2-cffi
        from argon2 import PasswordHasher
        # argon2-cffi expects password and salt as bytes
        pw = nonce_hex.encode()
        salt = preimg_hex.encode()
        mem = params['memoryCost']  # in KiB
        iters = params['timeCost']
        pll = params['parallelization']
        outlen = params['keyLength']
        # Use low-level API
        import argon2.low_level as ll
        raw = ll.hash_secret_raw(
            secret=pw,
            salt=salt,
            time_cost=iters,
            memory_cost=mem,
            parallelism=pll,
            hash_len=outlen,
            type=ll.Type.ID if params['type'] == 1 else ll.Type.I,
            version=params['version'],
        )
        hash_hex = raw.hex()
    else:
        raise ValueError(f"Unsupported algo: {algo}")

    # Check difficulty
    byte_count = difficulty // 8 + 1
    bit_count = difficulty - (byte_count - 1) * 8
    max_val = 1 << (8 - bit_count)
    mask_hex = format(max_val, 'x').zfill(byte_count * 2)
    is_valid = hash_hex[:len(mask_hex)] <= mask_hex
    return is_valid, hash_hex

def find_share(nonce_start: int, nonce_count: int, preimage_b64: str, params: dict, difficulty: int, algo: str):
    """Iterate nonces until a valid share is found. Returns (nonce, hash_hex) or None."""
    for i in range(nonce_count):
        nonce = nonce_start + i
        ok, h = try_nonce(nonce, preimage_b64, params, difficulty, algo)
        if ok:
            return nonce, h
    return None
```

#### Node.js (using crypto and argon2 packages)

```javascript
import crypto from 'node:crypto';

function base64ToHex(b64) {
  return Buffer.from(b64, 'base64').toString('hex');
}

async function tryNonce(nonce, preimageB64, params, difficulty, algo) {
  const preimgHex = base64ToHex(preimageB64);
  const nonceHex = nonce.toString(16).padStart(16, '0');

  let hashHex;
  if (algo === 'scrypt') {
    const buf = crypto.scryptSync(nonceHex, preimgHex, params.l, {
      N: params.n, r: params.r, p: params.p,
      maxmem: params.n * params.r * params.p * 256 * 2,
    });
    hashHex = buf.toString('hex');
  } else if (algo === 'argon2') {
    // npm install argon2
    const argon2 = await import('argon2');
    const buf = await argon2.hash(Buffer.from(nonceHex), {
      salt: Buffer.from(preimgHex),
      type: params.type,     // argon2.argon2id = 2
      timeCost: params.timeCost,
      memoryCost: params.memoryCost, // in KiB
      parallelism: params.parallelization,
      hashLength: params.keyLength,
      raw: true,  // return raw bytes, not encoded hash
    });
    hashHex = buf.toString('hex');
  } else {
    throw new Error(`Unsupported algo: ${algo}`);
  }

  // Difficulty check
  const byteCount = Math.floor(difficulty / 8) + 1;
  const bitCount = difficulty - (byteCount - 1) * 8;
  const maxVal = 1 << (8 - bitCount);
  const maskHex = maxVal.toString(16).padStart(byteCount * 2, '0');
  return { valid: hashHex.slice(0, maskHex.length) <= maskHex, hashHex };
}
```

### How the difficulty check works

For `difficulty = 11`:
- byteCount = 11 // 8 + 1 = 2 bytes  
- bitCount = 11 - 1*8 = 3 bits  
- maxVal = 2^(8-3) = 32 = 0x20  
- maskHex = `"20"` padded to 4 hex chars = `"0020"`  
- Valid if `hashHex[:4] <= "0020"`, i.e. the first 11 bits are zero

For `difficulty = 14`:
- byteCount = 14 // 8 + 1 = 2  
- bitCount = 14 - 1*8 = 6  
- maxVal = 2^(8-6) = 4 = 0x04  
- maskHex = `"0004"`  
- Valid if `hashHex[:4] <= "0004"`

## Step 4: Submit a valid share

Once you find a nonce that produces a qualifying hash:

```http
POST {baseUrl}/api/powSubmit
Content-Type: application/json

{"session": "<sessionId>", "nonce": 42}
```

Success:
```json
{ "valid": true, "balance": "2000000000000000" }
```

Failure:
```json
{ "valid": false, "error": "Invalid share (hash does not meet difficulty target)" }
```

On success, your balance increases by `shareReward` wei.  
Repeat steps 3-4 until you have enough.

## Step 5: Check progress

```http
GET {baseUrl}/api/getSessionStatus?session=<sessionId>
```

Response:
```json
{
  "session": "...",
  "status": "running",
  "balance": "4000000000000000",
  "target": "0x...",
  "tasks": [{ "module": "pow", "name": "mining", "timeout": 1719360000 }]
}
```

## Step 6: Close session and claim

When you're done mining, close the session:

```http
POST {baseUrl}/api/powCloseSession?session=<sessionId>
```

Response:
```json
{
  "session": "...",
  "status": "claimable",
  "balance": "4000000000000000",
  "target": "0x..."
}
```

Then claim:

```http
POST {baseUrl}/api/claimReward
Content-Type: application/json

{"session": "<sessionId>"}
```

Response:
```json
{
  "session": "...",
  "status": "claiming",
  "claimIdx": 0,
  "claimStatus": "pending"
}
```

Poll until confirmed:

```http
GET {baseUrl}/api/getSessionStatus?session=<sessionId>
```

Expected final state:
```json
{
  "status": "finished",
  "claimStatus": "confirmed",
  "claimHash": "0xabc123..."
}
```

## Error handling

| Error code | Meaning | Action |
|-----------|---------|--------|
| `FAUCET_DISABLED` | Faucet in maintenance | Retry later |
| `INVALID_ADDR` | Bad target address | Check format (0x + 40 hex) |
| `CONCURRENCY_LIMIT` | Too many concurrent sessions | Wait or close other sessions |
| `AMOUNT_TOO_LOW` | Balance below minDropAmount | Mine more shares |
| `NOT_CLAIMABLE` | Session is still in RUNNING | Call powCloseSession first |
| `SESSION_TIMEOUT` | Session expired | Start a new session |
| `INVALID_SESSION` | Session ID not found | Check session ID or start new |

## Optimisation tips

1. **Batch challenges**: Request multiple nonce ranges upfront and mine
   through them all before submitting.  Each `powChallenge` call advances the
   counter, but old ranges remain valid.

2. **Nonce order**: Submit nonces in increasing order.  The server rejects
   nonces ≤ the last submitted nonce.

3. **Parallel mining**: If your runtime supports it, spawn multiple workers
   across different nonce ranges from the same session.

4. **Share reward**: Check `shareReward` in the challenge response.  With
   the default config (`2000000000000000` wei = 0.002 ETH per share) and
   difficulty 11 (~2048 hashes expected per share), one minute of CPU mining
   typically yields 1-3 shares.

## Full agent pseudocode

```
base_url = "https://hoodi-faucet.pk910.de"
target   = "0xYourAddress"

# 1. Start session
r = POST(base_url + "/api/startSession", json={"addr": target})
if r.status != 200 or "session" not in r.json:
    abort(r.json.get("failedReason", "Unknown error"))
session_id = r.json["session"]

# 2. Get config
config = GET(base_url + f"/api/getFaucetConfig?session={session_id}")
pow_cfg = config["modules"]["pow"]

# 3-4. Mine loop
balance = 0
target_balance = 10000000000000000  # 0.01 ETH
while balance < target_balance:
    challenge = GET(base_url + f"/api/powChallenge?session={session_id}")
    share = find_share(
        nonce_start=challenge["nonceStart"],
        nonce_count=challenge["nonceCount"],
        preimage_b64=challenge["preimage"],
        params=challenge["params"],
        difficulty=challenge["difficulty"],
        algo=challenge["algo"],
    )
    if share is None:
        continue  # try next range
    nonce, _ = share
    result = POST(base_url + "/api/powSubmit", json={
        "session": session_id,
        "nonce": nonce,
    })
    if result.get("valid"):
        balance = int(result["balance"])

# 5. Close and claim
POST(base_url + f"/api/powCloseSession?session={session_id}")
result = POST(base_url + "/api/claimReward", json={"session": session_id})
print("Claimed:", result.get("claimHash"))
```
