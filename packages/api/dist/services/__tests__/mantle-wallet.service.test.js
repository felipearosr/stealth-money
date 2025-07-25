"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mantle_service_1 = require("../mantle.service");
// Mock the mantle config
jest.mock('../../config/mantle.config', () => ({
    mantleConfig: {
        getConfig: jest.fn(() => ({
            enabled: true,
            environment: 'testnet',
            networkId: 5003,
            rpcUrl: 'https://rpc.sepolia.mantle.xyz',
            explorerUrl: 'https://explorer.testnet.mantle.xyz',
            nativeToken: 'MNT',
            stablecoinAddress: '0x2c852e740B62308c46DD29B982FBb650D063Bd07',
            bridgeContractAddress: '',
            gasLimit: {
                transfer: 100000,
                swap: 150000
            },
            confirmationBlocks: 1
        }))
    }
}));
// Mock ethers provider
const mockProvider = {
    getNetwork: jest.fn(),
    getBlockNumber: jest.fn(),
    getBalance: jest.fn(),
    getTransactionCount: jest.fn(),
    getCode: jest.fn(),
    getFeeData: jest.fn(),
    getTransactionReceipt: jest.fn()
};
// Mock ethers Contract
const mockContract = {
    balanceOf: jest.fn(),
    decimals: jest.fn(),
    symbol: jest.fn(),
    name: jest.fn()
};
// Mock ethers functions
const mockEthers = {
    JsonRpcProvider: jest.fn(() => mockProvider),
    Contract: jest.fn(() => mockContract),
    Wallet: {
        createRandom: jest.fn(),
    },
    HDNodeWallet: {
        fromPhrase: jest.fn()
    },
    Mnemonic: {
        isValidMnemonic: jest.fn()
    },
    isAddress: jest.fn(),
    computeAddress: jest.fn(),
    formatEther: jest.fn(),
    formatUnits: jest.fn(),
    parseUnits: jest.fn()
};
jest.mock('ethers', () => mockEthers);
describe('MantleService - Wallet Management', () => {
    let mantleService;
    const mockUserId = 'test-user-123';
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockPrivateKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    beforeEach(async () => {
        jest.clearAllMocks();
        // Setup provider mocks
        mockProvider.getNetwork.mockResolvedValue({ chainId: BigInt(5003) });
        mockProvider.getBlockNumber.mockResolvedValue(12345);
        mockProvider.getBalance.mockResolvedValue(BigInt('1000000000000000000')); // 1 ETH
        mockProvider.getTransactionCount.mockResolvedValue(5);
        mockProvider.getCode.mockResolvedValue('0x');
        mockProvider.getFeeData.mockResolvedValue({
            gasPrice: BigInt('1000000000') // 1 gwei
        });
        // Setup contract mocks
        mockContract.balanceOf.mockResolvedValue(BigInt('1000000')); // 1 USDC (6 decimals)
        mockContract.decimals.mockResolvedValue(6);
        mockContract.symbol.mockResolvedValue('USDC');
        mockContract.name.mockResolvedValue('USD Coin');
        // Setup ethers mocks
        mockEthers.formatEther.mockReturnValue('1.0');
        mockEthers.formatUnits.mockReturnValue('1.0');
        mockEthers.isAddress.mockReturnValue(true);
        mockEthers.computeAddress.mockReturnValue(mockAddress);
        mantleService = new mantle_service_1.MantleService();
        await mantleService.waitForInitialization();
    });
    describe('createWallet', () => {
        beforeEach(() => {
            const mockWallet = {
                address: mockAddress,
                privateKey: mockPrivateKey,
                mnemonic: {
                    phrase: 'test mnemonic phrase here for wallet creation'
                }
            };
            mockEthers.Wallet.createRandom.mockReturnValue(mockWallet);
        });
        it('should create a basic wallet successfully', async () => {
            const result = await mantleService.createWallet(mockUserId);
            expect(result.wallet).toBeDefined();
            expect(result.wallet.address).toBe(mockAddress);
            expect(result.wallet.userId).toBe(mockUserId);
            expect(result.wallet.id).toMatch(/^mantle_\d+_[a-z0-9]+$/);
            expect(result.wallet.createdAt).toBeInstanceOf(Date);
            expect(result.mnemonic).toBeUndefined();
        });
        it('should create wallet with mnemonic when requested', async () => {
            const result = await mantleService.createWallet(mockUserId, {
                generateMnemonic: true
            });
            expect(result.wallet).toBeDefined();
            expect(result.mnemonic).toBe('test mnemonic phrase here for wallet creation');
        });
        it('should create wallet with encrypted private key when requested', async () => {
            const result = await mantleService.createWallet(mockUserId, {
                encryptPrivateKey: true
            });
            expect(result.wallet).toBeDefined();
            expect(result.wallet.encryptedPrivateKey).toBeDefined();
            expect(result.wallet.encryptedPrivateKey).toContain(':'); // Should contain IV separator
        });
        it('should throw error when service is not enabled', async () => {
            const disabledService = new mantle_service_1.MantleService();
            // Mock the service as disabled
            jest.spyOn(disabledService, 'isEnabled').mockReturnValue(false);
            await expect(disabledService.createWallet(mockUserId))
                .rejects.toThrow('Mantle service is not enabled or not properly initialized');
        });
        it('should handle wallet creation errors gracefully', async () => {
            mockEthers.Wallet.createRandom.mockImplementation(() => {
                throw new Error('Wallet creation failed');
            });
            await expect(mantleService.createWallet(mockUserId))
                .rejects.toThrow('Failed to create Mantle wallet: Wallet creation failed');
        });
    });
    describe('createWalletFromMnemonic', () => {
        const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
        beforeEach(() => {
            mockEthers.Mnemonic.isValidMnemonic.mockReturnValue(true);
            const mockHDWallet = {
                address: mockAddress
            };
            mockEthers.HDNodeWallet.fromPhrase.mockReturnValue(mockHDWallet);
        });
        it('should create wallet from valid mnemonic', async () => {
            const result = await mantleService.createWalletFromMnemonic(mockUserId, validMnemonic);
            expect(result).toBeDefined();
            expect(result.address).toBe(mockAddress);
            expect(result.userId).toBe(mockUserId);
            expect(mockEthers.Mnemonic.isValidMnemonic).toHaveBeenCalledWith(validMnemonic);
            expect(mockEthers.HDNodeWallet.fromPhrase).toHaveBeenCalledWith(validMnemonic, undefined, "m/44'/60'/0'/0/0");
        });
        it('should use custom derivation path when provided', async () => {
            const customPath = "m/44'/60'/0'/0/1";
            await mantleService.createWalletFromMnemonic(mockUserId, validMnemonic, customPath);
            expect(mockEthers.HDNodeWallet.fromPhrase).toHaveBeenCalledWith(validMnemonic, undefined, customPath);
        });
        it('should reject invalid mnemonic', async () => {
            mockEthers.Mnemonic.isValidMnemonic.mockReturnValue(false);
            await expect(mantleService.createWalletFromMnemonic(mockUserId, 'invalid mnemonic'))
                .rejects.toThrow('Failed to create wallet from mnemonic: Invalid mnemonic phrase');
        });
        it('should handle mnemonic creation errors', async () => {
            mockEthers.HDNodeWallet.fromPhrase.mockImplementation(() => {
                throw new Error('HD wallet creation failed');
            });
            await expect(mantleService.createWalletFromMnemonic(mockUserId, validMnemonic))
                .rejects.toThrow('Failed to create wallet from mnemonic: HD wallet creation failed');
        });
    });
    describe('createWalletFromPrivateKey', () => {
        beforeEach(() => {
            const mockWallet = {
                address: mockAddress
            };
            // Update the Wallet mock to include both constructor and createRandom
            mockEthers.Wallet = Object.assign(jest.fn(() => mockWallet), {
                createRandom: mockEthers.Wallet.createRandom
            });
        });
        it('should create wallet from valid private key', async () => {
            const result = await mantleService.createWalletFromPrivateKey(mockUserId, mockPrivateKey);
            expect(result).toBeDefined();
            expect(result.address).toBe(mockAddress);
            expect(result.userId).toBe(mockUserId);
            expect(mockEthers.Wallet).toHaveBeenCalledWith(mockPrivateKey);
        });
        it('should handle invalid private key', async () => {
            mockEthers.Wallet = Object.assign(jest.fn(() => {
                throw new Error('Invalid private key');
            }), {
                createRandom: mockEthers.Wallet.createRandom
            });
            await expect(mantleService.createWalletFromPrivateKey(mockUserId, 'invalid-key'))
                .rejects.toThrow('Failed to create wallet from private key: Invalid private key');
        });
    });
    describe('deriveWalletAddress', () => {
        const mockPublicKey = '0x04abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        it('should derive address from public key', () => {
            const result = mantleService.deriveWalletAddress(mockPublicKey);
            expect(result).toBe(mockAddress);
            expect(mockEthers.computeAddress).toHaveBeenCalledWith(mockPublicKey);
        });
        it('should handle derivation errors', () => {
            mockEthers.computeAddress.mockImplementation(() => {
                throw new Error('Invalid public key');
            });
            expect(() => mantleService.deriveWalletAddress('invalid-key'))
                .toThrow('Failed to derive wallet address: Invalid public key');
        });
    });
    describe('isValidAddress', () => {
        it('should return true for valid address', () => {
            const result = mantleService.isValidAddress(mockAddress);
            expect(result).toBe(true);
            expect(mockEthers.isAddress).toHaveBeenCalledWith(mockAddress);
        });
        it('should return false for invalid address', () => {
            mockEthers.isAddress.mockReturnValue(false);
            const result = mantleService.isValidAddress('invalid-address');
            expect(result).toBe(false);
        });
        it('should handle validation errors gracefully', () => {
            mockEthers.isAddress.mockImplementation(() => {
                throw new Error('Validation error');
            });
            const result = mantleService.isValidAddress('error-address');
            expect(result).toBe(false);
        });
    });
    describe('getWalletBalance', () => {
        it('should get wallet balance with USD values', async () => {
            const result = await mantleService.getWalletBalance(mockAddress);
            expect(result).toBeDefined();
            expect(result.address).toBe(mockAddress);
            expect(result.native).toBe('1.0');
            expect(result.stablecoin).toBe('1.0');
            expect(result.nativeUSD).toBe('0.500000'); // 1.0 * 0.5
            expect(result.stablecoinUSD).toBe('1.000000'); // 1.0 * 1.0
            expect(result.totalUSD).toBe('1.500000'); // 0.5 + 1.0
            expect(mockProvider.getBalance).toHaveBeenCalledWith(mockAddress);
            expect(mockContract.balanceOf).toHaveBeenCalledWith(mockAddress);
        });
        it('should get wallet balance without USD values when requested', async () => {
            const result = await mantleService.getWalletBalance(mockAddress, false);
            expect(result.nativeUSD).toBeUndefined();
            expect(result.stablecoinUSD).toBeUndefined();
            expect(result.totalUSD).toBeUndefined();
        });
        it('should handle stablecoin balance errors gracefully', async () => {
            mockContract.balanceOf.mockRejectedValue(new Error('Token contract error'));
            const result = await mantleService.getWalletBalance(mockAddress);
            expect(result.stablecoin).toBe('0');
            expect(result.native).toBe('1.0');
        });
        it('should handle USD price fetch errors gracefully', async () => {
            // Mock getMNTPriceUSD to throw error
            jest.spyOn(mantleService, 'getMNTPriceUSD').mockRejectedValue(new Error('Price fetch failed'));
            const result = await mantleService.getWalletBalance(mockAddress);
            expect(result.nativeUSD).toBeUndefined();
            expect(result.stablecoinUSD).toBeUndefined();
            expect(result.totalUSD).toBeUndefined();
        });
    });
    describe('getTokenBalance', () => {
        const tokenAddress = '0x1234567890123456789012345678901234567890';
        it('should get token balance successfully', async () => {
            const result = await mantleService.getTokenBalance(mockAddress, tokenAddress);
            expect(result).toBeDefined();
            expect(result.address).toBe(tokenAddress);
            expect(result.symbol).toBe('USDC');
            expect(result.name).toBe('USD Coin');
            expect(result.balance).toBe('1.0');
            expect(result.decimals).toBe(6);
            expect(mockContract.balanceOf).toHaveBeenCalledWith(mockAddress);
            expect(mockContract.decimals).toHaveBeenCalled();
            expect(mockContract.symbol).toHaveBeenCalled();
            expect(mockContract.name).toHaveBeenCalled();
        });
        it('should handle token contract errors', async () => {
            mockContract.balanceOf.mockRejectedValue(new Error('Contract error'));
            await expect(mantleService.getTokenBalance(mockAddress, tokenAddress))
                .rejects.toThrow('Failed to get token balance: Contract error');
        });
    });
    describe('getMultipleTokenBalances', () => {
        const tokenAddresses = [
            '0x1234567890123456789012345678901234567890',
            '0x0987654321098765432109876543210987654321'
        ];
        it('should get multiple token balances successfully', async () => {
            const result = await mantleService.getMultipleTokenBalances(mockAddress, tokenAddresses);
            expect(result).toHaveLength(2);
            expect(result[0].symbol).toBe('USDC');
            expect(result[1].symbol).toBe('USDC');
        });
        it('should filter out failed token balance requests', async () => {
            // Make the second token fail
            mockContract.balanceOf
                .mockResolvedValueOnce(BigInt('1000000'))
                .mockRejectedValueOnce(new Error('Token 2 failed'));
            const result = await mantleService.getMultipleTokenBalances(mockAddress, tokenAddresses);
            expect(result).toHaveLength(1);
            expect(result[0].symbol).toBe('USDC');
        });
    });
    describe('getWalletInfo', () => {
        it('should get comprehensive wallet information', async () => {
            const result = await mantleService.getWalletInfo(mockAddress);
            expect(result).toBeDefined();
            expect(result.address).toBe(mockAddress);
            expect(result.isContract).toBe(false); // code is '0x'
            expect(result.balance).toBeDefined();
            expect(result.transactionCount).toBe(5);
            expect(mockProvider.getTransactionCount).toHaveBeenCalledWith(mockAddress);
            expect(mockProvider.getCode).toHaveBeenCalledWith(mockAddress);
        });
        it('should identify contract addresses', async () => {
            mockProvider.getCode.mockResolvedValue('0x608060405234801561001057600080fd5b50');
            const result = await mantleService.getWalletInfo(mockAddress);
            expect(result.isContract).toBe(true);
        });
        it('should handle wallet info errors', async () => {
            mockProvider.getTransactionCount.mockRejectedValue(new Error('Network error'));
            await expect(mantleService.getWalletInfo(mockAddress))
                .rejects.toThrow('Failed to get wallet info: Network error');
        });
    });
    describe('Service State Management', () => {
        it('should throw error when service is not enabled', async () => {
            const disabledService = new mantle_service_1.MantleService();
            jest.spyOn(disabledService, 'isEnabled').mockReturnValue(false);
            await expect(disabledService.getWalletBalance(mockAddress))
                .rejects.toThrow('Mantle service is not enabled or not properly initialized');
        });
        it('should handle provider initialization failures', async () => {
            mockProvider.getNetwork.mockRejectedValue(new Error('Network connection failed'));
            const failedService = new mantle_service_1.MantleService();
            await failedService.waitForInitialization();
            expect(failedService.isEnabled()).toBe(false);
        });
    });
});
