// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TransferManager
 * @dev Escrow contract for managing stablecoin transfers in the Stealth Money project
 */
contract TransferManager is Ownable {
    /// @dev The stablecoin token contract (e.g., USDC)
    IERC20 public immutable token;

    /**
     * @dev Constructor to initialize the TransferManager contract
     * @param _token Address of the stablecoin contract
     */
    constructor(address _token) Ownable(msg.sender) {
        require(_token != address(0), "Token address cannot be zero");
        token = IERC20(_token);
    }
}