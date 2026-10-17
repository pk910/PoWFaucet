# Claim transactions

How the faucet pays a claim is configurable in two independent parts. `ethClaimTx` says what a
claim *is*: one or more calls. `ethClaimBatch` says how many claims share a transaction. Without
either, a claim is one transaction: a native transfer to the session's target, or an ERC20
`transfer` when `faucetCoinType` is `erc20`.

## What a claim is

```yaml
ethClaimTx:
  gasLimit: "estimate"
  calls:
    - type: "call"
      to: "0x1234..."
      abi:
        - "function claim(address to, uint256 ethAmount, uint256 tokenAmount) payable"
      fn: "claim"
      args: ["{target}", "{amount}", "{session.tokenAmount}"]
      value: "{amount}"
```

Three call types exist:

| type | fields | what happens |
|---|---|---|
| `transfer` | `to`, `amount` | native coin from the faucet wallet to `to` |
| `token` | `token`, `to`, `amount` | the wallet's own ERC20 `transfer` |
| `call` | `to`, `value`, and `data` or `abi` + `fn` + `args` | a contract call from the wallet, with `value` native coin along |

`abi` is either a JSON ABI string (as the refill contract takes it) or a list of human-readable
signatures. Fields are literals or placeholders; a placeholder is the whole string:

| placeholder | value |
|---|---|
| `{target}` | the claim's target address |
| `{amount}` | the claim's drop amount in wei (or token base units) |
| `{token}` | `faucetCoinContract` (erc20 faucets) |
| `{walletAddr}` | the faucet wallet |
| `{sessionId}` | the session id (a uuid string) |
| `{sessionHash}` | keccak256 of the session id, for `bytes32` parameters |
| `{session.<key>}` | a value from the session's data at claim time |

The ABI type decides the encoding: strings go into `uint` parameters as big integers, into
`address` and `string` parameters as they are.

`{session.<key>}` is how a module hands per-session values to the transaction. A module that
awards a token on top of the drop writes it in a session hook, e.g.
`session.setSessionData("tokenAmount", "1000000000000000000")`, and the template reads
`{session.tokenAmount}`. A missing key fails the claim, so set the key for every session the
template applies to.

`gasLimit` is a number, `"estimate"` (the node's estimate plus 20 %, falling back to
`ethTxGasLimit` when estimation fails), or omitted for `ethTxGasLimit`.

A claim with one call is a plain transaction. A claim with several calls (ETH plus a token, say)
needs `ethClaimBatch`: the wallet's own code executes the calls, see below.

```yaml
ethClaimTx:
  calls:
    - { type: "transfer", to: "{target}", amount: "{amount}" }
    - { type: "token", token: "0xToken...", to: "{target}", amount: "{session.tokenAmount}" }
```

## Several claims per transaction

```yaml
ethClaimBatch:
  maxClaims: 50
  maxWaitSeconds: 10
  gasLimit: 40000
  gasLimitPerClaim: 40000
```

Batching does not care what a claim is: it takes the calls `ethClaimTx` defines (or the plain
transfer) for every claim in the batch and executes them in one transaction. It works through
EIP-7702: the faucet wallet delegates its code to the batcher contract
(`contracts/PoWFaucetBatcher.sol`) and pays a batch by calling `execute` on itself. The batcher's
only gate is `msg.sender == address(this)`, so there is no owner, no role and no approval anywhere:
the wallet pays from its own balance, sends its own tokens with a plain `transfer`, and nobody but
the wallet can run the code. Single transactions keep working exactly as before; with batching
active every claim goes through `execute`, alone or not.

The faucet sets this up by itself, from the claim queue, the first time it has claims to batch:

1. If the batcher is not on the chain yet, it deploys it through the deterministic deployment
   proxy (`0x4e59b44847b379578588920cA78FbF26c0B4956C`). The address is a function of the bytecode
   alone, so every faucet shares one batcher per chain. `contracts/compile.sh` produces the
   bytecode the faucet ships, with a pinned compiler in docker; changing the contract changes the
   address. Before the wallet delegates to it, the code at that address is compared byte for byte
   with the compiled runtime bytecode: anything else there (a different contract on some chain, a
   tampered artifact) stops the setup.
