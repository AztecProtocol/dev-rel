// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract PortalERC20 is ERC20 {
  constructor() ERC20("Portal", "PORTAL") {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}