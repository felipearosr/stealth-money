import { CircleWalletService, CreateWalletRequest, CreateTransferRequest } from '../circle-wallet.service';

// Mock the Circle SDK
jest.mock('@circle-fin/circle-sdk', () => ({
  Circle: jest.fn().mockImplementation(() => ({
    wallets: {
      createWallet: jest.fn(),
      getWallet: jest.fn(),
      listWallets: jest.fn(),
      getWalletBalance: jest.fn()
    },
    transfers: {
      createTransfer: jest.fn(),
      getTransfer: jest.fn(),
      listTransfers: jest.fn()
    }
  })),
  CircleEnvironments: {
    sandbox: 'sandbox',
    production: 'production'
  }
}));

// Mock the circle config
jest.mock('../../config/circle.config', () => ({
  circleConfig: {
    getConfig: jest.fn().mockReturnValue({
      apiKey: 'test-api-key',
      environment: 'sandbox'
    })
  }
}));

describe('CircleWalletService', () => {
  let walletService: CircleWalletService;

  const mockWalletRequest: CreateWalletRequest = {
    userId: 'user-123',
    description: 'Test wallet',
    metadata: { test: 'data' }
  };

  const mockTransferRequest: CreateTransferRequest = {
    sourceWalletId: 'wallet-1',
    destinationWalletId: 'wallet-2',
    amount: '100',
    currency: 'USD',
    description: 'Test transfer'
  };

  beforeEach(() => {
    walletService = new CircleWalletService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWallet', () => {
    it('should create a wallet successfully', async () => {
      const result = await walletService.createWallet(mockWalletRequest);

      expect(result).toMatchObject({
        type: 'end_user_wallet',
        description: 'Test wallet',
        status: 'live',
        accountType: 'SCA',
        blockchain: 'ETH',
        custodyType: 'ENDUSER',
        userId: 'user-123'
      });
      expect(result.walletId).toMatch(/^wallet-/);
      expect(result.entityId).toMatch(/^entity-/);
      expect(result.createDate).toBeDefined();
      expect(result.updateDate).toBeDefined();
      expect(result.metadata).toEqual({
        test: 'data',
        userId: 'user-123'
      });
    });
  });

  describe('getWallet', () => {
    it('should get wallet successfully', async () => {
      const result = await walletService.getWallet('wallet-123');

      expect(result.walletId).toBe('wallet-123');
      expect(result.status).toBe('live');
      expect(result.createDate).toBeDefined();
      expect(result.updateDate).toBeDefined();
    });
  });

  describe('getWalletBalance', () => {
    it('should get wallet balance successfully', async () => {
      const result = await walletService.getWalletBalance('wallet-123');

      expect(result.available).toHaveLength(1);
      expect(result.unsettled).toHaveLength(0);
      expect(result.available[0]).toEqual({ amount: '100', currency: 'USD' });
    });
  });

  describe('createTransfer', () => {
    it('should create transfer successfully', async () => {
      const result = await walletService.createTransfer(mockTransferRequest);

      expect(result).toMatchObject({
        source: { type: 'wallet', id: 'wallet-1' },
        destination: { type: 'wallet', id: 'wallet-2' },
        amount: { amount: '100', currency: 'USD' },
        status: 'pending'
      });
      expect(result.id).toMatch(/^transfer-/);
      expect(result.createDate).toBeDefined();
    });
  });

  describe('hasSufficientBalance', () => {
    it('should return true when balance is sufficient', async () => {
      const result = await walletService.hasSufficientBalance('wallet-123', '50', 'USD');
      expect(result).toBe(true);
    });

    it('should return false when balance is insufficient', async () => {
      const result = await walletService.hasSufficientBalance('wallet-123', '150', 'USD');
      expect(result).toBe(false);
    });

    it('should return false when currency not found', async () => {
      const result = await walletService.hasSufficientBalance('wallet-123', '50', 'EUR');
      expect(result).toBe(false);
    });
  });

  describe('validateTransferRequest', () => {
    it('should validate valid transfer request', () => {
      expect(() => walletService.validateTransferRequest(mockTransferRequest)).not.toThrow();
    });

    it('should throw error for missing source wallet', () => {
      const invalidRequest = { ...mockTransferRequest, sourceWalletId: '' };
      expect(() => walletService.validateTransferRequest(invalidRequest))
        .toThrow('Source wallet ID is required');
    });

    it('should throw error for missing destination wallet', () => {
      const invalidRequest = { ...mockTransferRequest, destinationWalletId: '' };
      expect(() => walletService.validateTransferRequest(invalidRequest))
        .toThrow('Destination wallet ID is required');
    });

    it('should throw error for same source and destination', () => {
      const invalidRequest = { ...mockTransferRequest, destinationWalletId: 'wallet-1' };
      expect(() => walletService.validateTransferRequest(invalidRequest))
        .toThrow('Source and destination wallets cannot be the same');
    });

    it('should throw error for invalid amount', () => {
      const invalidRequest = { ...mockTransferRequest, amount: '0' };
      expect(() => walletService.validateTransferRequest(invalidRequest))
        .toThrow('Transfer amount must be a positive number');
    });

    it('should throw error for missing currency', () => {
      const invalidRequest = { ...mockTransferRequest, currency: '' };
      expect(() => walletService.validateTransferRequest(invalidRequest))
        .toThrow('Currency is required');
    });
  });
});