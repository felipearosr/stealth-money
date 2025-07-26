/**
 * Tests for Circle + Mantle hybrid scenarios and fallback logic
 * Tests method selection, fallback mechanisms, and error handling
 */

import { TransferService, TransferMethod, CreateTransferRequest, CreateMantleTransferRequest } from '../transfer.service';
import { MantleService } from '../mantle.service';
import { MantleError, MantleErrorType, FallbackStrategy } from '../../utils/mantle-error-handler';
import { CirclePaymentService } from '../circle-payment.service';
import { CircleWalletService } from '../circle-wallet.service';
import { CirclePayoutService } from '../circle-payout.service';

// Mock all services
jest.mock('../mantle.service');
jest.mock('../circle-payment.service');
jest.mock('../circle-wallet.service');
jest.mock('../circle-payout.service');

describe('Hybrid Transfer and Fallback Logic', () => {
  let transferService: TransferService;
  let mockMantleService: jest.Mocked<MantleService>;
  let mockPaymentService: jest.Mocked<CirclePaymentService>;
  let mockWalletService: jest.Mocked<CircleWalletService>;
  let mockPayoutService: jest.Mocked<CirclePayoutService>;

  const mockCardDetails = {
    number: '4007400000000007',
    cvv: '123',
    expiry: { month: '12', year: '2025' },
    billingDetails: {
      name: 'John Doe',
      city: 'New York',
      country: 'US',
      line1: '123 Main St',
      postalCode: '10001'
    }
  };

  const mockRecipientInfo = {
    name: 'Jane Smith',
    email: 'jane@example.com',
    bankAccount: {
      iban: 'DE89370400440532013000',
      bic: 'COBADEFFXXX',
      bankName: 'Commerzbank',
      accountHolderName: 'Jane Smith',
      country: 'DE',
      currency: 'EUR'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    transferService = new TransferService();
    
    // Get mocked instances
    mockMantleService = (transferService as any).mantleService;
    mockPaymentService = (transferService as any).paymentService;
    mockWalletService = (transferService as any).walletService;
    mockPayoutService = (transferService as any).payoutService;

    // Setup default Mantle service mocks
    mockMantleService.isEnabled.mockReturnValue(true);
    mockMantleService.createWallet.mockResolvedValue({
      wallet: {
        id: 'mantle-wallet-123',
        address: '0x1234567890123456789012345678901234567890',
        userId: 'test-user',
        createdAt: new Date()
      }
    });
    mockMantleService.getWalletBalance.mockResolvedValue({
      native: '5.0',
      stablecoin: '1000.0',
      address: '0x1234567890123456789012345678901234567890',
      nativeUSD: '2.50',
      stablecoinUSD: '1000.00',
      totalUSD: '1002.50'
    });
    mockMantleService.estimateGasCost.mockResolvedValue({
      gasLimit: '100000',
      gasPrice: '1000000000',
      totalCost: '0.1',
      totalCostUSD: '0.05'
    });
    mockMantleService.initiateTransfer.mockResolvedValue({
      transferId: 'mantle-transfer-123',
      transactionHash: '0xabcdef1234567890',
      status: 'PENDING',
      gasEstimate: {
        gasLimit: '100000',
        gasPrice: '1000000000',
        totalCost: '0.1',
        totalCostUSD: '0.05'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    mockMantleService.convertToStablecoin.mockResolvedValue({
      fromAmount: '100',
      toAmount: '100',
      exchangeRate: '1',
      slippage: '0.1',
      estimatedGas: {
        gasLimit: '100000',
        gasPrice: '1000000000',
        totalCost: '0.1',
        totalCostUSD: '0.05'
      }
    });
    mockMantleService.convertFromStablecoin.mockResolvedValue({
      fromAmount: '100',
      toAmount: '85',
      exchangeRate: '0.85',
      slippage: '0.1',
      estimatedGas: {
        gasLimit: '100000',
        gasPrice: '1000000000',
        totalCost: '0.1',
        totalCostUSD: '0.05'
      }
    });

    // Setup Circle service mocks
    setupCircleServiceMocks();
  });

  function setupCircleServiceMocks() {
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

    mockWalletService.createWallet.mockResolvedValue({
      walletId: 'circle-wallet-123',
      entityId: 'entity-123',
      type: 'end_user_wallet',
      status: 'live',
      accountType: 'SCA',
      blockchain: 'ETH',
      custodyType: 'ENDUSER',
      createDate: new Date().toISOString(),
      updateDate: new Date().toISOString()
    });

    mockWalletService.createTransfer.mockResolvedValue({
      id: 'circle-transfer-123',
      source: { type: 'wallet', id: 'wallet-sender' },
      destination: { type: 'wallet', id: 'wallet-recipient' },
      amount: { amount: '100', currency: 'USD' },
      status: 'pending',
      createDate: new Date().toISOString()
    });

    mockWalletService.waitForTransferCompletion.mockResolvedValue({
      id: 'circle-transfer-123',
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
        iban: mockRecipientInfo.bankAccount.iban,
        accountHolderName: mockRecipientInfo.bankAccount.accountHolderName,
        bankName: mockRecipientInfo.bankAccount.bankName
      },
      amount: { amount: '85', currency: 'EUR' },
      status: 'pending',
      createDate: new Date().toISOString(),
      updateDate: new Date().toISOString()
    });
  }

  describe('Transfer Method Selection', () => {
    it('should recommend Mantle for small amounts', async () => {
      const calculation = await transferService.calculateTransfer({
        sendAmount: 50,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      });

      expect(calculation.recommendedMethod).toBe(TransferMethod.MANTLE);
      
      const mantleOption = calculation.options.find(opt => opt.method === TransferMethod.MANTLE);
      expect(mantleOption?.recommended).toBe(true);
      expect(mantleOption?.benefits).toContain('Lower fees for smaller amounts');
    });

    it('should recommend Circle for large amounts', async () => {
      const calculation = await transferService.calculateTransfer({
        sendAmount: 5000,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      });

      expect(calculation.recommendedMethod).toBe(TransferMethod.CIRCLE);
      
      const circleOption = calculation.options.find(opt => opt.method === TransferMethod.CIRCLE);
      expect(circleOption?.recommended).toBe(true);
      expect(circleOption?.benefits).toContain('Better for larger amounts');
    });

    it('should respect user preference when available', async () => {
      const calculation = await transferService.calculateTransfer({
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        preferredMethod: TransferMethod.CIRCLE
      });

      const recommendation = await transferService.getTransferMethodRecommendation(
        100,
        { send: 'USD', receive: 'EUR' },
        TransferMethod.CIRCLE
      );

      expect(recommendation.recommendedMethod).toBe(TransferMethod.CIRCLE);
      expect(recommendation.reason).toContain('preferred method');
    });

    it('should provide cost comparison between methods', async () => {
      const calculation = await transferService.calculateTransfer({
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      });

      expect(calculation.options).toHaveLength(2);
      
      const mantleOption = calculation.options.find(opt => opt.method === TransferMethod.MANTLE);
      const circleOption = calculation.options.find(opt => opt.method === TransferMethod.CIRCLE);
      
      expect(mantleOption?.totalCost).toBeDefined();
      expect(circleOption?.totalCost).toBeDefined();
      expect(mantleOption?.estimatedTime).toBeDefined();
      expect(circleOption?.estimatedTime).toBeDefined();
    });
  });

  describe('Automatic Fallback Scenarios', () => {
    it('should fallback to Circle when Mantle is unavailable', async () => {
      mockMantleService.isEnabled.mockReturnValue(false);

      const request: CreateTransferRequest = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        cardDetails: mockCardDetails,
        recipientInfo: mockRecipientInfo,
        userId: 'test-user'
      };

      const result = await transferService.createTransferWithFallback(request, TransferMethod.MANTLE);

      expect(result).toBeDefined();
      expect(result.metadata?.fallbackToCircle).toBe(true);
      expect(mockPaymentService.createPayment).toHaveBeenCalled();
    });

    it('should fallback on network congestion', async () => {
      const networkError = new MantleError(
        MantleErrorType.NETWORK_CONGESTION,
        'Network is congested',
        { fallbackToCircle: true }
      );

      mockMantleService.initiateTransfer.mockRejectedValue(networkError);

      const mantleRequest: CreateMantleTransferRequest = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        recipientInfo: mockRecipientInfo,
        userId: 'test-user'
      };

      const result = await transferService.createMantleTransfer(mantleRequest);

      expect(result.metadata?.fallbackFromMantle).toBe(true);
      expect(result.metadata?.fallbackReason).toContain('Network is congested');
    });

    it('should fallback on insufficient gas', async () => {
      const gasError = new MantleError(
        MantleErrorType.INSUFFICIENT_GAS,
        'Gas price too high',
        { fallbackToCircle: true }
      );

      mockMantleService.initiateTransfer.mockRejectedValue(gasError);

      const mantleRequest: CreateMantleTransferRequest = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        recipientInfo: mockRecipientInfo,
        userId: 'test-user'
      };

      const result = await transferService.createMantleTransfer(mantleRequest);

      expect(result.metadata?.fallbackFromMantle).toBe(true);
      expect(result.timeline.some(event => 
        event.message.includes('Switching to traditional banking method')
      )).toBe(true);
    });

    it('should not fallback for non-retryable errors', async () => {
      const invalidAddressError = new MantleError(
        MantleErrorType.INVALID_ADDRESS,
        'Invalid address',
        { fallbackToCircle: false }
      );

      mockMantleService.initiateTransfer.mockRejectedValue(invalidAddressError);

      const mantleRequest: CreateMantleTransferRequest = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        recipientInfo: mockRecipientInfo,
        userId: 'test-user'
      };

      await expect(transferService.createMantleTransfer(mantleRequest))
        .rejects.toThrow(MantleError);
    });
  });

  describe('Retry Logic with Different Strategies', () => {
    it('should retry with higher gas on gas-related errors', async () => {
      const gasError = new MantleError(
        MantleErrorType.GAS_PRICE_TOO_LOW,
        'Gas price too low',
        { 
          retryable: true,
          fallbackConfig: {
            strategy: FallbackStrategy.RETRY_WITH_HIGHER_GAS,
            fallbackToCircle: true,
            userNotification: true,
            retryConfig: { maxAttempts: 2, baseDelay: 1000 }
          }
        }
      );

      mockMantleService.initiateTransfer
        .mockRejectedValueOnce(gasError)
        .mockResolvedValue({
          transferId: 'mantle-transfer-retry-123',
          transactionHash: '0xretry123',
          status: 'PENDING',
          gasEstimate: {
            gasLimit: '100000',
            gasPrice: '2000000000', // Higher gas price
            totalCost: '0.2',
            totalCostUSD: '0.10'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });

      const mantleRequest: CreateMantleTransferRequest = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        recipientInfo: mockRecipientInfo,
        userId: 'test-user'
      };

      const result = await transferService.createMantleTransfer(mantleRequest);

      expect(result.transactionHash).toBe('0xretry123');
      expect(mockMantleService.initiateTransfer).toHaveBeenCalledTimes(2);
    });

    it('should retry with delay on network timeouts', async () => {
      const timeoutError = new MantleError(
        MantleErrorType.NETWORK_TIMEOUT,
        'Request timed out',
        { 
          retryable: true,
          fallbackConfig: {
            strategy: FallbackStrategy.RETRY_WITH_DELAY,
            fallbackToCircle: true,
            userNotification: true,
            retryConfig: { maxAttempts: 2, baseDelay: 2000 }
          }
        }
      );

      mockMantleService.initiateTransfer
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValue({
          transferId: 'mantle-transfer-timeout-retry-123',
          transactionHash: '0xtimeoutretry123',
          status: 'PENDING',
          gasEstimate: {
            gasLimit: '100000',
            gasPrice: '1000000000',
            totalCost: '0.1',
            totalCostUSD: '0.05'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });

      const mantleRequest: CreateMantleTransferRequest = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        recipientInfo: mockRecipientInfo,
        userId: 'test-user'
      };

      const result = await transferService.createMantleTransfer(mantleRequest);

      expect(result.transactionHash).toBe('0xtimeoutretry123');
      expect(mockMantleService.initiateTransfer).toHaveBeenCalledTimes(2);
    });

    it('should queue for later on bridge unavailability', async () => {
      const bridgeError = new MantleError(
        MantleErrorType.BRIDGE_UNAVAILABLE,
        'Bridge is down for maintenance',
        { 
          retryable: true,
          fallbackConfig: {
            strategy: FallbackStrategy.QUEUE_FOR_LATER,
            fallbackToCircle: true,
            userNotification: true,
            retryConfig: { maxAttempts: 1, baseDelay: 60000 }
          }
        }
      );

      mockMantleService.initiateTransfer.mockRejectedValue(bridgeError);

      const mantleRequest: CreateMantleTransferRequest = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        recipientInfo: mockRecipientInfo,
        userId: 'test-user'
      };

      const result = await transferService.createMantleTransfer(mantleRequest);

      expect(result.metadata?.fallbackFromMantle).toBe(true);
      expect(result.metadata?.fallbackReason).toContain('Bridge is down');
    });
  });

  describe('Hybrid Transfer Scenarios', () => {
    it('should handle partial Mantle success with Circle fallback', async () => {
      // Simulate Mantle transfer succeeding but payout failing
      mockMantleService.initiateTransfer.mockResolvedValue({
        transferId: 'mantle-transfer-partial-123',
        transactionHash: '0xpartial123',
        status: 'CONFIRMED',
        gasEstimate: {
          gasLimit: '100000',
          gasPrice: '1000000000',
          totalCost: '0.1',
          totalCostUSD: '0.05'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // But conversion back to fiat fails
      mockMantleService.convertFromStablecoin.mockRejectedValue(
        new MantleError(MantleErrorType.BRIDGE_UNAVAILABLE, 'Bridge down for payout')
      );

      const mantleRequest: CreateMantleTransferRequest = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        recipientInfo: mockRecipientInfo,
        userId: 'test-user'
      };

      const result = await transferService.createMantleTransfer(mantleRequest);

      // Should have Mantle transaction hash but use Circle for final payout
      expect(result.metadata?.mantleTransactionHash).toBe('0xpartial123');
      expect(result.metadata?.hybridTransfer).toBe(true);
    });

    it('should optimize routing based on amount and destination', async () => {
      const smallAmountCalc = await transferService.calculateTransfer({
        sendAmount: 25,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      });

      const largeAmountCalc = await transferService.calculateTransfer({
        sendAmount: 2500,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      });

      expect(smallAmountCalc.recommendedMethod).toBe(TransferMethod.MANTLE);
      expect(largeAmountCalc.recommendedMethod).toBe(TransferMethod.CIRCLE);
    });

    it('should handle currency-specific routing', async () => {
      // Some currencies might not be supported on Mantle
      mockMantleService.convertToStablecoin.mockRejectedValue(
        new MantleError(MantleErrorType.UNSUPPORTED_CURRENCY, 'Currency not supported')
      );

      const calculation = await transferService.calculateTransfer({
        sendAmount: 100,
        sendCurrency: 'JPY',
        receiveCurrency: 'USD'
      });

      const mantleOption = calculation.options.find(opt => opt.method === TransferMethod.MANTLE);
      expect(mantleOption?.availableForAmount).toBe(false);
      expect(calculation.recommendedMethod).toBe(TransferMethod.CIRCLE);
    });
  });

  describe('Error Handling and User Experience', () => {
    it('should provide clear error messages for different failure modes', async () => {
      const networkError = new MantleError(
        MantleErrorType.NETWORK_CONGESTION,
        'Network congested',
        { userMessage: 'The blockchain network is currently busy. We\'ll use our traditional banking method instead.' }
      );

      mockMantleService.initiateTransfer.mockRejectedValue(networkError);

      const mantleRequest: CreateMantleTransferRequest = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        recipientInfo: mockRecipientInfo,
        userId: 'test-user'
      };

      const result = await transferService.createMantleTransfer(mantleRequest);

      const fallbackEvent = result.timeline.find(event => 
        event.message.includes('traditional banking method')
      );
      expect(fallbackEvent).toBeDefined();
    });

    it('should track fallback statistics', async () => {
      const gasError = new MantleError(
        MantleErrorType.INSUFFICIENT_GAS,
        'Gas too high',
        { fallbackToCircle: true }
      );

      mockMantleService.initiateTransfer.mockRejectedValue(gasError);

      const mantleRequest: CreateMantleTransferRequest = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        recipientInfo: mockRecipientInfo,
        userId: 'test-user'
      };

      const result = await transferService.createMantleTransfer(mantleRequest);

      expect(result.metadata?.fallbackReason).toBe(MantleErrorType.INSUFFICIENT_GAS);
      expect(result.metadata?.fallbackTriggered).toBe(true);
      expect(result.metadata?.originalMethod).toBe('mantle');
    });

    it('should maintain transfer continuity during fallback', async () => {
      const bridgeError = new MantleError(
        MantleErrorType.BRIDGE_UNAVAILABLE,
        'Bridge maintenance',
        { fallbackToCircle: true }
      );

      mockMantleService.initiateTransfer.mockRejectedValue(bridgeError);

      const mantleRequest: CreateMantleTransferRequest = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        recipientInfo: mockRecipientInfo,
        userId: 'test-user'
      };

      const result = await transferService.createMantleTransfer(mantleRequest);

      // Should maintain the same transfer ID and user experience
      expect(result.id).toBeDefined();
      expect(result.sendAmount).toBe(100);
      expect(result.receiveCurrency).toBe('EUR');
      expect(result.recipientInfo).toEqual(mockRecipientInfo);
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track method selection metrics', async () => {
      const calculations = await Promise.all([
        transferService.calculateTransfer({
          sendAmount: 50,
          sendCurrency: 'USD',
          receiveCurrency: 'EUR'
        }),
        transferService.calculateTransfer({
          sendAmount: 500,
          sendCurrency: 'USD',
          receiveCurrency: 'EUR'
        }),
        transferService.calculateTransfer({
          sendAmount: 5000,
          sendCurrency: 'USD',
          receiveCurrency: 'EUR'
        })
      ]);

      const mantleRecommendations = calculations.filter(calc => 
        calc.recommendedMethod === TransferMethod.MANTLE
      ).length;

      const circleRecommendations = calculations.filter(calc => 
        calc.recommendedMethod === TransferMethod.CIRCLE
      ).length;

      expect(mantleRecommendations + circleRecommendations).toBe(3);
    });

    it('should handle service health checks for method availability', async () => {
      mockMantleService.healthCheck = jest.fn().mockResolvedValue({
        enabled: false,
        connected: false,
        environment: 'testnet',
        networkId: 5003,
        rpcUrl: 'https://rpc.sepolia.mantle.xyz',
        error: 'Service temporarily unavailable'
      });

      const calculation = await transferService.calculateTransfer({
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      });

      const mantleOption = calculation.options.find(opt => opt.method === TransferMethod.MANTLE);
      expect(mantleOption?.availableForAmount).toBe(false);
      expect(calculation.recommendedMethod).toBe(TransferMethod.CIRCLE);
    });
  });
});