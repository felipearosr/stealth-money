# Stealth Money Smart Contracts

**Solidity Smart Contracts for Mantle Hackathon Submission**

A collection of secure, gas-optimized smart contracts deployed on the Mantle Network that enable trustless escrow and automated fund release for international money transfers.

## Overview

These smart contracts form the blockchain backbone of Stealth Money, providing secure fund escrow without requiring users to understand blockchain mechanics. The contracts are specifically optimized for the Mantle Network's low-cost, high-performance environment.

## Key Features

**Mantle Network Optimization:**
- Gas-efficient contract design for minimal transaction costs
- Optimized for Mantle's EVM environment
- Fast transaction finality leveraging Mantle's performance
- Integration with Mantle ecosystem tokens

**Security Features:**
- Multi-signature escrow mechanisms
- Time-locked fund release
- Emergency pause functionality
- Comprehensive access controls

**User Experience:**
- Automated fund release upon payment confirmation
- No direct user interaction with contracts required
- Transparent fee structure
- Real-time status tracking

## Smart Contracts

### TransferManager.sol

The core contract that manages the entire transfer lifecycle on Mantle Network.

**Key Functions:**
```solidity
contract TransferManager is Ownable {
    // Create escrow for new transfer
    function createTransfer(
        bytes32 transferId,
        address recipient,
        uint256 amount,
        address token
    ) external payable;
    
    // Release funds after payment confirmation
    function releaseTransfer(bytes32 transferId) external onlyOwner;
    
    // Emergency functions for security
    function pauseContract() external onlyOwner;
    function emergencyWithdraw(bytes32 transferId) external onlyOwner;
}
```

**Features:**
- **Escrow Management**: Secure holding of funds until payment confirmation
- **Automated Release**: Programmatic fund release upon backend confirmation
- **Multi-Token Support**: Handle various ERC-20 tokens and native MNT
- **Gas Optimization**: Minimal gas usage for cost-effective operations
- **Security Controls**: Owner-only functions with emergency mechanisms

### MockERC20.sol

A test token contract for development and testing purposes.

**Purpose:**
- Testing transfer functionality without real tokens
- Development environment simulation
- Gas cost estimation and optimization
- Integration testing with various token types

## Mantle Network Benefits

### Cost Efficiency
```solidity
// Optimized gas usage for Mantle Network
contract TransferManager {
    // Efficient storage patterns
    mapping(bytes32 => Transfer) private transfers;
    
    // Batch operations where possible
    function batchRelease(bytes32[] calldata transferIds) external;
    
    // Minimal external calls
    function releaseTransfer(bytes32 transferId) external {
        // Direct state changes without expensive operations
    }
}
```

### Performance Optimization
- **Fast Finality**: Contracts designed for Mantle's quick block times
- **High Throughput**: Support for concurrent transfer processing
- **Efficient State Management**: Optimized storage patterns for gas savings

### Developer Experience
- **EVM Compatibility**: Standard Solidity patterns work seamlessly
- **Hardhat Integration**: Full tooling support for development and testing
- **TypeScript Bindings**: Auto-generated types for frontend integration

## Project Structure

```
packages/contracts/
├── contracts/
│   ├── TransferManager.sol      # Core escrow contract
│   └── MockERC20.sol           # Test token contract
├── scripts/
│   └── deploy.ts               # Deployment scripts
├── test/
│   └── TransferManager.test.ts # Comprehensive test suite
├── artifacts/                  # Compiled contract artifacts
├── typechain-types/           # TypeScript contract bindings
├── hardhat.config.ts          # Hardhat configuration
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Hardhat development environment
- Mantle Network RPC access

### Installation

1. **Install dependencies:**
```bash
cd packages/contracts
npm install
```

2. **Configure Hardhat:**
Edit `hardhat.config.ts` with your Mantle Network configuration:
```typescript
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200  // Optimized for Mantle Network
      }
    }
  },
  networks: {
    mantle: {
      url: "https://rpc.mantle.xyz",
      accounts: [process.env.PRIVATE_KEY!],
      chainId: 5000
    },
    mantleTestnet: {
      url: "https://rpc.testnet.mantle.xyz",
      accounts: [process.env.PRIVATE_KEY!],
      chainId: 5001
    }
  }
};
```

3. **Set up environment variables:**
```bash
# Create .env file
PRIVATE_KEY=your_wallet_private_key
MANTLE_RPC_URL=https://rpc.mantle.xyz
ETHERSCAN_API_KEY=your_etherscan_api_key  # For verification
```

## Development Workflow

### Compile Contracts
```bash
npm run compile
```
This generates:
- Contract artifacts in `artifacts/`
- TypeScript bindings in `typechain-types/`
- ABI files for frontend integration

### Run Tests
```bash
npm test
```

**Test Coverage:**
- Unit tests for all contract functions
- Integration tests for complete transfer flows
- Gas usage optimization tests
- Security vulnerability tests
- Edge case handling

### Deploy to Networks

**Local Development:**
```bash
# Start local Hardhat node
npx hardhat node

