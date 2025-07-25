"use strict";
/**
 * Integration tests for Mantle wallet management functionality
 * These tests verify the actual implementation works correctly
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mantle_service_1 = require("../mantle.service");
describe('MantleService - Wallet Management Integration', () => {
    let mantleService;
    const testUserId = 'test-user-integration';
    beforeAll(async () => {
        // Set environment variable for testing
        process.env.MANTLE_ENABLED = 'true';
        mantleService = new mantle_service_1.MantleService();
        await mantleService.waitForInitialization();
    });
    afterAll(() => {
        // Clean up environment variable
        delete process.env.MANTLE_ENABLED;
    });
    describe('Service Initialization', () => {
        it('should initialize and be enabled', () => {
            expect(mantleService.isEnabled()).toBe(true);
        });
        it('should provide correct configuration', () => {
            const config = mantleService.getConfig();
            expect(config.enabled).toBe(true);
            expect(config.environment).toBe('testnet');
            expect(config.networkId).toBe(5003);
            expect(config.rpcUrl).toContain('mantle.xyz');
        });
        it('should connect to network successfully', async () => {
            const networkStatus = await mantleService.getCurrentNetworkStatus();
            expect(networkStatus.connected).toBe(true);
            expect(networkStatus.blockNumber).toBeGreaterThan(0);
            expect(networkStatus.networkId).toBe(5003);
        });
    });
    describe('Address Validation', () => {
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
        it('should reject invalid addresses', () => {
            const invalidAddresses = [
                'invalid-address',
                '0x123', // too short
                '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', // invalid characters
                '', // empty
                '1234567890123456789012345678901234567890' // missing 0x prefix
            ];
            invalidAddresses.forEach(address => {
                expect(mantleService.isValidAddress(address)).toBe(false);
            });
        });
    });
    describe('Wallet Creation', () => {
        it('should create basic wallet successfully', async () => {
            const result = await mantleService.createWallet(testUserId);
            expect(result.wallet).toBeDefined();
            expect(result.wallet.id).toMatch(/^mantle_\d+_[a-z0-9]+$/);
            expect(result.wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
            expect(result.wallet.userId).toBe(testUserId);
            expect(result.wallet.createdAt).toBeInstanceOf(Date);
            expect(result.mnemonic).toBeUndefined();
        });
        it('should create wallet with mnemonic when requested', async () => {
            const result = await mantleService.createWallet(testUserId, {
                generateMnemonic: true
            });
            expect(result.wallet).toBeDefined();
            expect(result.wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
            expect(result.mnemonic).toBeDefined();
            expect(typeof result.mnemonic).toBe('string');
            expect(result.mnemonic.split(' ').length).toBeGreaterThanOrEqual(12);
        });
        it('should create wallet with encrypted private key when requested', async () => {
            const result = await mantleService.createWallet(testUserId, {
                encryptPrivateKey: true
            });
            expect(result.wallet).toBeDefined();
            expect(result.wallet.encryptedPrivateKey).toBeDefined();
            expect(result.wallet.encryptedPrivateKey).toContain(':'); // Should contain IV separator
        });
        it('should create unique wallets for each call', async () => {
            const wallet1 = await mantleService.createWallet(testUserId);
            const wallet2 = await mantleService.createWallet(testUserId);
            expect(wallet1.wallet.address).not.toBe(wallet2.wallet.address);
            expect(wallet1.wallet.id).not.toBe(wallet2.wallet.id);
        });
    });
    describe('Wallet Balance Operations', () => {
        let testWalletAddress;
        beforeAll(async () => {
            const wallet = await mantleService.createWallet(testUserId);
            testWalletAddress = wallet.wallet.address;
        });
        it('should get wallet balance successfully', async () => {
            const balance = await mantleService.getWalletBalance(testWalletAddress);
            expect(balance).toBeDefined();
            expect(balance.address).toBe(testWalletAddress);
            expect(balance.native).toBeDefined();
            expect(balance.stablecoin).toBeDefined();
            expect(typeof balance.native).toBe('string');
            expect(typeof balance.stablecoin).toBe('string');
        });
        it('should include USD values by default', async () => {
            const balance = await mantleService.getWalletBalance(testWalletAddress);
            expect(balance.nativeUSD).toBeDefined();
            expect(balance.stablecoinUSD).toBeDefined();
            expect(balance.totalUSD).toBeDefined();
        });
        it('should exclude USD values when requested', async () => {
            const balance = await mantleService.getWalletBalance(testWalletAddress, false);
            expect(balance.nativeUSD).toBeUndefined();
            expect(balance.stablecoinUSD).toBeUndefined();
            expect(balance.totalUSD).toBeUndefined();
        });
        it('should get comprehensive wallet info', async () => {
            const walletInfo = await mantleService.getWalletInfo(testWalletAddress);
            expect(walletInfo).toBeDefined();
            expect(walletInfo.address).toBe(testWalletAddress);
            expect(typeof walletInfo.isContract).toBe('boolean');
            expect(typeof walletInfo.transactionCount).toBe('number');
            expect(walletInfo.balance).toBeDefined();
            expect(walletInfo.transactionCount).toBeGreaterThanOrEqual(0);
        });
    });
    describe('Gas Estimation', () => {
        it('should estimate gas costs successfully', async () => {
            const gasEstimate = await mantleService.estimateGasCost(100, 'USD');
            expect(gasEstimate).toBeDefined();
            expect(gasEstimate.gasLimit).toBeDefined();
            expect(gasEstimate.gasPrice).toBeDefined();
            expect(gasEstimate.totalCost).toBeDefined();
            expect(gasEstimate.totalCostUSD).toBeDefined();
            expect(parseInt(gasEstimate.gasLimit)).toBeGreaterThan(0);
            expect(parseFloat(gasEstimate.totalCost)).toBeGreaterThan(0);
            expect(parseFloat(gasEstimate.totalCostUSD)).toBeGreaterThan(0);
        });
        it('should provide consistent gas estimates', async () => {
            const estimate1 = await mantleService.estimateGasCost(100, 'USD');
            const estimate2 = await mantleService.estimateGasCost(100, 'USD');
            // Gas prices might vary slightly, but should be in the same ballpark
            const price1 = parseInt(estimate1.gasPrice);
            const price2 = parseInt(estimate2.gasPrice);
            const priceDifference = Math.abs(price1 - price2) / Math.max(price1, price2);
            expect(priceDifference).toBeLessThan(0.5); // Less than 50% difference
        });
    });
    describe('Health Check', () => {
        it('should perform comprehensive health check', async () => {
            const health = await mantleService.healthCheck();
            expect(health).toBeDefined();
            expect(health.enabled).toBe(true);
            expect(health.connected).toBe(true);
            expect(health.environment).toBe('testnet');
            expect(health.networkId).toBe(5003);
            expect(health.rpcUrl).toContain('mantle.xyz');
            expect(health.blockNumber).toBeGreaterThan(0);
            expect(health.latency).toBeGreaterThan(0);
            expect(health.stablecoinConfigured).toBe(true);
            expect(health.error).toBeUndefined();
        });
    });
    describe('Error Handling', () => {
        it('should handle invalid wallet addresses gracefully', async () => {
            await expect(mantleService.getWalletBalance('invalid-address'))
                .rejects.toThrow();
        });
        it('should handle network errors gracefully', async () => {
            // This test would require mocking network failures
            // For now, we'll just verify the service handles the current state correctly
            const networkStatus = await mantleService.getCurrentNetworkStatus();
            expect(networkStatus).toBeDefined();
            expect(typeof networkStatus.connected).toBe('boolean');
        });
    });
});
