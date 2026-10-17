// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Batch executor the faucet wallet delegates to (EIP-7702, see docs/claim-transactions.md).
//
// The wallet's own code: when the faucet sends a transaction to itself, this runs in the wallet's
// context, so `execute` pays from the wallet balance, sends the wallet's tokens with a plain
// `transfer`, and needs no approval and no owner. The only gate is `msg.sender == address(this)`:
// nobody but the wallet itself can run it, and a recipient calling back in is not the wallet.
//
// `receive`/`fallback` keep plain value transfers to the wallet working while it is delegated
// (refills, refunds, mining rewards).
//
// Stream format (no padding, big endian):
//   0x00  transfer   address to (20) | uint96 amount (12)                                 33 bytes
//   0x01  token      address token (20) | address to (20) | uint96 amount (12)            53 bytes
//   0x02  call       address to (20) | uint96 value (12) | uint32 gas (4) | uint16 len (2) | bytes data    39 + len bytes
//
// A sub-call that fails (a recipient that reverts, a token transfer that returns false) does not
// revert the batch: it is reported with `CallFailed`, carrying its position in the stream; the
// faucet knows which claim it belongs to. Every sub-call runs with bounded gas, so one recipient
// cannot burn the batch. A token or call sub-call may not target the wallet itself: a nested
// `execute` would pass the self-only gate with a stream of its own.
//
// A batch that ran emits `BatchExecuted` at the end. Without it the faucet knows the transaction
// did not run this code (the wallet's code was something else when it mined) and pays nobody twice
// by assuming it did.
//
// Deployed by the faucet through the deterministic deployment proxy
// (0x4e59b44847b379578588920cA78FbF26c0B4956C), so one compiler setting set gives one address on
// every chain; scripts/compile-contracts.mjs produces the artifact the faucet ships.

interface IERC20Minimal {
  function transfer(address to, uint256 value) external returns (bool);
}

contract PoWFaucetBatcher {

  uint8 public constant KIND_TRANSFER = 0;
  uint8 public constant KIND_TOKEN = 1;
  uint8 public constant KIND_CALL = 2;

  // gas handed to a transfer recipient; enough for a wallet or a simple receive(), not enough to grief the batch
  uint256 public constant TRANSFER_GAS = 50000;

  // `index` is the sub-call's position in the stream: the faucet matches outcomes by it
  event CallFailed(uint256 indexed index, uint8 kind, address to, uint256 amount);
  // the batch ran to the end; `calls` sub-calls were attempted
  event BatchExecuted(uint256 calls);

  receive() external payable {
  }

  fallback() external payable {
  }

  function execute(bytes calldata calls) external {
    require(msg.sender == address(this), "self only");

    uint256 offset = 0;
    uint256 index = 0;
    while (offset < calls.length) {
      uint8 kind = uint8(calls[offset]);
      offset += 1;

      if (kind == KIND_TRANSFER) {
        address to = address(bytes20(calls[offset:offset + 20]));
        uint256 amount = uint96(bytes12(calls[offset + 20:offset + 32]));
        offset += 32;
        (bool ok, ) = payable(to).call{value: amount, gas: TRANSFER_GAS}("");
        if (!ok)
          emit CallFailed(index, kind, to, amount);
      } else if (kind == KIND_TOKEN) {
        address token = address(bytes20(calls[offset:offset + 20]));
        address to = address(bytes20(calls[offset + 20:offset + 40]));
        uint256 amount = uint96(bytes12(calls[offset + 40:offset + 52]));
        offset += 52;
        require(token != address(this), "self call");
        bool ok = false;
        try IERC20Minimal(token).transfer{gas: TRANSFER_GAS * 2}(to, amount) returns (bool result) {
          ok = result;
        } catch {
          ok = false;
        }
        if (!ok)
          emit CallFailed(index, kind, to, amount);
      } else if (kind == KIND_CALL) {
        address to = address(bytes20(calls[offset:offset + 20]));
        uint256 value = uint96(bytes12(calls[offset + 20:offset + 32]));
        uint256 gasLimit = uint32(bytes4(calls[offset + 32:offset + 36]));
        uint256 length = uint16(bytes2(calls[offset + 36:offset + 38]));
        offset += 38;
        bytes calldata data = calls[offset:offset + length];
        offset += length;
        require(to != address(this), "self call");
        (bool ok, ) = to.call{value: value, gas: gasLimit}(data);
        if (!ok)
          emit CallFailed(index, kind, to, value);
      } else {
        revert("unknown call kind");
      }
      index++;
    }
    require(offset == calls.length, "malformed stream");
    emit BatchExecuted(index);
  }

}
