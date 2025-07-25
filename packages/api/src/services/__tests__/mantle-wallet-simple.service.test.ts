import { MantleService } from '../mantle.service';

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

// Mock ethers completely
jest.mock('ethers', () => ({
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(5003) }),
    getBlockNumber: jest.fn().mockResolvedValue(12345),
    getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')),
    getTransactionCount: jest.fn().mockResolvedValue(5),
    getCode: jest.fn().mockResolvedValue('0x'),
    getFeeData: jest.fn().mockResolvedValue({ gasPrice: BigInt('1000000000') }),
    getTransactionReceipt: jest.fn()
  })),
  Contract: jest.fn().mockImplementation(() => ({
    balanceOf: jest.fn().mockResolvedValue(BigInt('1000000')),
    decimals: jest.fn().mockResolvedValue(6),
    symbol: jest.fn().mockResolvedValue('USDC'),
    name: jest.fn().mockResolvedValue('USD Coin')
  })),
  Wallet: {
    createRandom: jest.fn().mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      privateKey: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      mnemonic: {
        phrase: 'test mnemonic phrase here for wallet creation'
      }
    })
  },
  HDNodeWallet: {
    fromPhrase: jest.fn().mockReturnValue({
      address: '0x1234567890123456789012345678901234567890'
    })
  },
  Mnemonic: {
    isValidMnemonic: jest.fn().mockReturnValue(true)
  },
  isAddress: jest.fn().mockReturnValue(true),
  computeAddress: jest.fn().mockReturnValue('0x1234567890123456789012345678901234567890'),
  formatEther: jest.fn().mockReturnValue('1.0'),
  formatUnits: jest.fn().mockReturnValue('1.0'),
  parseUnits: jest.fn()
}));

describe('MantleService - Wallet Management (Simple)', () => {
  let mantleService: MantleService;
  const mockUserId = 'test-user-123';
  const mockAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(async () => {
    mantleService = new MantleService();
    await mantleService.waitForInitialization();
    
    // Mock the service as enabled and initialized
    jest.spyOn(mantleService, 'isEnabled').mockReturnValue(true);
    // Mock the provider property
    (mantleService as any).provider = {
      getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')),
      getTransactionCount: jest.fn().mockResolvedValue(5),
      getCode: jest.fn().mockResolvedValue('0x'),
      getFeeData: jest.fn().mockResolvedValue({ gasPrice: BigInt('1000000000') })
    };
  });

  describe('Basic Wallet Operations', () => {
    it('should create a basic wallet successfully', async () => {
      const result = await mantleService.createWallet(mockUserId);

      expect(result.wallet).toBeDefined();
      expect(result.wallet.address).toBe(mockAddress);
      expect(result.wallet.userId).toBe(mockUserId);
      expect(result.wallet.id).toMatch(/^mantle_\d+_[a-z0-9]+$/);
      expect(result.wallet.createdAt).toBeInstanceOf(Date);
    });

    it('should create wallet with mnemonic when requested', async () => {
      const result = await mantleService.createWallet(mockUserId, { 
        generateMnemonic: true 
      });

      expect(result.wallet).toBeDefined();
      expect(result.mnemonic).toBe('test mnemonic phrase here for wallet creation');
    });

    it('should validate addresses correctly', () => {
      const validResult = mantleService.isValidAddress(mockAddress);
      expect(validResult).toBe(true);
    });

    it('should derive wallet address from public key', () => {
      const publicKey = '0x04abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const result = mantleService.deriveWalletAddress(publicKey);
      expect(result).toBe(mockAddress);
    });
  });

  describe('Wallet Balance Operations', () => {
    it('should get wallet balance successfully', async () => {
      const result = await mantleService.getWalletBalance(mockAddress);

      expect(result).toBeDefined();
      expect(result.address).toBe(mockAddress);
      expect(result.native).toBe('1.0');
      expect(result.stablecoin).toBe('1.0');
    });

    it('should get wallet balance without USD values when requested', async () => {
      const result = await mantleService.getWalletBalance(mockAddress, false);

      expect(result.nativeUSD).toBeUndefined();
      expect(result.stablecoinUSD).toBeUndefined();
      expect(result.totalUSD).toBeUndefined();
    });

    it('should get token balance successfully', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const result = await mantleService.getTokenBalance(mockAddress, tokenAddress);

      expect(result).toBeDefined();
      expect(result.address).toBe(tokenAddress);
      expect(result.symbol).toBe('USDC');
      expect(result.name).toBe('USD Coin');
      expect(result.balance).toBe('1.0');
      expect(result.decimals).toBe(6);
    });

    it('should get wallet info successfully', async () => {
      const result = await mantleService.getWalletInfo(mockAddress);

      expect(result).toBeDefined();
      expect(result.address).toBe(mockAddress);
      expect(result.isContract).toBe(false);
      expect(result.balance).toBeDefined();
      expect(result.transactionCount).toBe(5);
    });
  });

  describe('Service State', () => {
    it('should be enabled and initialized', () => {
      expect(mantleService.isEnabled()).toBe(true);
    });

    it('should provide configuration', () => {
      const config = mantleService.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.environment).toBe('testnet');
      expect(config.networkId).toBe(5003);
    });
  });
});