# Stealth Money - Smart Contracts

This package contains the smart contracts for the Stealth Money project, built with Hardhat and Solidity. The main contract, `TransferManager`, acts as an escrow for secure on-chain stablecoin transfers.

## 📋 Table of Contents

- [Overview](#overview)
- [Contracts](#contracts)
- [Installation](#installation)
- [Usage](#usage)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Gas Optimization](#gas-optimization)
- [Contributing](#contributing)

## 🔍 Overview

The Stealth Money smart contracts provide a secure escrow system for stablecoin transfers. Users can deposit funds into the escrow, and authorized backend services can release funds to recipients. This enables secure, monitored transfers with proper event logging for off-chain tracking.

### Key Features

- **Secure Escrow**: Funds are held safely until authorized release
- **Access Control**: Only contract owner can release funds
- **Event Logging**: All deposits and releases emit events for monitoring
- **Gas Efficient**: Uses custom errors instead of require strings
- **OpenZeppelin Integration**: Built on battle-tested OpenZeppelin contracts

## 📜 Contracts

### TransferManager.sol

The main escrow contract that manages stablecoin deposits and releases.

**Key Functions:**
- `deposit(uint256 amount, bytes32 transactionId)` - Deposit stablecoins into escrow
- `release(address recipient, uint256 amount, bytes32 transactionId)` - Release funds to recipient (owner only)

**Events:**
- `FundsDeposited(address indexed user, uint256 amount, bytes32 indexed transactionId)`
- `FundsReleased(address indexed recipient, uint256 amount, bytes32 indexed transactionId)`

**Custom Errors:**
- `ZeroAmount()` - When amount is zero
- `ZeroAddress()` - When address is zero
- `InsufficientContractBalance()` - When contract has insufficient funds

### MockERC20.sol

A mock ERC20 token used for testing purposes only.

## 🚀 Installation

```bash
# Navigate to contracts directory
cd packages/contracts

# Install dependencies
npm install
```

## 💻 Usage

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
# Run all tests
npm run test

# Run specific test file
npx hardhat test test/TransferManager.test.ts
```

### Start Local Network

```bash
npm run node
```

### Deploy Contracts

```bash
# Deploy to local network
npm run deploy

# Deploy to localhost (if running hardhat node)
npm run deploy:localhost

# Deploy to Sepolia testnet
npm run deploy:sepolia
```

## 🧪 Testing

The test suite includes comprehensive coverage of all contract functionality:

### Test Categories

- **Deployment Tests**: Contract initialization and configuration
- **Deposit Tests**: User deposit functionality and validations
- **Release Tests**: Owner release functionality and access control
- **Edge Cases**: Multiple operations and boundary conditions

### Running Tests

```bash
# Run all tests with gas reporting
npm run test

# Run tests with coverage (if configured)
npm run coverage
```

### Test Results

- ✅ 17 tests passing
- ✅ 100% function coverage
- ✅ All security scenarios tested
- ✅ Gas usage optimized

## 🚀 Deployment

### Configuration

The deployment script uses the following configuration:

- **Sepolia USDC Address**: `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8`
- **Solidity Version**: `^0.8.20`
- **OpenZeppelin Version**: `^5.3.0`

### Network Configuration

Add network configurations to `hardhat.config.ts`:

```typescript
networks: {
  sepolia: {
    url: process.env.SEPOLIA_URL || "",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  },
  mainnet: {
    url: process.env.MAINNET_URL || "",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  }
}
```

### Environment Variables

Create a `.env` file:

```bash
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
MAINNET_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## 🔒 Security

### Security Features

- **Access Control**: Uses OpenZeppelin's `Ownable` for owner-only functions
- **Safe Transfers**: Uses `SafeERC20` for secure token transfers
- **Input Validation**: Comprehensive validation of all inputs
- **Custom Errors**: Gas-efficient error handling
- **Event Logging**: Complete audit trail of all operations

### Security Considerations

- Contract owner has full control over fund releases
- Users must approve the contract before depositing
- All transfers are logged via events
- Zero address and zero amount validations prevent common mistakes

### Audit Recommendations

- [ ] Professional security audit before mainnet deployment
- [ ] Multi-signature wallet for contract ownership
- [ ] Timelock for critical operations
- [ ] Emergency pause functionality (if required)

## ⛽ Gas Optimization

### Gas Usage Report

| Function | Min Gas | Max Gas | Avg Gas |
|----------|---------|---------|---------|
| deposit  | 37,738  | 64,272  | 62,231  |
| release  | 57,797  | 62,597  | 60,797  |

### Optimization Features

- **Custom Errors**: More gas-efficient than require strings
- **Immutable Variables**: Token address stored as immutable
- **SafeERC20**: Optimized token transfer patterns
- **Event Indexing**: Efficient event filtering

## 🛠 Development

### Project Structure

```
packages/contracts/
├── contracts/
│   ├── TransferManager.sol    # Main escrow contract
│   └── MockERC20.sol         # Test token contract
├── scripts/
│   └── deploy.ts             # Deployment script
├── test/
│   └── TransferManager.test.ts # Comprehensive test suite
├── hardhat.config.ts         # Hardhat configuration
├── package.json              # Dependencies and scripts
└── tsconfig.json            # TypeScript configuration
```

### Available Scripts

```bash
npm run compile        # Compile contracts
npm run test          # Run test suite
npm run deploy        # Deploy to default network
npm run deploy:localhost # Deploy to localhost
npm run deploy:sepolia   # Deploy to Sepolia
npm run node          # Start local Hardhat network
```

### Dependencies

**Production:**
- `@openzeppelin/contracts` - Secure, audited contract library

**Development:**
- `hardhat` - Ethereum development environment
- `@nomicfoundation/hardhat-toolbox` - Essential Hardhat plugins
- `typescript` - Type safety
- `chai` - Testing assertions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Code Standards

- Follow Solidity style guide
- Write comprehensive tests
- Document all functions
- Use custom errors for gas efficiency
- Emit events for all state changes

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Solidity Documentation](https://docs.soliditylang.org)

---

**⚠️ Disclaimer**: These contracts are for educational/development purposes. Conduct thorough testing and security audits before any production deployment.