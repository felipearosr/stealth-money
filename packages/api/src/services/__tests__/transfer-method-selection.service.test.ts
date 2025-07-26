import { TransferService, TransferMethod, CalculateTransferRequest, CreateMantleTransferRequest } from '../transfer.service';
import { MantleService } from '../mantle.service';

// Mock the MantleService
jest.mock('../mantle.service');

describe('TransferService - Method Selection Logic', () => {
  let transferService: TransferService;
  let mockMantleService: jest.Mocked<MantleService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    transferService = new TransferService();
    mockMantleService = (transferService as any).mantleService;
    
    // Setup default mock implementations
    mockMantleService.isEnabled.mockReturnValue(true);
    mockMantleService.estimateGasCost.mockResolvedValue({
      gasLimit: '21000',
      gasPrice: '1000000000',
      totalCost: '0.021',
      totalCostUSD: '0.01'
    });
    mockMantleService.createWallet.mockResolvedValue({
      wallet: {
        id: 'test-wallet-id',
        address: '0x1234567890123456789012345678901234567890',
        userId: 'test-user',
        createdAt: new Date()
      }
    });
    mockMantleService.initiateTransfer.mockResolvedValue({
      transferId: 'test-transfer-id',
      transactionHash: '0xabcdef',
      status: 'PENDING',
      gasEstimate: {
        gasLimit: '21000',
        gasPrice: '1000000000',
        totalCost: '0.021',
        totalCostUSD: '0.01'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    mockMantleService.getTransferStatus.mockResolvedValue({
      transferId: 'test-transfer-id',
      transactionHash: '0xabcdef',
      status: 'CONFIRMED',
      confirmations: 12,
      updatedAt: new Date()
    });
  });

  describe('calculateTransfer', () => {
    it('should return both Circle and Mantle options when both are available', async () => {
      const request: CalculateTransferRequest = {
        sendAmount: 500,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const result = await transferService.calculateTransfer(request);

      expect(result.options).toHaveLength(2);
      expect(result.options.find(o => o.method === TransferMethod.CIRCLE)).toBeDefined();
      expect(result.options.find(o => o.method === TransferMethod.MANTLE)).toBeDefined();
      expect(result.recommendedMethod).toBeDefined();
    });

    it('should only return Circle option when Mantle is disabled', async () => {
      mockMantleService.isEnabled.mockReturnValue(false);

      const request: CalculateTransferRequest = {
        sendAmount: 500,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const result = await transferService.calculateTransfer(request);

      expect(result.options).toHaveLength(1);
      expect(result.options[0].method).toBe(TransferMethod.CIRCLE);
    });

    it('should handle Mantle service errors gracefully', async () => {
      mockMantleService.estimateGasCost.mockRejectedValue(new Error('Network error'));

      const request: CalculateTransferRequest = {
        sendAmount: 500,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const result = await transferService.calculateTransfer(request);

      expect(result.options).toHaveLength(1);
      expect(result.options[0].method).toBe(TransferMethod.CIRCLE);
    });
  });

  describe('getTransferMethodRecommendation', () => {
    it('should recommend Mantle for amounts below $100', async () => {
      const result = await transferService.getTransferMethodRecommendation(
        50,
        { send: 'USD', receive: 'EUR' }
      );

      expect(result.recommendedMethod).toBe(TransferMethod.MANTLE);
      expect(result.reason).toContain('Lower fees for smaller amounts');
      expect(result.costSavings).toBeDefined();
      expect(result.timeSavings).toBeDefined();
    });

    it('should recommend Circle for amounts above $1000', async () => {
      const result = await transferService.getTransferMethodRecommendation(
        1500,
        { send: 'USD', receive: 'EUR' }
      );

      expect(result.recommendedMethod).toBe(TransferMethod.CIRCLE);
      expect(result.reason).toContain('regulatory compliance and reliability');
      expect(result.alternatives).toHaveLength(1);
      expect(result.alternatives[0].method).toBe(TransferMethod.MANTLE);
    });

    it('should respect user preference when method is available', async () => {
      const result = await transferService.getTransferMethodRecommendation(
        500,
        { send: 'USD', receive: 'EUR' },
        TransferMethod.MANTLE
      );

      expect(result.recommendedMethod).toBe(TransferMethod.MANTLE);
      expect(result.reason).toBe('Based on your preference');
    });

    it('should recommend based on cost savings for medium amounts', async () => {
      // Mock significant savings scenario
      mockMantleService.estimateGasCost.mockResolvedValue({
        gasLimit: '21000',
        gasPrice: '1000000000',
        totalCost: '0.021',
        totalCostUSD: '0.50' // Lower cost to trigger savings recommendation
      });

      const result = await transferService.getTransferMethodRecommendation(
        500,
        { send: 'USD', receive: 'EUR' }
      );

      expect(result.recommendedMethod).toBe(TransferMethod.MANTLE);
      expect(result.reason).toContain('Significant cost savings');
    });

    it('should fallback to Circle when recommendation fails', async () => {
      // Mock both services to fail to trigger the fallback logic
      mockMantleService.estimateGasCost.mockRejectedValue(new Error('Service error'));
      mockMantleService.isEnabled.mockReturnValue(false);

      const result = await transferService.getTransferMethodRecommendation(
        500,
        { send: 'USD', receive: 'EUR' }
      );

      expect(result.recommendedMethod).toBe(TransferMethod.CIRCLE);
      expect(result.reason).toContain('Mantle service not available');
    });
  });

  describe('createMantleTransfer', () => {
    it('should create a Mantle transfer successfully', async () => {
      const request: CreateMantleTransferRequest = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        recipientInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          bankAccount: {
            bankName: 'Test Bank',
            accountHolderName: 'John Doe',
            country: 'DE',
            currency: 'EUR',
            iban: 'DE89370400440532013000'
          }
        },
        userId: 'test-user-123'
      };

      const result = await transferService.createMantleTransfer(request);

      expect(result.id).toBeDefined();
      expect(result.sendAmount).toBe(100);
      expect(result.sendCurrency).toBe('USD');
      expect(result.receiveCurrency).toBe('EUR');
      expect(result.metadata?.transferMethod).toBe(TransferMethod.MANTLE);
      expect(result.timeline.length).toBeGreaterThanOrEqual(2); // At least initial event + wallet creation
      expect(mockMantleService.createWallet).toHaveBeenCalledTimes(2); // Sender + recipient
      expect(mockMantleService.initiateTransfer).toHaveBeenCalledTimes(1);
    });

    it('should handle Mantle transfer creation failure', async () => {
      mockMantleService.createWallet.mockRejectedValue(new Error('Wallet creation failed'));

      const request: CreateMantleTransferRequest = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        recipientInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          bankAccount: {
            bankName: 'Test Bank',
            accountHolderName: 'John Doe',
            country: 'DE',
            currency: 'EUR',
            iban: 'DE89370400440532013000'
          }
        },
        userId: 'test-user-123'
      };

      await expect(transferService.createMantleTransfer(request)).rejects.toThrow('Wallet creation failed');
    });
  });

  describe('cost comparison', () => {
    it('should calculate cost differences between Circle and Mantle', async () => {
      const request: CalculateTransferRequest = {
        sendAmount: 500,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const result = await transferService.calculateTransfer(request);
      const circleOption = result.options.find(o => o.method === TransferMethod.CIRCLE);
      const mantleOption = result.options.find(o => o.method === TransferMethod.MANTLE);

      expect(circleOption?.totalCost).toBeGreaterThan(0);
      expect(mantleOption?.totalCost).toBeGreaterThan(0);
      
      // Mantle should generally be cheaper for smaller amounts
      if (request.sendAmount < 1000) {
        expect(mantleOption?.totalCost).toBeLessThan(circleOption?.totalCost || Infinity);
      }
    });

    it('should show correct fee breakdown for each method', async () => {
      const request: CalculateTransferRequest = {
        sendAmount: 500,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const result = await transferService.calculateTransfer(request);
      
      result.options.forEach(option => {
        expect(option.fees.processing).toBeGreaterThanOrEqual(0);
        expect(option.fees.network).toBeGreaterThanOrEqual(0);
        expect(option.fees.exchange).toBeGreaterThanOrEqual(0);
        expect(option.totalCost).toBe(
          option.fees.processing + option.fees.network + option.fees.exchange
        );
      });
    });
  });

  describe('method availability', () => {
    it('should correctly identify when methods are available', async () => {
      const request: CalculateTransferRequest = {
        sendAmount: 500,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const result = await transferService.calculateTransfer(request);
      
      const circleOption = result.options.find(o => o.method === TransferMethod.CIRCLE);
      const mantleOption = result.options.find(o => o.method === TransferMethod.MANTLE);

      expect(circleOption?.availableForAmount).toBe(true);
      expect(mantleOption?.availableForAmount).toBe(true);
    });

    it('should mark Mantle as unavailable for amounts outside limits', async () => {
      const request: CalculateTransferRequest = {
        sendAmount: 15000, // Above limit
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const result = await transferService.calculateTransfer(request);
      const mantleOption = result.options.find(o => o.method === TransferMethod.MANTLE);

      expect(mantleOption?.availableForAmount).toBe(false);
    });
  });

  describe('unified transfer result interface', () => {
    it('should return consistent transfer result structure for both methods', async () => {
      const circleRequest = {
        sendAmount: 500,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        cardDetails: {
          number: '4111111111111111',
          cvv: '123',
          expiry: { month: '12', year: '2025' },
          billingDetails: {
            name: 'John Doe',
            city: 'New York',
            country: 'US',
            line1: '123 Main St',
            postalCode: '10001'
          }
        },
        recipientInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          bankAccount: {
            bankName: 'Test Bank',
            accountHolderName: 'John Doe',
            country: 'DE',
            currency: 'EUR',
            iban: 'DE89370400440532013000'
          }
        }
      };

      const mantleRequest: CreateMantleTransferRequest = {
        sendAmount: 500,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        recipientInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          bankAccount: {
            bankName: 'Test Bank',
            accountHolderName: 'John Doe',
            country: 'DE',
            currency: 'EUR',
            iban: 'DE89370400440532013000'
          }
        }
      };

      // Mock Circle services to avoid actual API calls
      const mockPaymentService = (transferService as any).paymentService;
      const mockWalletService = (transferService as any).walletService;
      const mockPayoutService = (transferService as any).payoutService;

      mockPaymentService.createPayment = jest.fn().mockResolvedValue({ id: 'payment-123' });
      mockPaymentService.waitForPaymentConfirmation = jest.fn().mockResolvedValue({ fees: 5 });
      mockWalletService.createWallet = jest.fn().mockResolvedValue({ walletId: 'wallet-123' });
      mockWalletService.createTransfer = jest.fn().mockResolvedValue({ id: 'transfer-123' });
      mockWalletService.waitForTransferCompletion = jest.fn().mockResolvedValue(true);
      mockPayoutService.createPayout = jest.fn().mockResolvedValue({ id: 'payout-123' });

      const [circleResult, mantleResult] = await Promise.all([
        transferService.createTransfer(circleRequest),
        transferService.createMantleTransfer(mantleRequest)
      ]);

      // Both should have the same structure
      const requiredFields = ['id', 'status', 'sendAmount', 'sendCurrency', 'receiveAmount', 
                             'receiveCurrency', 'exchangeRate', 'fees', 'recipientInfo', 
                             'createdAt', 'updatedAt', 'timeline'];

      requiredFields.forEach(field => {
        expect(circleResult).toHaveProperty(field);
        expect(mantleResult).toHaveProperty(field);
      });

      // Metadata should indicate the transfer method
      expect(mantleResult.metadata?.transferMethod).toBe(TransferMethod.MANTLE);
    });
  });
});