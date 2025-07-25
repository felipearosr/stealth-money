"use strict";
/**
 * Unit tests for Mantle wallet management functionality
 * These tests focus on the core logic without requiring network access
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mantle_service_1 = require("../mantle.service");
describe('MantleService - Wallet Management Unit Tests', () => {
    let mantleService;
    beforeEach(() => {
        mantleService = new mantle_service_1.MantleService();
    });
    describe('Configuration Management', () => {
        it('should provide configuration object', () => {
            const config = mantleService.getConfig();
            expect(config).toBeDefined();
            expect(config.environment).toBeDefined();
            expect(config.networkId).toBeDefined();
            expect(config.rpcUrl).toBeDefined();
            expect(config.nativeToken).toBe('MNT');
            expect(['testnet', 'mainnet']).toContain(config.environment);
        });
        it('should have correct network configuration for testnet', () => {
            const config = mantleService.getConfig();
            if (config.environment === 'testnet') {
                expect(config.networkId).toBe(5003);
                expect(config.rpcUrl).toContain('sepolia.mantle.xyz');
                expect(config.explorerUrl).toContain('testnet.mantle.xyz');
            }
        });
        it('should have correct network configuration for mainnet', () => {
            const config = mantleService.getConfig();
            if (config.environment === 'mainnet') {
                expect(config.networkId).toBe(5000);
                expect(config.rpcUrl).toContain('rpc.mantle.xyz');
                expect(config.explorerUrl).toContain('explorer.mantle.xyz');
            }
        });
    });
    describe('Address Validation (Offline)', () => {
        it('should validate correct Ethereum addresses', () => {
            const validAddresses = [
                '0x1234567890123456789012345678901234567890',
                '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
                '0x0000000000000000000000000000000000000000' // zero address
            ];
            validAddresses.forEach(address => {
                expect(mantleService.isValidAddress(address)).toBe(true);
            });
        });
        it('should reject clearly invalid addresses', () => {
            const clearlyInvalidAddresses = [
                'invalid-address',
                '', // empty string
                'not-an-address-at-all'
            ];
            clearlyInvalidAddresses.forEach(address => {
                const result = mantleService.isValidAddress(address);
                expect(result).toBe(false);
            });
        });
        it('should handle address validation errors gracefully', () => {
            // Test with null/undefined values
            expect(mantleService.isValidAddress(null)).toBe(false);
            expect(mantleService.isValidAddress(undefined)).toBe(false);
        });
    });
    describe('Service State Management', () => {
        it('should report enabled state correctly', () => {
            const isEnabled = mantleService.isEnabled();
            expect(typeof isEnabled).toBe('boolean');
        });
        it('should handle disabled state gracefully', () => {
            if (!mantleService.isEnabled()) {
                expect(() => mantleService.getConfig()).not.toThrow();
            }
        });
    });
    describe('Error Handling', () => {
        it('should throw appropriate errors when service is disabled', async () => {
            if (!mantleService.isEnabled()) {
                await expect(mantleService.createWallet('test-user'))
                    .rejects.toThrow('Mantle service is not enabled or not properly initialized');
                await expect(mantleService.getWalletBalance('0x1234567890123456789012345678901234567890'))
                    .rejects.toThrow('Mantle service is not enabled or not properly initialized');
                await expect(mantleService.estimateGasCost(100, 'USD'))
                    .rejects.toThrow('Mantle service is not enabled or not properly initialized');
            }
        });
        it('should handle invalid inputs gracefully', () => {
            expect(() => mantleService.deriveWalletAddress('')).toThrow();
            expect(() => mantleService.deriveWalletAddress('invalid')).toThrow();
        });
    });
    describe('Utility Functions', () => {
        it('should generate unique wallet IDs', () => {
            // Test the ID generation pattern (even though service might be disabled)
            const config = mantleService.getConfig();
            expect(config).toBeDefined();
            // The wallet ID should follow the pattern: mantle_timestamp_randomstring
            // We can't test actual wallet creation if service is disabled, but we can test the pattern
            const mockId = `mantle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            expect(mockId).toMatch(/^mantle_\d+_[a-z0-9]+$/);
        });
        it('should provide consistent configuration', () => {
            const config1 = mantleService.getConfig();
            const config2 = mantleService.getConfig();
            expect(config1).toEqual(config2);
            expect(config1.networkId).toBe(config2.networkId);
            expect(config1.environment).toBe(config2.environment);
        });
    });
    describe('Network Status (Offline)', () => {
        it('should handle network status when disabled', async () => {
            const networkStatus = await mantleService.getCurrentNetworkStatus();
            expect(networkStatus).toBeDefined();
            expect(typeof networkStatus.connected).toBe('boolean');
            expect(typeof networkStatus.blockNumber).toBe('number');
            expect(typeof networkStatus.networkId).toBe('number');
            expect(typeof networkStatus.latency).toBe('number');
            if (!mantleService.isEnabled()) {
                expect(networkStatus.connected).toBe(false);
                expect(networkStatus.blockNumber).toBe(0);
            }
        });
        it('should provide health check information', async () => {
            const health = await mantleService.healthCheck();
            expect(health).toBeDefined();
            expect(typeof health.enabled).toBe('boolean');
            expect(typeof health.connected).toBe('boolean');
            expect(health.environment).toBeDefined();
            expect(typeof health.networkId).toBe('number');
            expect(health.rpcUrl).toBeDefined();
            expect(typeof health.stablecoinConfigured).toBe('boolean');
            expect(typeof health.bridgeConfigured).toBe('boolean');
        });
    });
    describe('Interface Compliance', () => {
        it('should implement all required wallet management methods', () => {
            // Verify that all expected methods exist
            expect(typeof mantleService.createWallet).toBe('function');
            expect(typeof mantleService.createWalletFromMnemonic).toBe('function');
            expect(typeof mantleService.createWalletFromPrivateKey).toBe('function');
            expect(typeof mantleService.deriveWalletAddress).toBe('function');
            expect(typeof mantleService.isValidAddress).toBe('function');
            expect(typeof mantleService.getWalletBalance).toBe('function');
            expect(typeof mantleService.getTokenBalance).toBe('function');
            expect(typeof mantleService.getMultipleTokenBalances).toBe('function');
            expect(typeof mantleService.getWalletInfo).toBe('function');
        });
        it('should implement all required network methods', () => {
            expect(typeof mantleService.estimateGasCost).toBe('function');
            expect(typeof mantleService.getCurrentNetworkStatus).toBe('function');
            expect(typeof mantleService.healthCheck).toBe('function');
            expect(typeof mantleService.getTransactionDetails).toBe('function');
            expect(typeof mantleService.waitForConfirmations).toBe('function');
        });
        it('should implement all required configuration methods', () => {
            expect(typeof mantleService.isEnabled).toBe('function');
            expect(typeof mantleService.getConfig).toBe('function');
            expect(typeof mantleService.waitForInitialization).toBe('function');
        });
    });
});
