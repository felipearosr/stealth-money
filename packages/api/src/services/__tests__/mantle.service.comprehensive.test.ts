/**
 * Comprehensive unit tests for MantleService
 * Tests wallet management, transfer operations, error handling, and network simulation
 */

import { 
  MantleService, 
  MantleTransferRequest, 
  MantleTransferResult, 
  TransferStatus,
  WalletBalance,
  NetworkStatus,
  GasEstimate,
  ConversionResult,
  MantleWallet,
  WalletCreationResult
} from '../mantle.service';
import { MantleError, MantleErrorType } from '../../utils/mantle-error-handler';

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
      bridgeContractAddress: '0x1234567890123456789012345678901234567890',
      gasLimit: {
        transfer: 100000,
        swap: 150000
      },
      confirmationBlocks: 1
    }))
  }
}));

// Mock crypto module
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('1234567890abcdef1234567890abcdef', 'hex')),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => Buffer.from('hashedkey', 'utf8'))
  })),
  createCipheriv: jest.fn(() => ({
    update: jest.fn(() => 'encrypted'),
    final: jest.fn(() => 'data')
  })),
  createDecipheriv: jest.fn(() => ({
    update: jest.fn(() => 'decrypted'),
    final: jest.fn(() => 'key')
  }))
}));

// Mock ethers provider
const mockProvider = {
  getNetwork: jest.fn(),
  getBlockNumber: jest.fn(),
  getBalance: jest.fn(),
  getTransactionCount: jest.fn(),
  getCode: jest.fn(),
  getFeeData: jest.fn(),
  getTransactionReceipt: jest.fn(),
  estimateGas: jest.fn(),
  sendTransaction: jest.fn(),
  waitForTransaction: jest.fn()
};

// Mock ethers Contract
const mockContract = {
  balanceOf: jest.fn(),
  decimals: jest.fn(),
  symbol: jest.fn(),
  name: jest.fn(),
  transfer: {
    estimateGas: jest.fn(),
    populateTransaction: jest.fn()
  },
  approve: {
    estimateGas: jest.fn()
  }
};

// Mock ethers Wallet
const mockWallet = {
  address: '0x1234567890123456789012345678901234567890',
  privateKey: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  mnemonic: {
    phrase: 'test mnemonic phrase here for wallet creation'
  },
  connect: jest.fn().mockReturnThis(),
  sendTransaction: jest.fn(),
  signTransaction: jest.fn()
};

// Mock ethers functions
jest.mock('ethers', () => ({
  JsonRpcProvider: jest.fn(() => mockProvider),
  Contract: jest.fn(() => mockContract),
  Interface: jest.fn(() => ({
    encodeFunctionData: jest.fn(() => '0xabcdef1234567890')
  })),
  Wallet: Object.assign(jest.fn(() => mockWallet), {
    createRandom: jest.fn(() => mockWallet)
  }),
  HDNodeWallet: {
    fromPhrase: jest.fn(() => mockWallet)
  },
  Mnemonic: {
    isValidMnemonic: jest.fn(() => true)
  },
  isAddress: jest.fn(() => true),
  computeAddress: jest.fn(() => '0x1234567890123456789012345678901234567890'),
  formatEther: jest.fn(() => '1.0'),
  formatUnits: jest.fn(() => '1.0'),
  parseUnits: jest.fn(() => BigInt('1000000')),
  parseEther: jest.fn(() => BigInt('1000000000000000000'))
}));

