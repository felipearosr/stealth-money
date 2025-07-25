import { MantleService, MantleTransferRequest, MantleTransferResult, TransferStatus } from '../mantle.service';

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

// Mock crypto module
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('1234567890abcdef1234567890abcdef', 'hex'))
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
  estimateGas: jest.fn()
};

// Mock ethers Contract
const mockContract = {
  balanceOf: jest.fn(),
  decimals: jest.fn(),
  symbol: jest.fn(),
  name: jest.fn(),
  transfer: {
    estimateGas: jest.fn()
  }
};

// Mock ethers functions
jest.mock('ethers', () => ({
  JsonRpcProvider: jest.fn(() => mockProvider),
  Contract: jest.fn(() => mockContract),
  Interface: jest.fn(() => ({
    encodeFunctionData: jest.fn(() => '0xabcdef1234567890')
  })),
  Wallet: {
    createRandom: jest.fn(),
  },
  isAddress: jest.fn(),
  formatEther: jest.fn(),
  formatUnits: jest.fn(),
  parseUnits: jest.fn(),
  parseEther: jest.fn()
}));

describe('MantleService - Transfer Operations', () => {
  let mantleService: MantleService;
  const mockUserId = 'test-user-123';
  const mockFromAddress = '0x1234567890123456789012345678901234567890';
  const mockToAddress = '0x0987654321098765432109876543210987654321';
  const mockTokenAddress = '0x2c852e740B62308c46DD29B982FBb650D063Bd07';
  const mockTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup provider mocks
    mockProvider.getNetwork.mockResolvedValue({ chainId: BigInt(5003) });
    mockProvider.getBlockNumber.mockResolvedValue(12345);
    mockProvider.getBalance.mockResolvedValue(BigInt('2000000000000000000')); // 2 ETH
    mockProvider.getTransactionCount.mockResolvedValue(5);
    mockProvider.getCode.mockResolvedValue('0x');
    mockProvider.getFeeData.mockResolvedValue({
      gasPrice: BigInt('1000000000') // 1 gwei
    });
    mockProvider.estimateGas.mockResolvedValue(BigInt('21000'));
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

    // Setup ethers mocks
    const { formatEther, formatUnits, parseUnits, parseEther, isAddress } = require('ethers');
    formatEther.mockReturnValue('1.0');
    formatUnits.mockReturnValue('1.0');
    parseUnits.mockReturnValue(BigInt('1000000'));
    parseEther.mockReturnValue(BigInt('1000000000000000000'));
    isAddress.mockReturnValue(true);

    mantleService = new MantleService();
    await mantleService.waitForInitialization();
    
    // Mock the service as enabled and initialized
    jest.spyOn(mantleService, 'isEnabled').mockReturnValue(true);
    (mantleService as any).provider = mockProvider;
  });

  describe('initiateTransfer', () => {
    const baseTransferRequest: MantleTransferRequest = {
      fromAddress: mockFromAddress,
      toAddress: mockToAddress,
      amount: '1.0',
      userId: mockUserId
    };

    it('should initiate a native token transfer successfully', async () => {
      const result = await mantleService.initiateTransfer(baseTransferRequest);

      expect(result).toBeDefined();
      expect(result.transferId).toMatch(/^mantle_transfer_\d+_[a-z0-9]+$/);
      expect(result.status).toBe('PENDING');
      expect(result.transactionHash).toBeDefined();
      expect(result.gasEstimate).toBeDefined();
      expect(result.gasEstimate.totalCostUSD).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should initiate an ERC20 token transfer successfully', async () => {
      const tokenTransferRequest: MantleTransferRequest = {
        ...baseTransferRequest,
        tokenAddress: mockTokenAddress
      };

      const result = await mantleService.initiateTransfer(tokenTransferRequest);

      expect(result).toBeDefined();
      expect(result.status).toBe('PENDING');
      expect(result.transactionHash).toBeDefined();
      expect(mockContract.transfer.estimateGas).toHaveBeenCalled();
    });

    it('should validate sender address', async () => {
      const { isAddress } = require('ethers');
      isAddress.mockReturnValueOnce(false);

      const invalidRequest: MantleTransferRequest = {
        ...baseTransferRequest,
        fromAddress: 'invalid-address'
      };

      const result = await mantleService.initiateTransfer(invalidRequest);

      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('Invalid sender address');
    });

    it('should validate recipient address', async () => {
      const { isAddress } = require('ethers');
      isAddress
        .mockReturnValueOnce(true)  // fromAddress is valid
        .mockReturnValueOnce(false); // toAddress is invalid

      const invalidRequest: MantleTransferRequest = {
        ...baseTransferRequest,
        toAddress: 'invalid-address'
      };

      const result = await mantleService.initiateTransfer(invalidRequest);

      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('Invalid recipient address');
    });

    it('should check sufficient balance for native transfers', async () => {
      // Mock insufficient balance
      mockProvider.getBalance.mockResolvedValue(BigInt('100000000000000000')); // 0.1 ETH

      const result = await mantleService.initiateTransfer(baseTransferRequest);

      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('Insufficient MNT balance');
    });

    it('should check sufficient token balance for ERC20 transfers', async () => {
      // Mock insufficient token balance
      mockContract.balanceOf.mockResolvedValue(BigInt('500000')); // 0.5 USDC

      const tokenTransferRequest: MantleTransferRequest = {
        ...baseTransferRequest,
        tokenAddress: mockTokenAddress
      };

      const result = await mantleService.initiateTransfer(tokenTransferRequest);

      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('Insufficient token balance');
    });

    it('should use custom gas price when provided', async () => {
      const customGasPrice = '2000000000'; // 2 gwei
      const requestWithCustomGas: MantleTransferRequest = {
        ...baseTransferRequest,
        gasPrice: customGasPrice
      };

      await mantleService.initiateTransfer(requestWithCustomGas);

      // The gas estimate should use the custom gas price
      // This is verified through the gas estimation process
      expect(mockProvider.getFeeData).not.toHaveBeenCalled();
    });

    it('should handle transfer initiation errors gracefully', async () => {
      // Mock provider error
      mockProvider.estimateGas.mockRejectedValue(new Error('Network error'));

      const result = await mantleService.initiateTransfer(baseTransferRequest);

      expect(result.status).toBe('FAILED');
      expect(result.error).toBeDefined();
    });

    it('should throw error when service is not enabled', async () => {
      const disabledService = new MantleService();
      jest.spyOn(disabledService, 'isEnabled').mockReturnValue(false);

      await expect(disabledService.initiateTransfer(baseTransferRequest))
        .rejects.toThrow('Mantle service is not enabled or not properly initialized');
    });
  });

  describe('getTransferStatus', () => {
    const mockTransferId = 'mantle_transfer_1234567890_abcdef123';

    beforeEach(() => {
      // Mock the private method getTransactionHashForTransfer
      jest.spyOn(mantleService as any, 'getTransactionHashForTransfer')
        .mockResolvedValue(mockTxHash);
    });

    it('should get transfer status for confirmed transaction', async () => {
      mockProvider.getTransactionReceipt.mockResolvedValue({
        hash: mockTxHash,
        blockNumber: 12346,
        status: 1,
        gasUsed: BigInt('21000'),
        gasPrice: BigInt('1000000000')
      });
      mockProvider.getBlockNumber.mockResolvedValue(12347); // 1 confirmation

      const status = await mantleService.getTransferStatus(mockTransferId);

      expect(status).toBeDefined();
      expect(status.transferId).toBe(mockTransferId);
      expect(status.transactionHash).toBe(mockTxHash);
      expect(status.status).toBe('CONFIRMED');
      expect(status.confirmations).toBe(1);
      expect(status.gasUsed).toBe('21000');
      expect(status.gasCost).toBeDefined();
      expect(status.gasCostUSD).toBeDefined();
    });

    it('should get transfer status for pending transaction', async () => {
      mockProvider.getTransactionReceipt.mockResolvedValue({
        hash: mockTxHash,
        blockNumber: 12346,
        status: 1,
        gasUsed: BigInt('21000'),
        gasPrice: BigInt('1000000000')
      });
      mockProvider.getBlockNumber.mockResolvedValue(12346); // 0 confirmations

      const status = await mantleService.getTransferStatus(mockTransferId);

      expect(status.status).toBe('PENDING');
      expect(status.confirmations).toBe(0);
    });

    it('should get transfer status for failed transaction', async () => {
      mockProvider.getTransactionReceipt.mockResolvedValue({
        hash: mockTxHash,
        blockNumber: 12346,
        status: 0, // Failed transaction
        gasUsed: BigInt('21000'),
        gasPrice: BigInt('1000000000')
      });

      const status = await mantleService.getTransferStatus(mockTransferId);

      expect(status.status).toBe('FAILED');
    });

    it('should handle transfer without transaction hash', async () => {
      jest.spyOn(mantleService as any, 'getTransactionHashForTransfer')
        .mockResolvedValue(null);

      const status = await mantleService.getTransferStatus(mockTransferId);

      expect(status.status).toBe('PENDING');
      expect(status.transactionHash).toBeUndefined();
      expect(status.confirmations).toBe(0);
    });

    it('should handle transaction not found on blockchain', async () => {
      mockProvider.getTransactionReceipt.mockResolvedValue(null);

      const status = await mantleService.getTransferStatus(mockTransferId);

      expect(status.status).toBe('PENDING');
      expect(status.confirmations).toBe(0);
    });

    it('should handle status check errors gracefully', async () => {
      jest.spyOn(mantleService as any, 'getTransactionHashForTransfer')
        .mockRejectedValue(new Error('Database error'));

      const status = await mantleService.getTransferStatus(mockTransferId);

      expect(status.status).toBe('FAILED');
      expect(status.error).toContain('Database error');
    });
  });

  describe('estimateTransferGas', () => {
    const baseTransferRequest: MantleTransferRequest = {
      fromAddress: mockFromAddress,
      toAddress: mockToAddress,
      amount: '1.0',
      userId: mockUserId
    };

    it('should estimate gas for native token transfer', async () => {
      const gasEstimate = await mantleService.estimateTransferGas(baseTransferRequest);

      expect(gasEstimate).toBeDefined();
      expect(gasEstimate.gasLimit).toBeDefined();
      expect(gasEstimate.gasPrice).toBeDefined();
      expect(gasEstimate.totalCost).toBeDefined();
      expect(gasEstimate.totalCostUSD).toBeDefined();
      expect(mockProvider.estimateGas).toHaveBeenCalled();
    });

    it('should estimate gas for ERC20 token transfer', async () => {
      const tokenTransferRequest: MantleTransferRequest = {
        ...baseTransferRequest,
        tokenAddress: mockTokenAddress
      };

      const gasEstimate = await mantleService.estimateTransferGas(tokenTransferRequest);

      expect(gasEstimate).toBeDefined();
      expect(mockContract.transfer.estimateGas).toHaveBeenCalled();
    });

    it('should use custom gas price when provided', async () => {
      const customGasPrice = '2000000000';
      const requestWithCustomGas: MantleTransferRequest = {
        ...baseTransferRequest,
        gasPrice: customGasPrice
      };

      const gasEstimate = await mantleService.estimateTransferGas(requestWithCustomGas);

      expect(gasEstimate.gasPrice).toBe(customGasPrice);
    });

    it('should use fallback gas limit when estimation fails', async () => {
      mockProvider.estimateGas.mockRejectedValue(new Error('Estimation failed'));

      const gasEstimate = await mantleService.estimateTransferGas(baseTransferRequest);

      expect(gasEstimate).toBeDefined();
      expect(gasEstimate.gasLimit).toBe('26000'); // 21000 + 5000 buffer
    });

    it('should handle gas estimation errors', async () => {
      mockProvider.getFeeData.mockRejectedValue(new Error('Network error'));

      await expect(mantleService.estimateTransferGas(baseTransferRequest))
        .rejects.toThrow('Failed to estimate transfer gas');
    });
  });

  describe('monitorTransfer', () => {
    const mockTransferId = 'mantle_transfer_1234567890_abcdef123';
    let statusUpdateCallback: jest.Mock;

    beforeEach(() => {
      statusUpdateCallback = jest.fn();
      
      // Mock getTransferStatus to return different statuses over time
      jest.spyOn(mantleService, 'getTransferStatus')
        .mockResolvedValueOnce({
          transferId: mockTransferId,
          status: 'PENDING',
          confirmations: 0,
          updatedAt: new Date()
        })
        .mockResolvedValueOnce({
          transferId: mockTransferId,
          transactionHash: mockTxHash,
          status: 'CONFIRMED',
          confirmations: 1,
          updatedAt: new Date()
        });
    });

    it('should monitor transfer until confirmation', async () => {
      const finalStatus = await mantleService.monitorTransfer(
        mockTransferId,
        statusUpdateCallback,
        10000 // 10 second timeout for test
      );

      expect(finalStatus.status).toBe('CONFIRMED');
      expect(statusUpdateCallback).toHaveBeenCalledTimes(2);
    });

    it('should handle failed transfers', async () => {
      jest.spyOn(mantleService, 'getTransferStatus')
        .mockResolvedValue({
          transferId: mockTransferId,
          status: 'FAILED',
          confirmations: 0,
          error: 'Transaction reverted',
          updatedAt: new Date()
        });

      const finalStatus = await mantleService.monitorTransfer(mockTransferId);

      expect(finalStatus.status).toBe('FAILED');
      expect(finalStatus.error).toBe('Transaction reverted');
    });

    it('should timeout for long-running transfers', async () => {
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

    it('should handle monitoring errors gracefully', async () => {
      jest.spyOn(mantleService, 'getTransferStatus')
        .mockRejectedValue(new Error('Monitoring error'));

      const finalStatus = await mantleService.monitorTransfer(mockTransferId);

      expect(finalStatus.status).toBe('FAILED');
      expect(finalStatus.error).toContain('Monitoring error');
    });
  });

  describe('convertToStablecoin', () => {
    it('should convert USD to stablecoin with 1:1 rate', async () => {
      const result = await mantleService.convertToStablecoin(100, 'USD');

      expect(result).toBeDefined();
      expect(result.fromAmount).toBe('100');
      expect(result.toAmount).toBe('100');
      expect(result.exchangeRate).toBe('1');
      expect(result.route).toEqual(['USDC']);
    });

    it('should convert EUR to stablecoin with exchange rate', async () => {
      const result = await mantleService.convertToStablecoin(100, 'EUR');

      expect(result).toBeDefined();
      expect(result.fromAmount).toBe('100');
      expect(result.toAmount).toBe('108'); // 100 * 1.08
      expect(result.exchangeRate).toBe('1.08');
      expect(result.route).toEqual(['EUR', 'USD', 'USDC']);
    });

    it('should include gas estimate in conversion', async () => {
      const result = await mantleService.convertToStablecoin(100, 'USD');

      expect(result.estimatedGas).toBeDefined();
      expect(result.estimatedGas.totalCostUSD).toBeDefined();
    });

    it('should handle conversion errors', async () => {
      // Mock gas estimation failure
      jest.spyOn(mantleService, 'estimateGasCost')
        .mockRejectedValue(new Error('Gas estimation failed'));

      await expect(mantleService.convertToStablecoin(100, 'USD'))
        .rejects.toThrow('Failed to convert to stablecoin');
    });
  });

  describe('convertFromStablecoin', () => {
    it('should convert stablecoin to USD with 1:1 rate', async () => {
      const result = await mantleService.convertFromStablecoin(100, 'USD');

      expect(result).toBeDefined();
      expect(result.fromAmount).toBe('100');
      expect(result.toAmount).toBe('100');
      expect(result.exchangeRate).toBe('1');
      expect(result.route).toEqual(['USDC']);
    });

    it('should convert stablecoin to CLP with exchange rate', async () => {
      const result = await mantleService.convertFromStablecoin(100, 'CLP');

      expect(result).toBeDefined();
      expect(result.fromAmount).toBe('100');
      expect(result.toAmount).toBe('100000'); // 100 * 1000
      expect(result.exchangeRate).toBe('1000');
      expect(result.route).toEqual(['USDC', 'USD', 'CLP']);
    });

    it('should include slippage calculation', async () => {
      const result = await mantleService.convertFromStablecoin(100, 'EUR');

      expect(result.slippage).toBe('0.5');
    });
  });

  describe('Service State Management', () => {
    it('should throw error when service is not enabled for transfers', async () => {
      const disabledService = new MantleService();
      jest.spyOn(disabledService, 'isEnabled').mockReturnValue(false);

      const transferRequest: MantleTransferRequest = {
        fromAddress: mockFromAddress,
        toAddress: mockToAddress,
        amount: '1.0',
        userId: mockUserId
      };

      await expect(disabledService.initiateTransfer(transferRequest))
        .rejects.toThrow('Mantle service is not enabled or not properly initialized');
    });

    it('should handle provider initialization failures for transfers', async () => {
      const failedService = new MantleService();
      jest.spyOn(failedService, 'isEnabled').mockReturnValue(false);

      await expect(failedService.getTransferStatus('test-id'))
        .rejects.toThrow('Mantle service is not enabled or not properly initialized');
    });
  });
});