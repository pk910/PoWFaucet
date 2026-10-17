// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Batch payout contract for the faucet's `ethClaimTx` template (see docs/claim-transactions.md).
//
// The faucet wallet (FAUCET_ROLE) pays many claims with one transaction. A recipient that cannot
// receive (a contract that reverts, or runs out of the gas stipend) does not revert the batch: it
// is reported with `DispenseFailed` and the faucet marks only that claim as failed. Native coin
// not paid out is returned to the caller.
//
// Native coin comes with the call (`value: "{sum}"` in the template) or from a balance the operator
// keeps in the contract; tokens must be held by the contract (fund it with `transfer`).
//
// Matching template:
//   ethClaimTx:
//     contract: "<this contract>"
//     abi:
//       - "function dispense(address[] to, uint256[] amounts) payable"
//       - "event DispenseFailed(address indexed to, uint256 amount, address token)"
//     batch:
//       maxClaims: 20
//       maxWaitSeconds: 10
//       fn: "dispense"
//       args: ["{targets[]}", "{amounts[]}"]
//       value: "{sum}"
//       gasLimit: 60000
//       gasLimitPerClaim: 45000
//       failedEvent: "DispenseFailed"

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IERC20Minimal {
  function transfer(address to, uint256 value) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
}

contract PoWFaucetDispenser is AccessControl {

  bytes32 public constant FAUCET_ROLE = keccak256("FAUCET_ROLE");

  // gas handed to a recipient; enough for a wallet or a simple receive(), not enough to grief the batch
  uint256 public constant RECIPIENT_GAS = 50000;

  event Dispensed(address indexed to, uint256 amount, address token);
  event DispenseFailed(address indexed to, uint256 amount, address token);

  constructor(address admin) {
    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(FAUCET_ROLE, admin);
  }

  receive() external payable {
  }

  // native coin to each recipient; the unpaid remainder goes back to the caller
  function dispense(address[] calldata to, uint256[] calldata amounts) external payable onlyRole(FAUCET_ROLE) {
    require(to.length == amounts.length, "length mismatch");
    uint256 unpaid = 0;
    for (uint256 i = 0; i < to.length; i++) {
      if (!_sendEther(to[i], amounts[i]))
        unpaid += amounts[i];
    }
    _refund(unpaid);
  }

  // a token held by this contract to each recipient
  function dispenseToken(address token, address[] calldata to, uint256[] calldata amounts) external onlyRole(FAUCET_ROLE) {
    require(to.length == amounts.length, "length mismatch");
    for (uint256 i = 0; i < to.length; i++) {
      _sendToken(token, to[i], amounts[i]);
    }
  }

  // native coin and a token per recipient in one go (a faucet paying ETH plus its own token)
  function dispenseMixed(address[] calldata to, uint256[] calldata ethAmounts, address token, uint256[] calldata tokenAmounts) external payable onlyRole(FAUCET_ROLE) {
    require(to.length == ethAmounts.length && to.length == tokenAmounts.length, "length mismatch");
    uint256 unpaid = 0;
    for (uint256 i = 0; i < to.length; i++) {
      if (ethAmounts[i] > 0 && !_sendEther(to[i], ethAmounts[i]))
        unpaid += ethAmounts[i];
      if (tokenAmounts[i] > 0)
        _sendToken(token, to[i], tokenAmounts[i]);
    }
    _refund(unpaid);
  }

  // operator exit: native coin (token == address(0)) or a token balance
  function withdraw(address token, address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
    if (token == address(0)) {
      (bool sent, ) = payable(to).call{value: amount}("");
      require(sent, "failed to send ether");
    } else {
      require(IERC20Minimal(token).transfer(to, amount), "token transfer failed");
    }
  }

  function _sendEther(address to, uint256 amount) private returns (bool) {
    if (address(this).balance < amount) {
      emit DispenseFailed(to, amount, address(0));
      return false;
    }
    (bool sent, ) = payable(to).call{value: amount, gas: RECIPIENT_GAS}("");
    if (sent)
      emit Dispensed(to, amount, address(0));
    else
      emit DispenseFailed(to, amount, address(0));
    return sent;
  }

  function _sendToken(address token, address to, uint256 amount) private {
    bool ok = false;
    try IERC20Minimal(token).transfer{gas: RECIPIENT_GAS * 2}(to, amount) returns (bool result) {
      ok = result;
    } catch {
      ok = false;
    }
    if (ok)
      emit Dispensed(to, amount, token);
    else
      emit DispenseFailed(to, amount, token);
  }

  function _refund(uint256 unpaid) private {
    if (unpaid == 0)
      return;
    (bool refunded, ) = payable(msg.sender).call{value: unpaid}("");
    require(refunded, "refund failed");
  }

}
