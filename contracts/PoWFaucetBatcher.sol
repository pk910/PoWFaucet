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
// faucet knows which claim it belongs to. Every sub-call runs with bounded gas and its return data
// is never copied (one word at most, for the token result), so one recipient cannot burn the
// batch, neither with its stipend nor with a return-data bomb. A token or call sub-call may not
// target the wallet itself: a nested `execute` would pass the self-only gate with a stream of its own.
//
// A batch that ran emits `BatchExecuted` at the end. Without it the faucet knows the transaction
// did not run this code (the wallet's code was something else when it mined) and pays nobody twice
// by assuming it did.
//
// Deployed by the faucet through the deterministic deployment proxy
// (0x4e59b44847b379578588920cA78FbF26c0B4956C), so one compiler setting set gives one address on
// every chain; scripts/compile-contracts.mjs produces the artifact the faucet ships.

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
        if (!_transfer(to, amount))
          emit CallFailed(index, kind, to, amount);
      } else if (kind == KIND_TOKEN) {
        address token = address(bytes20(calls[offset:offset + 20]));
        address to = address(bytes20(calls[offset + 20:offset + 40]));
        uint256 amount = uint96(bytes12(calls[offset + 40:offset + 52]));
        offset += 52;
        require(token != address(this), "self call");
        if (!_tokenTransfer(token, to, amount))
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
        if (!_call(to, value, gasLimit, data))
          emit CallFailed(index, kind, to, value);
      } else {
        revert("unknown call kind");
      }
      index++;
    }
    require(offset == calls.length, "malformed stream");
    emit BatchExecuted(index);
  }

  // native coin with the transfer stipend; no return data is copied
  function _transfer(address to, uint256 amount) private returns (bool ok) {
    uint256 gasLimit = TRANSFER_GAS;
    assembly {
      ok := call(gasLimit, to, amount, 0, 0, 0, 0)
    }
  }

  // an arbitrary call with the stream's gas; the callee's return data is left where it is
  function _call(address to, uint256 value, uint256 gasLimit, bytes calldata data) private returns (bool ok) {
    assembly {
      let ptr := mload(0x40)
      calldatacopy(ptr, data.offset, data.length)
      ok := call(gasLimit, to, value, ptr, data.length, 0, 0)
    }
  }

  // ERC20 transfer(to, amount) with twice the transfer stipend. Copies at most one word of return
  // data: a token returning nothing passes when it has code, a token returning a word must return true.
  function _tokenTransfer(address token, address to, uint256 amount) private returns (bool ok) {
    uint256 gasLimit = TRANSFER_GAS * 2;
    assembly {
      let ptr := mload(0x40)
      mstore(ptr, 0xa9059cbb00000000000000000000000000000000000000000000000000000000)
      mstore(add(ptr, 4), to)
      mstore(add(ptr, 36), amount)
      let success := call(gasLimit, token, 0, ptr, 68, ptr, 32)
      switch returndatasize()
      case 0 {
        ok := and(success, gt(extcodesize(token), 0))
      }
      default {
        ok := and(success, and(gt(returndatasize(), 31), eq(mload(ptr), 1)))
      }
    }
  }

}
