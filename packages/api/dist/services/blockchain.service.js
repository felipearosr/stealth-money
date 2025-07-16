"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainService = void 0;
// src/services/blockchain.service.ts
const ethers_1 = require("ethers");
class BlockchainService {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.transferManagerContract = null;
        this.isConfigured = false;
        // Initialize provider and wallet
        const nodeProviderUrl = process.env.NODE_PROVIDER_URL;
        const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
        const contractAddress = process.env.TRANSFER_MANAGER_CONTRACT_ADDRESS;
        // Check if blockchain is properly configured
        if (!nodeProviderUrl ||
            !privateKey ||
            !contractAddress ||
            nodeProviderUrl === 'your_infura_or_alchemy_url' ||
            privateKey === 'your_server_wallet_private_key' ||
            contractAddress === 'your_deployed_contract_address') {
            console.log('⚠️  Blockchain not configured - using mock mode');
            this.isConfigured = false;
            return;
        }
        try {
            this.provider = new ethers_1.ethers.JsonRpcProvider(nodeProviderUrl);
            this.wallet = new ethers_1.ethers.Wallet(privateKey, this.provider);
            // For now, we'll skip contract initialization until ABI is available
            // this.transferManagerContract = new ethers.Contract(
            //   contractAddress,
            //   TransferManagerABI.abi,
            //   this.wallet
            // );
            this.isConfigured = true;
            console.log('✅ Blockchain service initialized');
        }
        catch (error) {
            console.log('⚠️  Blockchain initialization failed - using mock mode');
            this.isConfigured = false;
        }
    }
    /**
     * Calls the 'release' function on the smart contract to send funds.
     * NOTE: This is a placeholder. In a real app, this is called *after* a user's payment is confirmed.
     */
    releaseFunds(recipient, amountInStablecoin, transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isConfigured) {
                console.log('🧪 Mock blockchain: Simulating fund release');
                return `0x${'mock_tx_hash_' + Date.now().toString(16)}`;
            }
            try {
                if (!this.transferManagerContract) {
                    throw new Error('Contract not initialized');
                }
                // Convert transactionId to bytes32 format
                const transactionIdBytes32 = ethers_1.ethers.id(transactionId);
                // The 'release' function on the contract needs to be defined to accept these parameters
                const tx = yield this.transferManagerContract.release(recipient, amountInStablecoin, transactionIdBytes32);
                yield tx.wait(); // Wait for the transaction to be mined
                console.log(`Funds released. Transaction hash: ${tx.hash}`);
                return tx.hash;
            }
            catch (error) {
                console.error('Error releasing funds on-chain:', error);
                throw new Error('Blockchain transaction failed.');
            }
        });
    }
    /**
     * Get the balance of the server wallet in ETH
     */
    getWalletBalance() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isConfigured) {
                return '0.05'; // Mock balance
            }
            if (!this.provider || !this.wallet) {
                throw new Error('Blockchain not properly initialized');
            }
            const balance = yield this.provider.getBalance(this.wallet.address);
            return ethers_1.ethers.formatEther(balance);
        });
    }
    /**
     * Get the server wallet address
     */
    getWalletAddress() {
        if (!this.isConfigured) {
            return '0x0000000000000000000000000000000000000000'; // Mock address
        }
        if (!this.wallet) {
            throw new Error('Wallet not initialized');
        }
        return this.wallet.address;
    }
    /**
     * Get the contract address
     */
    getContractAddress() {
        if (!this.isConfigured) {
            return '0x0000000000000000000000000000000000000000'; // Mock address
        }
        if (!this.transferManagerContract) {
            throw new Error('Contract not initialized');
        }
        return this.transferManagerContract.target;
    }
    /**
     * Get the token balance of the contract (for stablecoins)
     */
    getContractTokenBalance() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isConfigured) {
                return '1000.0'; // Mock balance
            }
            try {
                if (!this.transferManagerContract || !this.provider) {
                    throw new Error('Contract or provider not initialized');
                }
                // Get the token contract address from the TransferManager
                const tokenAddress = yield this.transferManagerContract.token();
                // Create a simple ERC20 interface to check balance
                const erc20ABI = [
                    'function balanceOf(address owner) view returns (uint256)',
                    'function decimals() view returns (uint8)',
                    'function symbol() view returns (string)'
                ];
                const tokenContract = new ethers_1.ethers.Contract(tokenAddress, erc20ABI, this.provider);
                const balance = yield tokenContract.balanceOf(this.transferManagerContract.target);
                const decimals = yield tokenContract.decimals();
                return ethers_1.ethers.formatUnits(balance, decimals);
            }
            catch (error) {
                console.error('Error getting contract token balance:', error);
                throw new Error('Failed to get contract token balance');
            }
        });
    }
    /**
     * Check if the blockchain connection is working
     */
    healthCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isConfigured) {
                return {
                    connected: false,
                    network: 'mock',
                    walletAddress: '0x0000000000000000000000000000000000000000',
                    contractAddress: '0x0000000000000000000000000000000000000000'
                };
            }
            try {
                if (!this.provider || !this.wallet) {
                    throw new Error('Provider or wallet not initialized');
                }
                const network = yield this.provider.getNetwork();
                const blockNumber = yield this.provider.getBlockNumber();
                return {
                    connected: true,
                    network: network.name,
                    walletAddress: this.wallet.address,
                    contractAddress: this.getContractAddress(),
                    blockNumber
                };
            }
            catch (error) {
                console.error('Blockchain health check failed:', error);
                return {
                    connected: false,
                    network: 'unknown',
                    walletAddress: this.getWalletAddress(),
                    contractAddress: this.getContractAddress()
                };
            }
        });
    }
}
exports.BlockchainService = BlockchainService;