# Deploy to local network
npm run deploy:localhost
```

**Mantle Testnet:**
```bash
npm run deploy:testnet
```

**Mantle Mainnet:**
```bash
npm run deploy:mainnet
```

## Contract Deployment

### Deployment Script
```typescript
// scripts/deploy.ts
async function main() {
  // Deploy TransferManager contract
  const TransferManager = await ethers.getContractFactory("TransferManager");
  const transferManager = await TransferManager.deploy();
  
  await transferManager.deployed();
  
  console.log("TransferManager deployed to:", transferManager.address);
  
  // Verify contract on Mantle Explorer
  if (network.name !== "localhost") {
    await hre.run("verify:verify", {
      address: transferManager.address,
      constructorArguments: []
    });
  }
}
```

### Post-Deployment Setup
1. **Update API Configuration**: Add contract address to backend environment
2. **Frontend Integration**: Update contract ABI in frontend
3. **Testing**: Verify deployment with test transactions
4. **Monitoring**: Set up contract event monitoring

## Gas Optimization

### Mantle-Specific Optimizations
```solidity
contract TransferManager {
    // Pack structs to minimize storage slots
    struct Transfer {
        address recipient;      // 20 bytes
        uint96 amount;         // 12 bytes (fits in same slot)
        uint32 timestamp;      // 4 bytes
        TransferStatus status; // 1 byte (enum)
    }
    
    // Use events for off-chain indexing
    event TransferCreated(
        bytes32 indexed transferId,
        address indexed recipient,
        uint256 amount
    );
    
    // Batch operations for efficiency
    function batchRelease(bytes32[] calldata transferIds) external onlyOwner {
        for (uint256 i = 0; i < transferIds.length; i++) {
            _releaseTransfer(transferIds[i]);
        }
    }
}
```

### Gas Usage Estimates
- **Create Transfer**: ~50,000 gas
- **Release Transfer**: ~30,000 gas
- **Batch Release (10 transfers)**: ~250,000 gas
- **Emergency Withdraw**: ~40,000 gas

## Security Considerations

### Access Control
```solidity
contract TransferManager is Ownable {
    // Only backend service can release funds
    modifier onlyAuthorized() {
        require(msg.sender == owner(), "Unauthorized");
        _;
    }
    
    // Emergency pause mechanism
    bool public paused = false;
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
}
```

### Security Features
- **Reentrancy Protection**: Using OpenZeppelin's ReentrancyGuard
- **Integer Overflow Protection**: Solidity 0.8+ built-in protection
- **Access Controls**: Role-based permissions for critical functions
- **Emergency Mechanisms**: Pause and emergency withdrawal capabilities
- **Time Locks**: Configurable delays for sensitive operations

## Testing Strategy

### Test Categories

**Unit Tests:**
```typescript
describe("TransferManager", function () {
  it("Should create transfer with correct parameters", async function () {
    // Test transfer creation
  });
  
  it("Should release funds to correct recipient", async function () {
    // Test fund release mechanism
  });
  
  it("Should handle emergency scenarios", async function () {
    // Test emergency functions
  });
});
```

**Integration Tests:**
- End-to-end transfer flow simulation
- Multi-token transfer testing
- Gas usage optimization verification
- Network-specific behavior testing

**Security Tests:**
- Reentrancy attack prevention
- Access control validation
- Edge case handling
- Failure mode testing

## Frontend Integration

### Contract ABI Usage
```typescript
// Auto-generated TypeScript bindings
import { TransferManager } from "../typechain-types";

// Contract interaction in frontend/backend
const contract = new ethers.Contract(
  contractAddress,
  TransferManagerABI,
  provider
) as TransferManager;

// Listen for events
contract.on("TransferCreated", (transferId, recipient, amount) => {
  console.log("New transfer created:", { transferId, recipient, amount });
});
```

### Event Monitoring
```typescript
// Monitor contract events for real-time updates
const filter = contract.filters.TransferReleased();
const events = await contract.queryFilter(filter, fromBlock, toBlock);

events.forEach(event => {
  // Update transfer status in database
  updateTransferStatus(event.args.transferId, "COMPLETED");
});
```

## Monitoring and Analytics

### Key Metrics
- **Total Value Locked (TVL)**: Amount held in escrow
- **Transfer Volume**: Daily/monthly transfer statistics
- **Gas Usage**: Average gas costs per operation
- **Success Rate**: Percentage of successful transfers
- **Response Time**: Contract interaction latency

### Event Tracking
```solidity
// Comprehensive event logging
event TransferCreated(bytes32 indexed transferId, address indexed recipient, uint256 amount);
event TransferReleased(bytes32 indexed transferId, address indexed recipient, uint256 amount);
event TransferCancelled(bytes32 indexed transferId, string reason);
event EmergencyWithdraw(bytes32 indexed transferId, address indexed admin);
```

## Deployment Addresses

### Mantle Testnet
```
TransferManager: 0x... (to be deployed)
MockERC20: 0x... (for testing)
```

### Mantle Mainnet
```
TransferManager: 0x... (to be deployed)
```

## Troubleshooting

### Common Issues

**Compilation Errors:**
- Ensure Solidity version compatibility (0.8.19)
- Check OpenZeppelin contract versions
- Verify import paths

**Deployment Failures:**
- Confirm sufficient MNT balance for gas
- Verify network configuration
- Check private key permissions

**Gas Estimation Issues:**
- Use Mantle-specific gas settings
- Test on testnet first
- Monitor gas price fluctuations

## Contributing

1. Fork the repository
2. Create a feature branch for contract changes
3. Write comprehensive tests for new functionality
4. Ensure gas optimization
5. Submit pull request with detailed description

## Security Auditing

### Audit Checklist
- [ ] Reentrancy protection implemented
- [ ] Access controls properly configured
- [ ] Integer overflow/underflow protection
- [ ] Emergency mechanisms tested
- [ ] Gas optimization verified
- [ ] Event logging comprehensive

### Recommended Tools
- **Slither**: Static analysis for vulnerability detection
- **Mythril**: Security analysis tool
- **Hardhat Coverage**: Test coverage reporting
- **Gas Reporter**: Gas usage optimization

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## Support

For contract-related issues:
1. Review the test suite for usage examples
2. Check Hardhat documentation for tooling issues
3. Consult Mantle Network documentation for network-specific questions
4. Open an issue in the GitHub repository

---

**Built for the Mantle Network Hackathon** - Secure, efficient smart contracts powering seamless money transfers.