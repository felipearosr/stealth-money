// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TransferManager
 * @dev Escrow contract for managing stablecoin transfers in the Stealth Money project
 */
contract TransferManager is Ownable {
    using SafeERC20 for IERC20;
    
    /// @dev The stablecoin token contract (e.g., USDC)
    IERC20 public immutable token;

    // Custom Errors
    error ZeroAmount();
    error ZeroAddress();
    error InsufficientContractBalance();

    // Events
    event FundsDeposited(address indexed user, uint256 amount, bytes32 indexed transactionId);
    event FundsReleased(address indexed recipient, uint256 amount, bytes32 indexed transactionId);

    /**
     * @dev Constructor to initialize the TransferManager contract
     * @param _token Address of the stablecoin contract
     */
    constructor(address _token) Ownable(msg.sender) {
        if (_token == address(0)) revert ZeroAddress();
        token = IERC20(_token);
    }

    /**
     * @dev Allows users to deposit stablecoins into the escrow
     * @param amount The amount of tokens to deposit
     * @param transactionId Unique identifier for this transaction
     */
    function deposit(uint256 amount, bytes32 transactionId) public {
        if (amount == 0) revert ZeroAmount();
        
        // Transfer tokens from user to this contract
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        // Emit deposit event for off-chain monitoring
        emit FundsDeposited(msg.sender, amount, transactionId);
    }

    /**
     * @dev Allows the owner (backend service) to release funds to a recipient
     * @param recipient The address to receive the tokens
     * @param amount The amount of tokens to release
     * @param transactionId Unique identifier for this transaction
     */
    function release(address recipient, uint256 amount, bytes32 transactionId) public onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount > token.balanceOf(address(this))) revert InsufficientContractBalance();
        
        // Transfer tokens from contract to recipient
        token.safeTransfer(recipient, amount);
        
        // Emit release event for off-chain monitoring
        emit FundsReleased(recipient, amount, transactionId);
    }
}