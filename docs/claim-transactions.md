# Claim transactions

How the faucet pays a claim is configurable. Without configuration a claim is one transaction: a
native transfer to the session's target, or an ERC20 `transfer` when `faucetCoinType` is `erc20`.
The `ethClaimTx` block replaces that with a call on a contract of your choice, and optionally
pays several claims with one transaction.

## A contract call per claim

```yaml
ethClaimTx:
  contract: "0x1234..."
  abi:
    - "function claim(address to, uint256 ethAmount, uint256 tokenAmount) payable"
  fn: "claim"
  args: ["{target}", "{amount}", "{session.tokenAmount}"]
  value: "{amount}"
  gasLimit: "estimate"
```

`abi` is either a JSON ABI string (as the refill contract takes it) or a list of human-readable
signatures. `args` and `value` are literals or placeholders; a placeholder is the whole string:

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

## Several claims per transaction

```yaml
ethClaimTx:
  contract: "0x1234..."
  abi:
    - "function dispense(address[] to, uint256[] amounts) payable"
    - "event DispenseFailed(address indexed to, uint256 amount, address token)"
  batch:
    maxClaims: 20
    maxWaitSeconds: 10
    fn: "dispense"
    args: ["{targets[]}", "{amounts[]}"]
    value: "{sum}"
    gasLimit: 60000
    gasLimitPerClaim: 45000
    failedEvent: "DispenseFailed"
```

The `batch` block adds the list forms `{targets[]}`, `{amounts[]}`, `{sessionIds[]}`,
`{sessionHashes[]}`, `{session.<key>[]}` (one entry per claim, in order) and `{sum}` (the amounts
added up). `gasLimit` is the base, `gasLimitPerClaim` is added per claim; `"estimate"` works here
too.

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

### Partial failures

A recipient that cannot receive (a contract that reverts, for example) must not revert the whole
batch. The contract should pay with a plain `call`, swallow the failure and emit an event naming
the recipient. Point `failedEvent` at that event (`failedEventArg` names its recipient argument,
`to` by default): the faucet decodes the receipt and fails exactly those claims, the others confirm.
Without `failedEvent` a mined batch confirms every claim and a reverted one fails every claim.

`docs/PoWFaucetDispenser.sol` is a reference contract: `dispense` (native coin, funded by
`value: "{sum}"` or a balance kept in the contract), `dispenseToken` (a token the contract holds),
`dispenseMixed` (native coin plus a token per recipient), all emitting `Dispensed` /
`DispenseFailed` per recipient and refunding unpaid native coin to the faucet wallet.

## The refill contract

`ethRefillContract` uses the same placeholder syntax for `allowanceFnArgs`, `withdrawFnArgs` and
`depositFnArgs`, with `{walletAddr}`, `{amount}` (the requested amount) and `{token}`.