describe('MantleService - Comprehensive Tests', () => {
  let mantleService: MantleService;
  const mockUserId = 'test-user-123';
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup provider mocks with realistic values
    mockProvider.getNetwork.mockResolvedValue({ chainId: BigInt(5003) });
    mockProvider.getBlockNumber.mockResolvedValue(12345);
    mockProvider.getBalance.mockResolvedValue(BigInt('2000000000000000000')); // 2 MNT
    mockProvider.getTransactionCount.mockResolvedValue(5);
    mockProvider.getCode.mockResolvedValue('0x');
    mockProvider.getFeeData.mockResolvedValue({
      gasPrice: BigInt('1000000000'), // 1 gwei
      maxFeePerGas: BigInt('2000000000'), // 2 gwei
      maxPriorityFeePerGas: BigInt('1000000000') // 1 gwei
    });
    mockProvider.estimateGas.mockResolvedValue(BigInt('21000'));
    mockProvider.sendTransaction.mockResolvedValue({
      hash: mockTxHash,
      wait: jest.fn().mockResolvedValue({
        hash: mockTxHash,
        blockNumber: 12346,
        status: 1,
        gasUsed: BigInt('21000')
      })
    });
    mockProvider.getTransactionReceipt.mockResolvedValue({
      hash: mockTxHash,
      blockNumber: 12346,
      status: 1,
      gasUsed: BigInt('21000'),
      gasPrice: BigInt('1000000000')
    });

    // Setup contract mocks
    mockContract.balanceOf.mockResolvedValue(BigInt('1000000')); // 1 USDC (6 decimals)
    mockContract.decimals.mockResolvedValue(6);
    mockContract.symbol.mockResolvedValue('USDC');
    mockContract.name.mockResolvedValue('USD Coin');
    mockContract.transfer.estimateGas.mockResolvedValue(BigInt('65000'));
    mockContract.transfer.populateTransaction.mockResolvedValue({
      to: '0x2c852e740B62308c46DD29B982FBb650D063Bd07',
      data: '0xa9059cbb000000000000000000000000',
      gasLimit: BigInt('65000')
    });

    // Setup wallet mocks
    mockWallet.connect.mockReturnValue(mockWallet);
    mockWallet.sendTransaction.mockResolvedValue({
      hash: mockTxHash,
      wait: jest.fn().mockResolvedValue({
        hash: mockTxHash,
        blockNumber: 12346,
        status: 1
      })
    });

    mantleService = new MantleService();
    await mantleService.waitForInitialization();
    
    // Mock the service as enabled and initialized
    jest.spyOn(mantleService, 'isEnabled').mockReturnValue(true);
    (mantleService as any).provider = mockProvider;
    (mantleService as any).isInitialized = true;
  });

  describe('Wallet Management - Comprehensive', () => {
    describe('createWallet', () => {
      it('should create wallet with all options', async () => {
        const result = await mantleService.createWallet(mockUserId, {
          generateMnemonic: true,
          encryptPrivateKey: true
        });

        expect(result.wallet).toBeDefined();
        expect(result.wallet.address).toBe(mockAddress);
        expect(result.wallet.userId).toBe(mockUserId);
        expect(result.wallet.encryptedPrivateKey).toBeDefined();
        expect(result.mnemonic).toBe('test mnemonic phrase here for wallet creation');
        expect(result.wallet.createdAt).toBeInstanceOf(Date);
      });

      it('should handle wallet creation with retry logic', async () => {
        const { Wallet } = require('ethers');
        Wallet.createRandom
          .mockImplementationOnce(() => { throw new Error('Random failure'); })
          .mockImplementationOnce(() => mockWallet);

        const result = await mantleService.createWallet(mockUserId);
        expect(result.wallet).toBeDefined();
      });

      it('should validate user ID parameter', async () => {
        await expect(mantleService.createWallet(''))
          .rejects.toThrow();
      });
    });

    describe('wallet security', () => {
      it('should encrypt private keys securely', async () => {
        const result = await mantleService.createWallet(mockUserId, {
          encryptPrivateKey: true
        });

        expect(result.wallet.encryptedPrivateKey).toContain(':');
        expect(result.wallet.encryptedPrivateKey).not.toContain(mockWallet.privateKey);
      });

      it('should handle encryption errors gracefully', async () => {
        const crypto = require('crypto');
        crypto.createCipheriv.mockImplementationOnce(() => {
          throw new Error('Encryption failed');
        });

        await expect(mantleService.createWallet(mockUserId, { encryptPrivateKey: true }))
          .rejects.toThrow('Failed to create Mantle wallet');
      });
    });

    describe('getWalletBalance - Advanced', () => {
      it('should get comprehensive wallet balance with USD values', async () => {
        const result = await mantleService.getWalletBalance(mockAddress, true);

        expect(result).toEqual({
          native: '1.0',
          stablecoin: '1.0',
          address: mockAddress,
          nativeUSD: '0.500000',
          stablecoinUSD: '1.000000',
          totalUSD: '1.500000'
        });
      });

      it('should handle stablecoin contract failures gracefully', async () => {
        mockContract.balanceOf.mockRejectedValue(new Error('Contract not found'));

        const result = await mantleService.getWalletBalance(mockAddress);
        expect(result.stablecoin).toBe('0');
        expect(result.native).toBe('1.0');
      });

      it('should handle network congestion with retry', async () => {
        mockProvider.getBalance
          .mockRejectedValueOnce(new Error('network timeout'))
          .mockResolvedValue(BigInt('2000000000000000000'));

        const result = await mantleService.getWalletBalance(mockAddress);
        expect(result.native).toBe('1.0');
      });

      it('should validate address format', async () => {
        const { isAddress } = require('ethers');
        isAddress.mockReturnValue(false);

        await expect(mantleService.getWalletBalance('invalid-address'))
          .rejects.toThrow(MantleError);
      });
    });

    describe('getMultipleTokenBalances', () => {
      it('should handle mixed success/failure scenarios', async () => {
        const tokenAddresses = [
          '0x1111111111111111111111111111111111111111',
          '0x2222222222222222222222222222222222222222',
          '0x3333333333333333333333333333333333333333'
        ];

        mockContract.balanceOf
          .mockResolvedValueOnce(BigInt('1000000'))
          .mockRejectedValueOnce(new Error('Token 2 failed'))
          .mockResolvedValueOnce(BigInt('2000000'));

        const result = await mantleService.getMultipleTokenBalances(mockAddress, tokenAddresses);
        expect(result).toHaveLength(2);
      });
    });
  });

  describe('Transfer Operations - Comprehensive', () => {
    const baseTransferRequest: MantleTransferRequest = {
      fromAddress: mockAddress,
      toAddress: '0x0987654321098765432109876543210987654321',
      amount: '1.0',
      userId: mockUserId
    };

    describe('initiateTransfer - Advanced Scenarios', () => {
      it('should handle ERC20 transfers with approval', async () => {
        const tokenTransferRequest: MantleTransferRequest = {
          ...baseTransferRequest,
          tokenAddress: '0x2c852e740B62308c46DD29B982FBb650D063Bd07'
        };

        const result = await mantleService.initiateTransfer(tokenTransferRequest);
        expect(result.status).toBe('PENDING');
        expect(result.transactionHash).toBe(mockTxHash);
      });

      it('should handle custom gas parameters', async () => {
        const customGasRequest: MantleTransferRequest = {
          ...baseTransferRequest,
          gasPrice: '2000000000',
          gasLimit: '50000'
        };

        const result = await mantleService.initiateTransfer(customGasRequest);
        expect(result.status).toBe('PENDING');
      });

      it('should validate sufficient balance for complex scenarios', async () => {
        // Mock insufficient balance for gas + transfer
        mockProvider.getBalance.mockResolvedValue(BigInt('100000000000000')); // Very small amount

        const result = await mantleService.initiateTransfer(baseTransferRequest);
        expect(result.status).toBe('FAILED');
        expect(result.error).toContain('Insufficient');
      });

      it('should handle network congestion gracefully', async () => {
        mockProvider.estimateGas.mockRejectedValue(new Error('network congestion'));

        const result = await mantleService.initiateTransfer(baseTransferRequest);
        expect(result.status).toBe('FAILED');
        expect(result.error).toBeDefined();
      });
    });

    describe('getTransferStatus - Comprehensive', () => {
      const mockTransferId = 'mantle_transfer_1234567890_abcdef123';

      beforeEach(() => {
        jest.spyOn(mantleService as any, 'getTransactionHashForTransfer')
          .mockResolvedValue(mockTxHash);
      });

      it('should track transfer through all states', async () => {
        // Test progression: PENDING -> CONFIRMED
        mockProvider.getTransactionReceipt
          .mockResolvedValueOnce(null) // Not found initially
          .mockResolvedValue({
            hash: mockTxHash,
            blockNumber: 12346,
            status: 1,
            gasUsed: BigInt('21000'),
            gasPrice: BigInt('1000000000')
          });

        mockProvider.getBlockNumber
          .mockResolvedValueOnce(12345) // 0 confirmations
          .mockResolvedValue(12347); // 1 confirmation

        const status1 = await mantleService.getTransferStatus(mockTransferId);
        expect(status1.status).toBe('PENDING');

        const status2 = await mantleService.getTransferStatus(mockTransferId);
        expect(status2.status).toBe('CONFIRMED');
        expect(status2.confirmations).toBe(1);
      });

      it('should handle failed transactions', async () => {
        mockProvider.getTransactionReceipt.mockResolvedValue({
          hash: mockTxHash,
          blockNumber: 12346,
          status: 0, // Failed
          gasUsed: BigInt('21000'),
          gasPrice: BigInt('1000000000')
        });

        const status = await mantleService.getTransferStatus(mockTransferId);
        expect(status.status).toBe('FAILED');
      });

      it('should calculate gas costs in USD', async () => {
        const status = await mantleService.getTransferStatus(mockTransferId);
        expect(status.gasCostUSD).toBeDefined();
        expect(parseFloat(status.gasCostUSD!)).toBeGreaterThan(0);
      });
    });

    describe('monitorTransfer', () => {
      const mockTransferId = 'mantle_transfer_1234567890_abcdef123';

      it('should monitor transfer with callback updates', async () => {
        const statusCallback = jest.fn();
        
        jest.spyOn(mantleService, 'getTransferStatus')
          .mockResolvedValueOnce({
            transferId: mockTransferId,
            status: 'PENDING',
            confirmations: 0,
            updatedAt: new Date()
          })
          .mockResolvedValue({
            transferId: mockTransferId,
            transactionHash: mockTxHash,
            status: 'CONFIRMED',
            confirmations: 1,
            updatedAt: new Date()
          });

        const finalStatus = await mantleService.monitorTransfer(
          mockTransferId,
          statusCallback,
          5000 // 5 second timeout
        );

        expect(finalStatus.status).toBe('CONFIRMED');
        expect(statusCallback).toHaveBeenCalled();
      });

      it('should handle monitoring timeout', async () => {
        jest.spyOn(mantleService, 'getTransferStatus')
          .mockResolvedValue({
            transferId: mockTransferId,
            status: 'PENDING',
            confirmations: 0,
            updatedAt: new Date()
          });

        const finalStatus = await mantleService.monitorTransfer(
          mockTransferId,
          undefined,
          1000 // 1 second timeout
        );

        expect(finalStatus.error).toContain('timeout');
      });
    });
  });

  describe('Network Operations - Comprehensive', () => {
    describe('getCurrentNetworkStatus', () => {
      it('should return comprehensive network status', async () => {
        const status = await mantleService.getCurrentNetworkStatus();

        expect(status).toEqual({
          connected: true,
          blockNumber: 12345,
          gasPrice: '1000000000',
          networkId: 5003,
          latency: expect.any(Number)
        });
        expect(status.latency).toBeGreaterThan(0);
      });

      it('should handle network disconnection', async () => {
        mockProvider.getBlockNumber.mockRejectedValue(new Error('Network error'));

        const status = await mantleService.getCurrentNetworkStatus();
        expect(status.connected).toBe(false);
        expect(status.blockNumber).toBe(0);
      });
    });

    describe('healthCheck', () => {
      it('should return comprehensive health status', async () => {
        const health = await mantleService.healthCheck();

        expect(health).toEqual({
          enabled: true,
          connected: true,
          environment: 'testnet',
          networkId: 5003,
          rpcUrl: 'https://rpc.sepolia.mantle.xyz',
          blockNumber: 12345,
          gasPrice: '1000000000',
          latency: expect.any(Number),
          stablecoinConfigured: true,
          bridgeConfigured: true
        });
      });

      it('should detect service disabled state', async () => {
        const disabledService = new MantleService();
        jest.spyOn(disabledService, 'isEnabled').mockReturnValue(false);

        const health = await disabledService.healthCheck();
        expect(health.enabled).toBe(false);
        expect(health.error).toBe('Mantle service is disabled');
      });
    });

    describe('estimateGasCost', () => {
      it('should provide accurate gas estimates', async () => {
        const estimate = await mantleService.estimateGasCost(100, 'USD');

        expect(estimate).toEqual({
          gasLimit: '100000',
          gasPrice: '1000000000',
          totalCost: '1.0',
          totalCostUSD: expect.any(String)
        });
      });

      it('should handle gas estimation failures', async () => {
        mockProvider.getFeeData.mockRejectedValue(new Error('Fee data unavailable'));

        await expect(mantleService.estimateGasCost(100, 'USD'))
          .rejects.toThrow('Failed to estimate gas cost');
      });
    });
  });

  describe('Conversion Operations', () => {
    describe('convertToStablecoin', () => {
      it('should handle USD to stablecoin conversion', async () => {
        const result = await mantleService.convertToStablecoin(100, 'USD');

        expect(result).toEqual({
          fromAmount: '100',
          toAmount: '100',
          exchangeRate: '1',
          slippage: '0.1',
          estimatedGas: expect.any(Object),
          route: ['USDC']
        });
      });

      it('should handle EUR to stablecoin conversion', async () => {
        const result = await mantleService.convertToStablecoin(100, 'EUR');

        expect(result.exchangeRate).toBe('1.08');
        expect(result.route).toEqual(['EUR', 'USD', 'USDC']);
      });
    });

    describe('convertFromStablecoin', () => {
      it('should handle stablecoin to fiat conversion', async () => {
        const result = await mantleService.convertFromStablecoin(100, 'CLP');

        expect(result.exchangeRate).toBe('1000');
        expect(result.route).toEqual(['USDC', 'USD', 'CLP']);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service initialization failures', async () => {
      mockProvider.getNetwork.mockRejectedValue(new Error('Network unavailable'));
      
      const failedService = new MantleService();
      await failedService.waitForInitialization();
      
      expect(failedService.isEnabled()).toBe(false);
    });

    it('should handle provider connection issues', async () => {
      jest.spyOn(mantleService, 'isEnabled').mockReturnValue(false);

      await expect(mantleService.getWalletBalance(mockAddress))
        .rejects.toThrow(MantleError);
    });

    it('should handle malformed transaction responses', async () => {
      mockProvider.getTransactionReceipt.mockResolvedValue(null);

      const status = await mantleService.getTransferStatus('test-id');
      expect(status.status).toBe('PENDING');
    });

    it('should validate input parameters', async () => {
      await expect(mantleService.createWallet(''))
        .rejects.toThrow();

      const { isAddress } = require('ethers');
      isAddress.mockReturnValue(false);

      await expect(mantleService.getWalletBalance('invalid'))
        .rejects.toThrow(MantleError);
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent wallet creation', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        mantleService.createWallet(`user-${i}`)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.wallet).toBeDefined();
      });
    });

    it('should handle concurrent balance checks', async () => {
      const addresses = Array.from({ length: 3 }, (_, i) => 
        `0x${i.toString().padStart(40, '0')}`
      );

      const promises = addresses.map(addr => 
        mantleService.getWalletBalance(addr)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
    });

    it('should handle rate limiting gracefully', async () => {
      // Simulate rate limiting
      mockProvider.getBalance
        .mockRejectedValueOnce(new Error('rate limit exceeded'))
        .mockResolvedValue(BigInt('1000000000000000000'));

      const result = await mantleService.getWalletBalance(mockAddress);
      expect(result.native).toBe('1.0');
    });
  });

  describe('Transaction Confirmation Handling', () => {
    it('should wait for required confirmations', async () => {
      mockProvider.getTransactionReceipt.mockResolvedValue({
        hash: mockTxHash,
        blockNumber: 12346,
        status: 1,
        gasUsed: BigInt('21000'),
        gasPrice: BigInt('1000000000')
      });

      mockProvider.getBlockNumber
        .mockResolvedValueOnce(12346) // 0 confirmations
        .mockResolvedValueOnce(12347) // 1 confirmation
        .mockResolvedValue(12348); // 2 confirmations

      const confirmed = await mantleService.waitForConfirmations(mockTxHash, 2);
      expect(confirmed).toBe(true);
    });

    it('should timeout waiting for confirmations', async () => {
      mockProvider.getTransactionReceipt.mockResolvedValue({
        hash: mockTxHash,
        blockNumber: 12346,
        status: 1,
        gasUsed: BigInt('21000'),
        gasPrice: BigInt('1000000000')
      });

      mockProvider.getBlockNumber.mockResolvedValue(12346); // Always 0 confirmations

      const confirmed = await mantleService.waitForConfirmations(mockTxHash, 1);
      expect(confirmed).toBe(false);
    });
  });
});