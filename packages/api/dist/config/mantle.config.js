"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mantleConfig = exports.MantleConfigManager = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Mantle L2 network configuration management
 * Centralizes all Mantle-related configuration and validation
 */
class MantleConfigManager {
    constructor() {
        this.config = this.loadConfig();
        this.validateConfig();
    }
    static getInstance() {
        if (!MantleConfigManager.instance) {
            MantleConfigManager.instance = new MantleConfigManager();
        }
        return MantleConfigManager.instance;
    }
    loadConfig() {
        const environment = (process.env.MANTLE_ENVIRONMENT || 'testnet');
        const enabled = process.env.MANTLE_ENABLED === 'true';
        // Network configuration based on environment
        const networkConfig = this.getNetworkConfig(environment);
        return {
            ...networkConfig,
            environment,
            enabled,
            gasLimit: {
                transfer: parseInt(process.env.MANTLE_GAS_LIMIT_TRANSFER || '100000'),
                swap: parseInt(process.env.MANTLE_GAS_LIMIT_SWAP || '150000')
            },
            confirmationBlocks: parseInt(process.env.MANTLE_CONFIRMATION_BLOCKS || '1')
        };
    }
    getNetworkConfig(environment) {
        if (environment === 'mainnet') {
            return {
                networkId: 5000,
                rpcUrl: process.env.MANTLE_MAINNET_RPC_URL || 'https://rpc.mantle.xyz',
                explorerUrl: 'https://explorer.mantle.xyz',
                nativeToken: 'MNT',
                stablecoinAddress: process.env.MANTLE_MAINNET_USDC_ADDRESS || '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
                bridgeContractAddress: process.env.MANTLE_MAINNET_BRIDGE_ADDRESS || ''
            };
        }
        else {
            // Testnet configuration
            return {
                networkId: 5003,
                rpcUrl: process.env.MANTLE_TESTNET_RPC_URL || 'https://rpc.sepolia.mantle.xyz',
                explorerUrl: 'https://explorer.testnet.mantle.xyz',
                nativeToken: 'MNT',
                stablecoinAddress: process.env.MANTLE_TESTNET_USDC_ADDRESS || '0x2c852e740B62308c46DD29B982FBb650D063Bd07',
                bridgeContractAddress: process.env.MANTLE_TESTNET_BRIDGE_ADDRESS || ''
            };
        }
    }
    validateConfig() {
        if (!this.config.enabled) {
            console.log('🔒 Mantle L2 integration is disabled');
            return;
        }
        if (!this.config.rpcUrl) {
            throw new Error('Mantle RPC URL is required when Mantle is enabled');
        }
        if (!this.config.stablecoinAddress) {
            console.warn('⚠️  Mantle stablecoin address not configured - using default');
        }
        if (!this.config.bridgeContractAddress) {
            console.warn('⚠️  Mantle bridge contract address not configured');
        }
        // Log configuration (without sensitive data)
        console.log(`Mantle L2 configured for ${this.config.environment} environment`);
        console.log(`   Network ID: ${this.config.networkId}`);
        console.log(`   RPC URL: ${this.config.rpcUrl}`);
        console.log(`   Explorer: ${this.config.explorerUrl}`);
        console.log(`   Native Token: ${this.config.nativeToken}`);
        if (this.config.environment === 'mainnet') {
            console.warn('⚠️  Running in Mantle MAINNET environment');
        }
        else {
            console.log('🧪 Running in Mantle TESTNET environment');
        }
    }
    getConfig() {
        return { ...this.config };
    }
    getRpcUrl() {
        return this.config.rpcUrl;
    }
    getNetworkId() {
        return this.config.networkId;
    }
    getEnvironment() {
        return this.config.environment;
    }
    getExplorerUrl() {
        return this.config.explorerUrl;
    }
    getNativeToken() {
        return this.config.nativeToken;
    }
    getStablecoinAddress() {
        return this.config.stablecoinAddress;
    }
    getBridgeContractAddress() {
        return this.config.bridgeContractAddress;
    }
    getGasLimits() {
        return { ...this.config.gasLimit };
    }
    getConfirmationBlocks() {
        return this.config.confirmationBlocks;
    }
    isEnabled() {
        return this.config.enabled;
    }
    isTestnet() {
        return this.config.environment === 'testnet';
    }
    isMainnet() {
        return this.config.environment === 'mainnet';
    }
    getTransactionUrl(txHash) {
        return `${this.config.explorerUrl}/tx/${txHash}`;
    }
    getAddressUrl(address) {
        return `${this.config.explorerUrl}/address/${address}`;
    }
}
exports.MantleConfigManager = MantleConfigManager;
// Export singleton instance
exports.mantleConfig = MantleConfigManager.getInstance();