2. If the wallet's code is not `0xef0100 || batcher`, it sends a type 4 transaction to itself with
   one authorization. That costs two nonces (the transaction's and the authorization's).

Both steps happen at most once. If either fails (no deployer on the chain, no EIP-7702 yet, a
rejected transaction) the faucet logs it, pays one claim per transaction, and tries again after a
few minutes. `ethLegacyTx` must be off: the delegation needs EIP-1559 transactions.

### The call stream

Every claim's calls are packed into one byte stream for `execute`, in claim order:

| type | wire format |
|---|---|
| `transfer` | `0x00` to(20) amount(12) |
| `token` | `0x01` token(20) to(20) amount(12) |
| `call` | `0x02` to(20) value(12) len(2) data |

A plain transfer is 33 bytes per claim, about half of what two ABI arrays would take. Amounts are
`uint96`, data lengths `uint16`. `gasLimit` is the base, `gasLimitPerClaim` is added per claim;
`"estimate"` works here too. The native coin a batch moves is still bounded by the claims' amounts
(see the checks before signing); it leaves the wallet inside `execute` rather than riding on the
transaction.

Queue behaviour:

- The queue sends up to `maxClaims` claims per transaction. When fewer are queued, it waits until
  the oldest has been queued for `maxWaitSeconds`, then sends what it has. `0` sends a partial
  batch on the next queue tick (every 2 seconds).
- A batch only takes claims the wallet can cover together (`spareFundsAmount` respected); the rest
  waits for the next transaction.
- `ethMaxPending` still counts transactions, so throughput grows with the batch size.
- All claims of a batch share the transaction hash, nonce and block. The fee is split evenly
  (remainder on the first claim). The signed transaction hex is kept on the first claim only.
- A single queued claim is paid through `fn` when the template has one, otherwise through the
  batch function with one-element lists.

## Durability

A claim transaction is signed once. Before it is broadcast, the signed bytes, the nonce and the
hash are written into the claim data of every session it pays, in one statement, so all of a
batch's rows know the transaction or none does (the rows stay "processing"). The
broadcast then sends exactly those bytes, and retries them on transport errors; a node answering
"already known" or "nonce too low" counts as sent, and the receipt watch settles the claims (a
nonce spent by another transaction without a receipt for ours fails them as dropped). A
transaction is never rebuilt with another nonce after an ambiguous answer, so a lost response
cannot pay a claim twice.

After a restart a claiming session that holds signed bytes is broadcast again as they are
(harmless for bytes the network has seen, and it sends a transaction the crash kept from going
out) and its receipt awaited. The wallet nonce is reloaded after those replays, before the queue
sends anything new.

### Partial failures

A recipient that cannot receive (a contract that reverts, for example) does not revert the batch.
The batcher pays with a plain `call` (a gas stipend of 50k for transfers) and emits
`CallFailed(index, kind, to, amount)` from the wallet's address for every sub-call that failed.
Every claim's row records which positions of the stream are its own, so the faucet reads the
receipt from the row alone, after a restart or a configuration change as well. The position is
exact where an address would not be: two claims to one address in a batch are two positions.

- A claim none of whose calls went through fails; the session may claim again.
- A claim with some calls paid is confirmed with a note ("Partial payout: 1 of 2 calls failed").
  It is consumed and counts towards every limit: a recipient that refuses one of its calls must
  not be able to collect the others again.
- A reverted batch fails every claim.

A token or call sub-call may not target the faucet wallet itself. Inside `execute` the wallet is
`msg.sender`, so a nested call into it would pass the self-only gate with a stream of its own; the
batcher rejects such a sub-call and the faucet refuses to build one.

## The refill contract

`ethRefillContract` uses the same placeholder syntax for `allowanceFnArgs`, `withdrawFnArgs` and
`depositFnArgs`, with `{walletAddr}`, `{amount}` (the requested amount) and `{token}`.
