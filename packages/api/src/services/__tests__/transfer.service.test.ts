import { TransferService, TransferStatus, CreateTransferRequest, TransferResult } from '../transfer.service';
import { CirclePaymentService } from '../circle-payment.service';
import { CircleWalletService } from '../circle-wallet.service';
import { CirclePayoutService } from '../circle-payout.service';

// Mock the Circle services
jest.mock('../circle-payment.service');
jest.mock('../circle-wallet.service');
jest.mock('../circle-payout.service');

describe('TransferService', () => {
  let transferService: TransferService;
  let mockPaymentService: jest.Mocked<CirclePaymentService>;
  let mockWalletService: jest.Mocked<CircleWalletService>;
  let mockPayoutService: jest.Mocked<CirclePayoutService>;

  const mockCardDetails = {
    number: '4007400000000007',
    cvv: '123',
    expiry: {
      month: '12',
      year: '2025'
    },
    billingDetails: {
      name: 'John Doe',
      city: 'New York',
      country: 'US',
      line1: '123 Main St',
      postalCode: '10001'
    }
  };

  const mockBankAccount = {
    iban: 'DE89370400440532013000',
    bic: 'COBADEFFXXX',
    bankName: 'Commerzbank',
    accountHolderName: 'Jane Smith',
    country: 'DE'
  };

  const mockTransferRequest: CreateTransferRequest = {
    sendAmount: 100,
    sendCurrency: 'USD',
    receiveCurrency: 'EUR',
    cardDetails: mockCardDetails,
    recipientInfo: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      bankAccount: mockBankAccount
    },
    userId: 'user-123',
    exchangeRate: 0.85
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create service instance
    transferService = new TransferService();
    
    // Get mocked instances
    mockPaymentService = (transferService as any).paymentService;
    mockWalletService = (transferService as any).walletService;
    mockPayoutService = (transferService as any).payoutService;

    // Setup default mock implementations
    mockPaymentService.createPayment.mockResolvedValue({
      id: 'payment-123',
      status: 'pending',
      amount: 100,
      currency: 'USD',
      createDate: new Date().toISOString(),
      updateDate: new Date().toISOString()
    });

    mockPaymentService.waitForPaymentConfirmation.mockResolvedValue({
      id: 'payment-123',
      status: 'confirmed',
      amount: 100,
      currency: 'USD',
      fees: 3.20,
      createDate: new Date().toISOString(),
      updateDate: new Date().toISOString()
    });

    mockWalletService.createWallet.mockImplementation(async (request) => ({
      walletId: `wallet-${Date.now()}`,
      entityId: `entity-${Date.now()}`,
      type: 'end_user_wallet',
      status: 'live' as const,
      accountType: 'SCA',
      blockchain: 'ETH',
      custodyType: 'ENDUSER',
      userId: request.userId,
      createDate: new Date().toISOString(),
      updateDate: new Date().toISOString()
    }));

    mockWalletService.createTransfer.mockResolvedValue({
      id: 'transfer-123',
      source: { type: 'wallet', id: 'wallet-sender' },
      destination: { type: 'wallet', id: 'wallet-recipient' },
      amount: { amount: '100', currency: 'USD' },
      status: 'pending',
      createDate: new Date().toISOString()
    });

    mockWalletService.waitForTransferCompletion.mockResolvedValue({
      id: 'transfer-123',
      source: { type: 'wallet', id: 'wallet-sender' },
      destination: { type: 'wallet', id: 'wallet-recipient' },
      amount: { amount: '100', currency: 'USD' },
      status: 'complete',
      createDate: new Date().toISOString()
    });

    mockPayoutService.createPayout.mockResolvedValue({
      id: 'payout-123',
      sourceWalletId: 'wallet-recipient',
      destination: {
        type: 'wire',
        iban: mockBankAccount.iban,
        accountHolderName: mockBankAccount.accountHolderName,
        bankName: mockBankAccount.bankName
      },
      amount: { amount: '85', currency: 'EUR' },
      status: 'pending',
      createDate: new Date().toISOString(),
      updateDate: new Date().toISOString()
    });

    mockPayoutService.waitForPayoutCompletion.mockResolvedValue({
      id: 'payout-123',
      sourceWalletId: 'wallet-recipient',
      destination: {
        type: 'wire',
        iban: mockBankAccount.iban,
        accountHolderName: mockBankAccount.accountHolderName,
        bankName: mockBankAccount.bankName
      },
      amount: { amount: '85', currency: 'EUR' },
      status: 'complete',
      createDate: new Date().toISOString(),
      updateDate: new Date().toISOString()
    });

    // Mock health checks
    mockPaymentService.healthCheck.mockResolvedValue({ status: 'healthy', environment: 'sandbox' });
    mockWalletService.healthCheck.mockResolvedValue({ status: 'healthy', environment: 'sandbox' });
    mockPayoutService.healthCheck.mockResolvedValue({ status: 'healthy', environment: 'sandbox' });
  });

  describe('createTransfer', () => {
    it('should create a successful transfer with all steps', async () => {
      const result = await transferService.createTransfer(mockTransferRequest);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^transfer-/);
      expect(result.status).toBe(TransferStatus.PAYING_OUT);
      expect(result.sendAmount).toBe(100);
      expect(result.receiveAmount).toBe(85);
      expect(result.exchangeRate).toBe(0.85);
      expect(result.recipientInfo).toEqual(mockTransferRequest.recipientInfo);
      expect(result.paymentId).toBe('payment-123');
      expect(result.senderWalletId).toMatch(/^wallet-/);
      expect(result.recipientWalletId).toMatch(/^wallet-/);
      expect(result.transferId).toBe('transfer-123');
      expect(result.payoutId).toBe('payout-123');
      expect(result.timeline.length).toBeGreaterThanOrEqual(6); // All successful steps
      expect(result.fees).toBeGreaterThan(0);
    });

    it('should call all Circle services in correct order', async () => {
      await transferService.createTransfer(mockTransferRequest);

      // Verify payment service calls
      expect(mockPaymentService.createPayment).toHaveBeenCalledWith({
        amount: 100,
        currency: 'USD',
        cardDetails: mockCardDetails,
        description: expect.stringContaining('International transfer'),
        metadata: expect.objectContaining({ transferId: expect.any(String) })
      });
      expect(mockPaymentService.waitForPaymentConfirmation).toHaveBeenCalledWith('payment-123');

      // Verify wallet service calls
      expect(mockWalletService.createWallet).toHaveBeenCalledTimes(2);
      expect(mockWalletService.createTransfer).toHaveBeenCalledWith({
        sourceWalletId: expect.any(String),
        destinationWalletId: expect.any(String),
        amount: '100',
        currency: 'USD',
        description: expect.any(String),
        metadata: expect.objectContaining({ transferId: expect.any(String) })
      });
      expect(mockWalletService.waitForTransferCompletion).toHaveBeenCalledWith('transfer-123');

      // Verify payout service calls
      expect(mockPayoutService.createPayout).toHaveBeenCalledWith({
        amount: '85',
        currency: 'EUR',
        sourceWalletId: expect.any(String),
        bankAccount: mockBankAccount,
        description: expect.any(String),
        metadata: expect.objectContaining({ transferId: expect.any(String) })
      });
    });

    it('should handle payment failure', async () => {
      const paymentError = new Error('Card declined');
      mockPaymentService.createPayment.mockRejectedValue(paymentError);

      await expect(transferService.createTransfer(mockTransferRequest)).rejects.toThrow('Card declined');

      // Should not proceed to wallet creation
      expect(mockWalletService.createWallet).not.toHaveBeenCalled();
    });

    it('should handle wallet creation failure', async () => {
      const walletError = new Error('Wallet creation failed');
      mockWalletService.createWallet.mockRejectedValueOnce(walletError);

      await expect(transferService.createTransfer(mockTransferRequest)).rejects.toThrow('Wallet creation failed');

      // Should have created payment but not proceeded to transfer
      expect(mockPaymentService.createPayment).toHaveBeenCalled();
      expect(mockWalletService.createTransfer).not.toHaveBeenCalled();
    });

    it('should handle transfer failure', async () => {
      const transferError = new Error('Insufficient balance');
      mockWalletService.createTransfer.mockRejectedValue(transferError);

      await expect(transferService.createTransfer(mockTransferRequest)).rejects.toThrow('Insufficient balance');

      // Should have created wallets but not proceeded to payout
      expect(mockWalletService.createWallet).toHaveBeenCalledTimes(2);
      expect(mockPayoutService.createPayout).not.toHaveBeenCalled();
    });

    it('should handle payout failure', async () => {
      const payoutError = new Error('Invalid bank details');
      mockPayoutService.createPayout.mockRejectedValue(payoutError);

      await expect(transferService.createTransfer(mockTransferRequest)).rejects.toThrow('Invalid bank details');

      // Should have completed all steps except payout
      expect(mockWalletService.waitForTransferCompletion).toHaveBeenCalled();
    });

    it('should calculate fees correctly', async () => {
      const result = await transferService.createTransfer(mockTransferRequest);

      // Should include card processing fees (2.9% + $0.30) plus Circle fees
      expect(result.fees).toBeGreaterThan(3); // At least card processing fees
      expect(result.fees).toBeLessThan(10); // Reasonable upper bound
    });

    it('should set estimated completion time', async () => {
      const result = await transferService.createTransfer(mockTransferRequest);

      expect(result.estimatedCompletion).toBeDefined();
      expect(result.estimatedCompletion!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should create timeline events for all steps', async () => {
      const result = await transferService.createTransfer(mockTransferRequest);

      const eventTypes = result.timeline.map(e => e.type);
      expect(eventTypes).toContain('payment_created');
      expect(eventTypes).toContain('payment_confirmed');
      expect(eventTypes).toContain('wallets_created');
      expect(eventTypes).toContain('transfer_initiated');
      expect(eventTypes).toContain('transfer_completed');
      expect(eventTypes).toContain('payout_created');

      // All events should have required fields
      result.timeline.forEach(event => {
        expect(event.id).toBeDefined();
        expect(event.transferId).toBe(result.id);
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.message).toBeDefined();
        expect(['success', 'pending', 'failed']).toContain(event.status);
      });
    });
  });

  describe('getTransferStatus', () => {
    it('should return transfer status for existing transfer', async () => {
      const transfer = await transferService.createTransfer(mockTransferRequest);
      const status = await transferService.getTransferStatus(transfer.id);

      expect(status.id).toBe(transfer.id);
      expect(status.status).toBe(transfer.status);
      expect(status.sendAmount).toBe(transfer.sendAmount);
      expect(status.receiveAmount).toBe(transfer.receiveAmount);
      expect(status.exchangeRate).toBe(transfer.exchangeRate);
      expect(status.fees).toBe(transfer.fees);
      expect(status.timeline).toEqual(transfer.timeline);
      expect(status.estimatedCompletion).toBeDefined();
    });

    it('should throw error for non-existent transfer', async () => {
      await expect(transferService.getTransferStatus('non-existent')).rejects.toThrow('Transfer non-existent not found');
    });

    it('should update status from external services', async () => {
      // Create a transfer that stays in PAYMENT_PROCESSING state
      mockPaymentService.waitForPaymentConfirmation.mockImplementation(
        () => new Promise(() => {}) // Never resolves to keep in PAYMENT_PROCESSING
      );

      const transferPromise = transferService.createTransfer(mockTransferRequest);
      
      // Wait a bit for transfer to start and get stuck in PAYMENT_PROCESSING
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get the transfer from internal storage
      const transfers = await transferService.getUserTransfers('user-123');
      const transferId = transfers[0]?.id;
      
      if (transferId) {
        // Mock payment service to return confirmed status
        mockPaymentService.getPaymentStatus.mockResolvedValue({
          id: 'payment-123',
          status: 'confirmed',
          amount: 100,
          currency: 'USD',
          createDate: new Date().toISOString(),
          updateDate: new Date().toISOString()
        });

        const status = await transferService.getTransferStatus(transferId);
        expect(mockPaymentService.getPaymentStatus).toHaveBeenCalled();
      }

      // Clean up the hanging promise
      transferPromise.catch(() => {}); // Ignore the error
    });
  });

  describe('getUserTransfers', () => {
    it('should return transfers for specific user', async () => {
      const request1 = { ...mockTransferRequest, userId: 'user-1' };
      const request2 = { ...mockTransferRequest, userId: 'user-2' };
      const request3 = { ...mockTransferRequest, userId: 'user-1' };

      await transferService.createTransfer(request1);
      await transferService.createTransfer(request2);
      await transferService.createTransfer(request3);

      const user1Transfers = await transferService.getUserTransfers('user-1');
      const user2Transfers = await transferService.getUserTransfers('user-2');

      expect(user1Transfers).toHaveLength(2);
      expect(user2Transfers).toHaveLength(1);
      
      // Should be sorted by creation date (newest first)
      expect(user1Transfers[0].createdAt.getTime()).toBeGreaterThanOrEqual(user1Transfers[1].createdAt.getTime());
    });

    it('should return empty array for user with no transfers', async () => {
      const transfers = await transferService.getUserTransfers('non-existent-user');
      expect(transfers).toEqual([]);
    });
  });

  describe('cancelTransfer', () => {
    it('should cancel transfer in early stages', async () => {
      // Mock payment service to keep transfer in PAYMENT_PROCESSING state
      mockPaymentService.waitForPaymentConfirmation.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const transferPromise = transferService.createTransfer(mockTransferRequest);
      
      // Wait a bit for transfer to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get the transfer ID from the service's internal storage
      const transfers = await transferService.getUserTransfers('user-123');
      const transferId = transfers[0]?.id;
      
      if (transferId) {
        const cancelled = await transferService.cancelTransfer(transferId);
        expect(cancelled).toBe(true);
        
        const status = await transferService.getTransferStatus(transferId);
        expect(status.status).toBe(TransferStatus.FAILED);
      }

      // Clean up the hanging promise
      transferPromise.catch(() => {}); // Ignore the error
    });

    it('should not cancel transfer in later stages', async () => {
      const transfer = await transferService.createTransfer(mockTransferRequest);
      
      // Transfer should be in PAYING_OUT stage
      expect(transfer.status).toBe(TransferStatus.PAYING_OUT);
      
      const cancelled = await transferService.cancelTransfer(transfer.id);
      expect(cancelled).toBe(false);
    });

    it('should throw error for non-existent transfer', async () => {
      await expect(transferService.cancelTransfer('non-existent')).rejects.toThrow('Transfer non-existent not found');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all services are healthy', async () => {
      const health = await transferService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.services.payment).toBe('healthy');
      expect(health.services.wallet).toBe('healthy');
      expect(health.services.payout).toBe('healthy');
    });

    it('should return degraded status when some services are unhealthy', async () => {
      mockPaymentService.healthCheck.mockResolvedValue({ status: 'unhealthy', environment: 'sandbox' });

      const health = await transferService.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.services.payment).toBe('unhealthy');
      expect(health.services.wallet).toBe('healthy');
      expect(health.services.payout).toBe('healthy');
    });

    it('should handle service health check failures', async () => {
      mockPaymentService.healthCheck.mockRejectedValue(new Error('Service unavailable'));

      const health = await transferService.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.services.payment).toBe('unhealthy');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing wallet IDs in transfer', async () => {
      // Mock wallet creation to not set wallet IDs properly
      mockWalletService.createWallet.mockResolvedValue({
        walletId: '',
        entityId: 'entity-123',
        type: 'end_user_wallet',
        status: 'live',
        accountType: 'SCA',
        blockchain: 'ETH',
        custodyType: 'ENDUSER',
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString()
      });

      await expect(transferService.createTransfer(mockTransferRequest)).rejects.toThrow('Wallet IDs not found');
    });

    it('should handle zero amount transfers', async () => {
      const zeroAmountRequest = { ...mockTransferRequest, sendAmount: 0 };
      
      const result = await transferService.createTransfer(zeroAmountRequest);
      expect(result.sendAmount).toBe(0);
      expect(result.receiveAmount).toBe(0);
    });

    it('should handle missing exchange rate', async () => {
      const noRateRequest = { ...mockTransferRequest };
      delete noRateRequest.exchangeRate;
      
      const result = await transferService.createTransfer(noRateRequest);
      expect(result.exchangeRate).toBe(0.85); // Default rate
    });

    it('should handle metadata correctly', async () => {
      const requestWithMetadata = {
        ...mockTransferRequest,
        metadata: { customField: 'customValue', source: 'mobile-app' }
      };
      
      const result = await transferService.createTransfer(requestWithMetadata);
      expect(result.metadata).toEqual({
        ...requestWithMetadata.metadata,
        userId: mockTransferRequest.userId
      });
    });
  });
});