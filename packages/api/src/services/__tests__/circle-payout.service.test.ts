import { CirclePayoutService, CreatePayoutRequest, BankAccount } from '../circle-payout.service';

// Mock the Circle SDK
jest.mock('@circle-fin/circle-sdk', () => ({
  Circle: jest.fn().mockImplementation(() => ({
    payouts: {
      createPayout: jest.fn(),
      getPayout: jest.fn(),
      listPayouts: jest.fn(),
      cancelPayout: jest.fn()
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

describe('CirclePayoutService', () => {
  let payoutService: CirclePayoutService;

  const mockBankAccount: BankAccount = {
    iban: 'DE89370400440532013000',
    bic: 'COBADEFFXXX',
    bankName: 'Commerzbank',
    accountHolderName: 'John Doe',
    country: 'DE',
    city: 'Berlin'
  };

  const mockPayoutRequest: CreatePayoutRequest = {
    amount: '100',
    currency: 'EUR',
    sourceWalletId: 'wallet-123',
    bankAccount: mockBankAccount,
    description: 'Test payout'
  };

  beforeEach(() => {
    payoutService = new CirclePayoutService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayout', () => {
    it('should create a payout successfully', async () => {
      const result = await payoutService.createPayout(mockPayoutRequest);

      expect(result).toMatchObject({
        sourceWalletId: 'wallet-123',
        destination: {
          type: 'wire',
          iban: 'DE89370400440532013000',
          accountHolderName: 'John Doe',
          bankName: 'Commerzbank'
        },
        amount: { amount: '100', currency: 'EUR' },
        status: 'pending'
      });
      expect(result.id).toMatch(/^payout-/);
      expect(result.createDate).toBeDefined();
      expect(result.updateDate).toBeDefined();
    });

    it('should validate bank account before processing', async () => {
      const invalidRequest = {
        ...mockPayoutRequest,
        bankAccount: { ...mockBankAccount, iban: 'INVALID' }
      };

      await expect(payoutService.createPayout(invalidRequest))
        .rejects.toThrow('Invalid IBAN format');
    });
  });

  describe('getPayoutStatus', () => {
    it('should get payout status successfully', async () => {
      const result = await payoutService.getPayoutStatus('payout-123');

      expect(result.id).toBe('payout-123');
      expect(result.status).toBe('complete');
      expect(result.createDate).toBeDefined();
      expect(result.updateDate).toBeDefined();
    });
  });

  describe('isPayoutComplete', () => {
    it('should return true for complete payout', async () => {
      const result = await payoutService.isPayoutComplete('payout-123');
      expect(result).toBe(true);
    });
  });

  describe('validateIBAN', () => {
    it('should validate correct German IBAN', () => {
      expect(payoutService.validateIBAN('DE89370400440532013000')).toBe(true);
    });

    it('should validate IBAN with spaces', () => {
      expect(payoutService.validateIBAN('DE89 3704 0044 0532 0130 00')).toBe(true);
    });

    it('should reject invalid IBAN format', () => {
      expect(payoutService.validateIBAN('INVALID')).toBe(false);
    });

    it('should reject IBAN with wrong length', () => {
      expect(payoutService.validateIBAN('DE8937040044053201300')).toBe(false); // Too short
    });
  });

  describe('validateBIC', () => {
    it('should validate correct BIC', () => {
      expect(payoutService.validateBIC('COBADEFFXXX')).toBe(true);
    });

    it('should validate BIC without branch code', () => {
      expect(payoutService.validateBIC('COBADEFF')).toBe(true);
    });

    it('should reject invalid BIC format', () => {
      expect(payoutService.validateBIC('INVALID')).toBe(false);
    });

    it('should reject BIC with wrong length', () => {
      expect(payoutService.validateBIC('COBA')).toBe(false);
    });
  });

  describe('getEstimatedPayoutTime', () => {
    it('should return correct estimated time for EUR transfers', () => {
      const estimate = payoutService.getEstimatedPayoutTime();
      
      expect(estimate).toEqual({
        min: 1,
        max: 2,
        unit: 'days'
      });
    });
  });

  describe('validation', () => {
    it('should throw error for missing source wallet', () => {
      const invalidRequest = { ...mockPayoutRequest, sourceWalletId: '' };
      expect(() => (payoutService as any).validatePayoutRequest(invalidRequest))
        .toThrow('Source wallet ID is required');
    });

    it('should throw error for invalid amount', () => {
      const invalidRequest = { ...mockPayoutRequest, amount: '0' };
      expect(() => (payoutService as any).validatePayoutRequest(invalidRequest))
        .toThrow('Payout amount must be a positive number');
    });

    it('should throw error for non-EUR currency', () => {
      const invalidRequest = { ...mockPayoutRequest, currency: 'USD' as any };
      expect(() => (payoutService as any).validatePayoutRequest(invalidRequest))
        .toThrow('Only EUR payouts are currently supported');
    });

    it('should throw error for unsupported country', () => {
      const invalidRequest = { 
        ...mockPayoutRequest, 
        bankAccount: { ...mockBankAccount, country: 'US' }
      };
      expect(() => (payoutService as any).validatePayoutRequest(invalidRequest))
        .toThrow('EUR payouts to US are not currently supported');
    });
  });
});