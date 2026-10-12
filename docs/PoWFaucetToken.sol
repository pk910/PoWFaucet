// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Dummy ERC20 token for the demo instances ("PoWC").
// The faucet wallet refills itself by calling mint(amount), which mints to the caller.
// Demo config (ethRefillContract):
//   contract:   <token address>
//   abi:        '[{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"}]'
//   withdrawFn: "mint"
// Every faucet wallet needs MINTER_ROLE: grantRole(MINTER_ROLE, faucetWalletAddress) from the admin.

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract PoWFaucetToken is ERC20, AccessControl {

  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  constructor(string memory name_, string memory symbol_, address admin) ERC20(name_, symbol_) {
    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(MINTER_ROLE, admin);
  }

  // used by the faucet's automatic wallet refill: mints `amount` to the calling faucet wallet
  function mint(uint256 amount) external onlyRole(MINTER_ROLE) {
    _mint(msg.sender, amount);
  }

  // manual distribution by a minter (e.g. seeding a new demo instance)
  function mintTo(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
    _mint(to, amount);
  }

}
