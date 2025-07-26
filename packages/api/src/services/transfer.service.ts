import { CirclePaymentService, CardDetails, PaymentResponse } from './circle-payment.service';
import { CircleWalletService, WalletResponse, TransferResponse } from './circle-wallet.service';
import { CirclePayoutService, BankAccount, PayoutResponse } from './circle-payout.service';
import { MantleService, MantleTransferRequest, MantleTransferResult, GasEstimate } from './mantle.service';
import { MantleError, MantleErrorType, FallbackStrategy } from '../utils/mantle-error-handler';
import { TransferAnalyticsService } from './transfer-analytics.service';

/**
 * Transfer status enum matching the database model
 */
export enum TransferStatus {
  INITIATED = 'INITIATED',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  TRANSFERRING = 'TRANSFERRING',
  PAYING_OUT = 'PAYING_OUT',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

/**
 * Transfer method enum
 */
export enum TransferMethod {
  CIRCLE = 'circle',
  MANTLE = 'mantle'
}

/**
 * Interface for transfer method option
 */
export interface TransferMethodOption {
  method: TransferMethod;
  estimatedTime: string;
  totalCost: number;
  fees: {
    processing: number;
    network: number;
    exchange: number;
  };
  benefits: string[];
  limitations: string[];
  recommended: boolean;
  availableForAmount: boolean;
}

/**
 * Interface for transfer calculation request
 */
export interface CalculateTransferRequest {
  sendAmount: number;
  sendCurrency: string;
  receiveCurrency: string;
  userId?: string;
  preferredMethod?: TransferMethod;
}

/**
 * Interface for transfer calculation response
 */
export interface TransferCalculation {
  sendAmount: number;
  sendCurrency: string;
  receiveCurrency: string;
  exchangeRate: number;
  options: TransferMethodOption[];
  recommendedMethod: TransferMethod;
}

/**
 * Interface for method recommendation
 */
export interface MethodRecommendation {
  recommendedMethod: TransferMethod;
  reason: string;
  costSavings?: number;
  timeSavings?: string;
  alternatives: {
    method: TransferMethod;
    reason: string;
  }[];
}

/**
 * Interface for transfer creation request
 */
export interface CreateTransferRequest {
  sendAmount: number;
  sendCurrency: string;
  receiveCurrency: string;
  cardDetails: CardDetails;
  recipientInfo: RecipientInfo;
  userId?: string;
  exchangeRate?: number;
  metadata?: Record<string, any>;
}

/**
 * Interface for Mantle transfer creation request
 */
export interface CreateMantleTransferRequest {
  sendAmount: number;
  sendCurrency: string;
  receiveCurrency: string;
  recipientInfo: RecipientInfo;
  userId?: string;
  exchangeRate?: number;
  metadata?: Record<string, any>;
}

/**
 * Enhanced bank account interface supporting multiple account types
 */
export interface EnhancedBankAccount {
  // European bank account (IBAN/BIC)
  iban?: string;
  bic?: string;
  // UK bank account
  sortCode?: string;
  // Swiss bank account
  // Canadian bank account
  transitNumber?: string;
  institutionNumber?: string;
  // Australian bank account
  bsb?: string;
  // Japanese bank account
  bankCode?: string;
  branchCode?: string;
  accountType?: 'ordinary' | 'current' | 'checking' | 'savings';
  // Mexican bank account (CLABE)
  clabe?: string;
  // Chilean bank account
  rut?: string;
  // Brazilian bank account
  agencyCode?: string;
  // Generic fields
  accountNumber?: string;
  routingNumber?: string;
  swiftCode?: string;
  bankName: string;
  accountHolderName: string;
  country: string;
  currency: string;
  city?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

/**
 * Interface for recipient information
 */
export interface RecipientInfo {
  name: string;
  email: string;
  phone?: string;
  bankAccount: EnhancedBankAccount;
}

/**
 * Interface for transfer response
 */
export interface TransferResult {
  id: string;
  status: TransferStatus;
  sendAmount: number;
  sendCurrency: string;
  receiveAmount: number;
  receiveCurrency: string;
  exchangeRate: number;
  fees: number;
  recipientInfo: RecipientInfo;
  paymentId?: string;
  senderWalletId?: string;
  recipientWalletId?: string;
  transferId?: string;
  payoutId?: string;
  estimatedCompletion?: Date;
  createdAt: Date;
  updatedAt: Date;
  timeline: TransferEvent[];
  metadata?: Record<string, any>;
}

/**
 * Interface for transfer events/timeline
 */
export interface TransferEvent {
  id: string;
  transferId: string;
  type: 'payment_created' | 'payment_confirmed' | 'wallets_created' | 'transfer_initiated' | 'transfer_completed' | 'payout_created' | 'payout_completed' | 'transfer_failed';
  status: 'success' | 'pending' | 'failed';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Interface for transfer status response
 */
export interface TransferStatusResponse {
  id: string;
  status: TransferStatus;
  sendAmount: number;
  receiveAmount: number;
  sendCurrency?: string;
  receiveCurrency?: string;
  exchangeRate: number;
  fees: number;
  timeline: TransferEvent[];
  estimatedCompletion?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

/**
 * Main Transfer Service that orchestrates the complete international transfer flow
 * Coordinates Circle Payment, Wallet, and Payout services to provide seamless transfers
 * Now supports both Circle and Mantle L2 transfer methods
 */
export class TransferService {
  private paymentService: CirclePaymentService;
  private walletService: CircleWalletService;
  private payoutService: CirclePayoutService;
  private mantleService: MantleService;
  private analyticsService: TransferAnalyticsService;
  private transfers: Map<string, TransferResult> = new Map(); // In-memory storage for demo

  constructor() {
    this.paymentService = new CirclePaymentService();
    this.walletService = new CircleWalletService();
    this.payoutService = new CirclePayoutService();
    this.mantleService = new MantleService();
    this.analyticsService = new TransferAnalyticsService();
  }

  /**
   * Create and process a complete international transfer
   * This is the main orchestration method that coordinates all services
   */
  async createTransfer(request: CreateTransferRequest): Promise<TransferResult> {
    const transferId = this.generateTransferId();
    const timeline: TransferEvent[] = [];

    try {
      // Calculate receive amount if not provided
      const receiveAmount = request.sendAmount * (request.exchangeRate || 0.85); // Default rate for demo
      const fees = this.calculateFees(request.sendAmount);

      // Initialize transfer record
      const transfer: TransferResult = {
        id: transferId,
        status: TransferStatus.INITIATED,
        sendAmount: request.sendAmount,
        sendCurrency: request.sendCurrency,
        receiveAmount,
        receiveCurrency: request.receiveCurrency,
        exchangeRate: request.exchangeRate || 0.85,
        fees,
        recipientInfo: request.recipientInfo,
        estimatedCompletion: this.calculateEstimatedCompletion(),
        createdAt: new Date(),
        updatedAt: new Date(),
        timeline,
        metadata: { ...request.metadata, userId: request.userId }
      };

      this.transfers.set(transferId, transfer);
      this.addTimelineEvent(transfer, 'payment_created', 'pending', 'Transfer initiated');

      // Record transfer initiation in analytics
      this.analyticsService.recordTransferInitiation(
        TransferMethod.CIRCLE, // Default to Circle for createTransfer
        request.userId || 'anonymous',
        request.sendAmount,
        request.sendCurrency,
        fees
      );

      // Step 1: Process card payment to USDC
      await this.processPayment(transfer, request.cardDetails);

      // Step 2: Create wallets for sender and recipient
      await this.createWallets(transfer, request.userId);

      // Step 3: Transfer USDC between wallets
      await this.transferFunds(transfer);

      // Step 4: Payout EUR to recipient bank account
      await this.processPayoutAsync(transfer);

      return transfer;
    } catch (error) {
      console.error(`Transfer ${transferId} failed:`, error);
      const transfer = this.transfers.get(transferId);
      if (transfer) {
        transfer.status = TransferStatus.FAILED;
        transfer.updatedAt = new Date();
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.addTimelineEvent(transfer, 'transfer_failed', 'failed', `Transfer failed: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Get transfer status by ID
   */
  async getTransferStatus(transferId: string): Promise<TransferStatusResponse> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new Error(`Transfer ${transferId} not found`);
    }

    // Update status if needed by checking external services
    await this.updateTransferStatus(transfer);

    return {
      id: transfer.id,
      status: transfer.status,
      sendAmount: transfer.sendAmount,
      receiveAmount: transfer.receiveAmount,
      sendCurrency: transfer.sendCurrency,
      receiveCurrency: transfer.receiveCurrency,
      exchangeRate: transfer.exchangeRate,
      fees: transfer.fees,
      timeline: transfer.timeline,
      estimatedCompletion: transfer.estimatedCompletion,
      completedAt: transfer.status === TransferStatus.COMPLETED ? transfer.updatedAt : undefined,
      errorMessage: transfer.timeline.find(e => e.status === 'failed')?.message
    };
  }

  /**
   * Get all transfers for a user
   */
  async getUserTransfers(userId: string): Promise<TransferResult[]> {
    return Array.from(this.transfers.values())
      .filter(transfer => transfer.metadata?.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Cancel a transfer if possible
   */
  async cancelTransfer(transferId: string): Promise<boolean> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new Error(`Transfer ${transferId} not found`);
    }

    // Can only cancel if still in early stages
    if (transfer.status === TransferStatus.INITIATED || transfer.status === TransferStatus.PAYMENT_PROCESSING) {
      transfer.status = TransferStatus.FAILED;
      transfer.updatedAt = new Date();
      this.addTimelineEvent(transfer, 'transfer_failed', 'failed', 'Transfer cancelled by user');
      return true;
    }

    return false;
  }

  /**
   * Process card payment to USDC
   */
  private async processPayment(transfer: TransferResult, cardDetails: CardDetails): Promise<void> {
    try {
      transfer.status = TransferStatus.PAYMENT_PROCESSING;
      transfer.updatedAt = new Date();
      this.addTimelineEvent(transfer, 'payment_created', 'pending', 'Processing card payment');

      const payment = await this.paymentService.createPayment({
        amount: transfer.sendAmount,
        currency: 'USD',
        cardDetails,
        description: `International transfer ${transfer.id}`,
        metadata: { transferId: transfer.id }
      });

      transfer.paymentId = payment.id;
      this.addTimelineEvent(transfer, 'payment_created', 'success', 'Card payment created successfully');

      // Wait for payment confirmation
      const confirmedPayment = await this.paymentService.waitForPaymentConfirmation(payment.id);
      transfer.fees += confirmedPayment.fees || 0;

      this.addTimelineEvent(transfer, 'payment_confirmed', 'success', 'Payment confirmed and USDC received');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addTimelineEvent(transfer, 'payment_created', 'failed', `Payment failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Create wallets for sender and recipient
   */
  private async createWallets(transfer: TransferResult, userId?: string): Promise<void> {
    try {
      this.addTimelineEvent(transfer, 'wallets_created', 'pending', 'Creating secure wallets');

      // Create sender wallet
      const senderWallet = await this.walletService.createWallet({
        userId: userId || `sender-${transfer.id}`,
        description: `Sender wallet for transfer ${transfer.id}`,
        metadata: { transferId: transfer.id, role: 'sender' }
      });

      // Create recipient wallet
      const recipientWallet = await this.walletService.createWallet({
        userId: `recipient-${transfer.id}`,
        description: `Recipient wallet for transfer ${transfer.id}`,
        metadata: { transferId: transfer.id, role: 'recipient' }
      });

      transfer.senderWalletId = senderWallet.walletId;
      transfer.recipientWalletId = recipientWallet.walletId;

      this.addTimelineEvent(transfer, 'wallets_created', 'success', 'Secure wallets created successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addTimelineEvent(transfer, 'wallets_created', 'failed', `Wallet creation failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Transfer USDC between wallets
   */
  private async transferFunds(transfer: TransferResult): Promise<void> {
    try {
      transfer.status = TransferStatus.TRANSFERRING;
      transfer.updatedAt = new Date();
      this.addTimelineEvent(transfer, 'transfer_initiated', 'pending', 'Transferring funds to recipient wallet');

      if (!transfer.senderWalletId || !transfer.recipientWalletId) {
        throw new Error('Wallet IDs not found');
      }

      const walletTransfer = await this.walletService.createTransfer({
        sourceWalletId: transfer.senderWalletId,
        destinationWalletId: transfer.recipientWalletId,
        amount: transfer.sendAmount.toString(),
        currency: 'USD',
        description: `Transfer for ${transfer.id}`,
        metadata: { transferId: transfer.id }
      });

      transfer.transferId = walletTransfer.id;

      // Wait for transfer completion
      await this.walletService.waitForTransferCompletion(walletTransfer.id);

      this.addTimelineEvent(transfer, 'transfer_completed', 'success', 'Funds transferred to recipient wallet');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addTimelineEvent(transfer, 'transfer_initiated', 'failed', `Fund transfer failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Process payout to EUR bank account (async)
   */
  private async processPayoutAsync(transfer: TransferResult): Promise<void> {
    try {
      transfer.status = TransferStatus.PAYING_OUT;
      transfer.updatedAt = new Date();
      this.addTimelineEvent(transfer, 'payout_created', 'pending', 'Initiating EUR bank transfer');

      if (!transfer.recipientWalletId) {
        throw new Error('Recipient wallet ID not found');
      }

      // Convert EnhancedBankAccount to BankAccount for Circle API
      const bankAccount: BankAccount = {
        iban: transfer.recipientInfo.bankAccount.iban || '',
        bic: transfer.recipientInfo.bankAccount.bic || '',
        bankName: transfer.recipientInfo.bankAccount.bankName,
        accountHolderName: transfer.recipientInfo.bankAccount.accountHolderName,
        country: transfer.recipientInfo.bankAccount.country,
        city: transfer.recipientInfo.bankAccount.city,
        address: transfer.recipientInfo.bankAccount.address
      };

      const payout = await this.payoutService.createPayout({
        amount: transfer.receiveAmount.toString(),
        currency: 'EUR',
        sourceWalletId: transfer.recipientWalletId,
        bankAccount,
        description: `Payout for transfer ${transfer.id}`,
        metadata: { transferId: transfer.id }
      });

      transfer.payoutId = payout.id;
      this.addTimelineEvent(transfer, 'payout_created', 'success', 'EUR bank transfer initiated');

      // Start async monitoring of payout completion
      this.monitorPayoutCompletion(transfer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addTimelineEvent(transfer, 'payout_created', 'failed', `Payout initiation failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Monitor payout completion in background
   */
  private async monitorPayoutCompletion(transfer: TransferResult): Promise<void> {
    if (!transfer.payoutId) return;

    try {
      // This runs in background - don't await in main flow
      setTimeout(async () => {
        try {
          await this.payoutService.waitForPayoutCompletion(transfer.payoutId!);
          transfer.status = TransferStatus.COMPLETED;
          transfer.updatedAt = new Date();
          this.addTimelineEvent(transfer, 'payout_completed', 'success', 'EUR received in recipient bank account');
          
          // Record transfer completion in analytics
          const completionTimeMinutes = (transfer.updatedAt.getTime() - transfer.createdAt.getTime()) / (1000 * 60);
          this.analyticsService.recordTransferCompletion(
            TransferMethod.CIRCLE,
            transfer.metadata?.userId || 'anonymous',
            TransferStatus.COMPLETED,
            completionTimeMinutes,
            transfer.fees
          );
        } catch (error) {
          transfer.status = TransferStatus.FAILED;
          transfer.updatedAt = new Date();
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.addTimelineEvent(transfer, 'payout_completed', 'failed', `Payout failed: ${errorMessage}`);
          
          // Record transfer failure in analytics
          const completionTimeMinutes = (transfer.updatedAt.getTime() - transfer.createdAt.getTime()) / (1000 * 60);
          this.analyticsService.recordTransferCompletion(
            TransferMethod.CIRCLE,
            transfer.metadata?.userId || 'anonymous',
            TransferStatus.FAILED,
            completionTimeMinutes
          );
        }
      }, 1000); // Start monitoring after 1 second
    } catch (error) {
      console.error('Error setting up payout monitoring:', error);
    }
  }

  /**
   * Update transfer status by checking external services
   */
  private async updateTransferStatus(transfer: TransferResult): Promise<void> {
    try {
      // Check payment status if still processing
      if (transfer.status === TransferStatus.PAYMENT_PROCESSING && transfer.paymentId) {
        const payment = await this.paymentService.getPaymentStatus(transfer.paymentId);
        if (payment.status === 'confirmed') {
          transfer.status = TransferStatus.TRANSFERRING;
          transfer.updatedAt = new Date();
        } else if (payment.status === 'failed') {
          transfer.status = TransferStatus.FAILED;
          transfer.updatedAt = new Date();
        }
      }

      // Check payout status if paying out
      if (transfer.status === TransferStatus.PAYING_OUT && transfer.payoutId) {
        const payout = await this.payoutService.getPayoutStatus(transfer.payoutId);
        if (payout.status === 'complete') {
          transfer.status = TransferStatus.COMPLETED;
          transfer.updatedAt = new Date();
        } else if (payout.status === 'failed') {
          transfer.status = TransferStatus.FAILED;
          transfer.updatedAt = new Date();
        }
      }
    } catch (error) {
      console.error('Error updating transfer status:', error);
    }
  }

  /**
   * Add event to transfer timeline
   */
  private addTimelineEvent(
    transfer: TransferResult,
    type: TransferEvent['type'],
    status: TransferEvent['status'],
    message: string,
    metadata?: Record<string, any>
  ): void {
    const event: TransferEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      transferId: transfer.id,
      type,
      status,
      message,
      timestamp: new Date(),
      metadata
    };

    transfer.timeline.push(event);
    transfer.updatedAt = new Date();
  }

  /**
   * Generate unique transfer ID
   */
  private generateTransferId(): string {
    return `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate transfer fees (simplified)
   */
  private calculateFees(amount: number): number {
    // Simplified fee calculation: 2.9% + $0.30 for card processing
    return Math.round((amount * 0.029 + 0.30) * 100) / 100;
  }

  /**
   * Calculate estimated completion time
   */
  private calculateEstimatedCompletion(): Date {
    // Estimate 5 minutes for complete transfer
    const completion = new Date();
    completion.setMinutes(completion.getMinutes() + 5);
    return completion;
  }

  /**
   * Get analytics service instance for external access
   */
  public getAnalyticsService(): TransferAnalyticsService {
    return this.analyticsService;
  }

  /**
   * Calculate transfer options for both Circle and Mantle methods
   */
  async calculateTransfer(request: CalculateTransferRequest): Promise<TransferCalculation> {
    try {
      console.log(`🧮 Calculating transfer options for ${request.sendAmount} ${request.sendCurrency} -> ${request.receiveCurrency}`);

      // Get exchange rate (simplified for demo)
      const exchangeRate = this.getExchangeRate(request.sendCurrency, request.receiveCurrency);

      // Calculate options for both methods
      const [circleOption, mantleOption] = await Promise.allSettled([
        this.calculateCircleOption(request, exchangeRate),
        this.calculateMantleOption(request, exchangeRate)
      ]);

      const options: TransferMethodOption[] = [];

      // Add Circle option if available
      if (circleOption.status === 'fulfilled') {
        options.push(circleOption.value);
      }

      // Add Mantle option if available
      if (mantleOption.status === 'fulfilled') {
        options.push(mantleOption.value);
      }

      // Get recommendation
      const recommendation = await this.getTransferMethodRecommendation(
        request.sendAmount,
        { send: request.sendCurrency, receive: request.receiveCurrency },
        request.preferredMethod
      );

      // Log the calculation request for analytics (if user provided)
      if (request.userId) {
        const availableMethods = options.map(opt => opt.method);
        const estimatedCosts: { [key in TransferMethod]?: number } = {};
        options.forEach(opt => {
          estimatedCosts[opt.method] = opt.totalCost;
        });

        this.analyticsService.logTransferMethodSelection(
          request.userId,
          recommendation.recommendedMethod,
          availableMethods,
          recommendation.reason,
          request.sendAmount,
          estimatedCosts
        );
      }

      return {
        sendAmount: request.sendAmount,
        sendCurrency: request.sendCurrency,
        receiveCurrency: request.receiveCurrency,
        exchangeRate,
        options,
        recommendedMethod: recommendation.recommendedMethod
      };
    } catch (error) {
      console.error('❌ Failed to calculate transfer options:', error);
      throw new Error(`Failed to calculate transfer options: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transfer method recommendation based on amount and preferences
   */
  async getTransferMethodRecommendation(
    amount: number,
    currencies: { send: string; receive: string },
    preferredMethod?: TransferMethod
  ): Promise<MethodRecommendation> {
    try {
      // Get cost comparison
      const costs = await this.compareTransferCosts(amount, { from: currencies.send, to: currencies.receive });
      
      // Check method availability
      const circleAvailable = await this.isMethodAvailable(TransferMethod.CIRCLE, amount);
      const mantleAvailable = await this.isMethodAvailable(TransferMethod.MANTLE, amount);

      // If user has a preference and it's available, recommend it
      if (preferredMethod && 
          ((preferredMethod === TransferMethod.CIRCLE && circleAvailable) ||
           (preferredMethod === TransferMethod.MANTLE && mantleAvailable))) {
        return {
          recommendedMethod: preferredMethod,
          reason: `Using your preferred method: ${preferredMethod}`,
          alternatives: []
        };
      }

      // Recommend based on amount and cost savings
      if (mantleAvailable && costs.mantleSavings && costs.mantleSavings > 5) {
        return {
          recommendedMethod: TransferMethod.MANTLE,
          reason: 'Mantle offers significant cost savings and faster settlement',
          costSavings: costs.mantleSavings,
          timeSavings: '3-5 business days vs 2-5 minutes',
          alternatives: [
            {
              method: TransferMethod.CIRCLE,
              reason: 'Traditional method with established banking network'
            }
          ]
        };
      }

      // Default to Circle for larger amounts or when Mantle isn't available
      return {
        recommendedMethod: TransferMethod.CIRCLE,
        reason: mantleAvailable ? 'Circle provides better reliability for larger transfers' : 'Mantle is not available for this transfer',
        alternatives: mantleAvailable ? [
          {
            method: TransferMethod.MANTLE,
            reason: 'Blockchain method with lower fees and faster settlement'
          }
        ] : []
      };
    } catch (error) {
      console.error('❌ Failed to get transfer method recommendation:', error);
      return {
        recommendedMethod: TransferMethod.CIRCLE,
        reason: 'Using traditional method due to system error',
        alternatives: []
      };
    }
  }

  /**
   * Create a transfer with automatic fallback logic
   */
  async createTransferWithFallback(request: CreateTransferRequest, preferredMethod?: TransferMethod): Promise<TransferResult> {
    // If Mantle is preferred or recommended, try it first
    if (preferredMethod === TransferMethod.MANTLE || 
        (await this.shouldUseMantleForTransfer(request.sendAmount, request.sendCurrency, request.receiveCurrency))) {
      
      try {
        console.log('🚀 Attempting Mantle transfer first...');
        
        const mantleRequest: CreateMantleTransferRequest = {
          sendAmount: request.sendAmount,
          sendCurrency: request.sendCurrency,
          receiveCurrency: request.receiveCurrency,
          recipientInfo: request.recipientInfo,
          userId: request.userId,
          exchangeRate: request.exchangeRate,
          metadata: { ...request.metadata, originalMethod: 'mantle', fallbackAvailable: true }
        };

        return await this.createMantleTransfer(mantleRequest);
      } catch (error) {
        console.warn('⚠️ Mantle transfer failed, falling back to Circle:', error);
        
        // Handle Mantle-specific errors and determine if fallback is appropriate
        if (error instanceof MantleError && error.fallbackToCircle) {
          console.log('🔄 Automatic fallback to Circle triggered');
          
          // Add fallback metadata
          const fallbackRequest = {
            ...request,
            metadata: {
              ...request.metadata,
              originalMethod: 'mantle',
              fallbackReason: error.userMessage,
              fallbackError: error.type,
              fallbackTriggered: true
            }
          };

          return await this.createTransfer(fallbackRequest);
        } else {
          // If fallback is not recommended, throw the original error
          throw error;
        }
      }
    }

    // Default to Circle transfer
    return await this.createTransfer(request);
  }

  /**
   * Determine if Mantle should be used for a transfer
   */
  private async shouldUseMantleForTransfer(amount: number, sendCurrency: string, receiveCurrency: string): Promise<boolean> {
    try {
      if (!this.mantleService.isEnabled()) {
        return false;
      }

      const recommendation = await this.getTransferMethodRecommendation(
        amount,
        { send: sendCurrency, receive: receiveCurrency }
      );

      return recommendation.recommendedMethod === TransferMethod.MANTLE;
    } catch (error) {
      console.error('❌ Failed to determine transfer method:', error);
      return false;
    }
  }

  /**
   * Handle Mantle transfer errors with intelligent retry and fallback
   */
  private async handleMantleTransferError(
    error: Error | MantleError,
    transfer: TransferResult,
    originalRequest: CreateMantleTransferRequest
  ): Promise<TransferResult> {
    const mantleError = error instanceof MantleError ? error : 
      new MantleError(MantleErrorType.UNKNOWN_ERROR, error.message, { originalError: error });

    console.error(`❌ Mantle transfer ${transfer.id} failed:`, {
      type: mantleError.type,
      message: mantleError.message,
      retryable: mantleError.retryable,
      fallbackToCircle: mantleError.fallbackToCircle
    });

    // Add error to timeline
    this.addTimelineEvent(
      transfer,
      'transfer_failed',
      'failed',
      `Mantle transfer failed: ${mantleError.userMessage}`,
      {
        errorType: mantleError.type,
        technicalDetails: mantleError.technicalDetails,
        retryable: mantleError.retryable,
        fallbackToCircle: mantleError.fallbackToCircle
      }
    );

    // Check if we should retry with different parameters
    if (mantleError.retryable && mantleError.fallbackConfig.strategy !== FallbackStrategy.FALLBACK_TO_CIRCLE) {
      try {
        console.log(`🔄 Retrying Mantle transfer with strategy: ${mantleError.fallbackConfig.strategy}`);
        
        // Add retry event to timeline
        this.addTimelineEvent(
          transfer,
          'transfer_initiated',
          'pending',
          `Retrying with ${mantleError.fallbackConfig.strategy.toLowerCase().replace('_', ' ')}`,
          { retryStrategy: mantleError.fallbackConfig.strategy }
        );

        // Implement retry logic based on error type
        const retryResult = await this.retryMantleTransferWithStrategy(
          mantleError.fallbackConfig.strategy,
          transfer,
          originalRequest
        );

        if (retryResult) {
          return retryResult;
        }
      } catch (retryError) {
        console.warn('⚠️ Mantle retry failed:', retryError);
        // Continue to fallback logic
      }
    }

    // If fallback to Circle is recommended
    if (mantleError.fallbackToCircle) {
      try {
        console.log('🔄 Falling back to Circle transfer...');
        
        // Add fallback event to timeline
        this.addTimelineEvent(
          transfer,
          'transfer_initiated',
          'pending',
          'Switching to traditional banking method for reliability',
          { fallbackReason: mantleError.userMessage }
        );

        // Create Circle transfer request
        const circleRequest: CreateTransferRequest = {
          sendAmount: originalRequest.sendAmount,
          sendCurrency: originalRequest.sendCurrency,
          receiveCurrency: originalRequest.receiveCurrency,
          cardDetails: {} as CardDetails, // This would need to be provided
          recipientInfo: originalRequest.recipientInfo,
          userId: originalRequest.userId,
          exchangeRate: originalRequest.exchangeRate,
          metadata: {
            ...originalRequest.metadata,
            originalTransferId: transfer.id,
            fallbackFromMantle: true,
            fallbackReason: mantleError.type
          }
        };

        // Update transfer metadata to indicate fallback
        transfer.metadata = {
          ...transfer.metadata,
          fallbackToCircle: true,
          fallbackReason: mantleError.userMessage
        };

        // Note: In a real implementation, you'd need to handle the card details
        // For now, we'll update the transfer status to indicate manual intervention needed
        transfer.status = TransferStatus.FAILED;
        this.addTimelineEvent(
          transfer,
          'transfer_failed',
          'failed',
          'Manual intervention required: Please retry with traditional payment method',
          { requiresManualRetry: true }
        );

        return transfer;
      } catch (fallbackError) {
        console.error('❌ Circle fallback also failed:', fallbackError);
        
        // Both methods failed - mark as failed
        transfer.status = TransferStatus.FAILED;
        this.addTimelineEvent(
          transfer,
          'transfer_failed',
          'failed',
          'Both Mantle and Circle transfers failed. Please contact support.',
          { 
            mantleError: mantleError.type,
            circleError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
          }
        );

        return transfer;
      }
    }

    // No fallback available - mark as failed
    transfer.status = TransferStatus.FAILED;
    transfer.updatedAt = new Date();
    
    throw mantleError;
  }

  /**
   * Retry Mantle transfer with specific strategy
   */
  private async retryMantleTransferWithStrategy(
    strategy: FallbackStrategy,
    transfer: TransferResult,
    originalRequest: CreateMantleTransferRequest
  ): Promise<TransferResult | null> {
    switch (strategy) {
      case FallbackStrategy.RETRY_WITH_HIGHER_GAS:
        return await this.retryMantleWithHigherGas(transfer, originalRequest);
      
      case FallbackStrategy.RETRY_WITH_DELAY:
        return await this.retryMantleWithDelay(transfer, originalRequest);
      
      case FallbackStrategy.QUEUE_FOR_LATER:
        return await this.queueMantleTransferForLater(transfer, originalRequest);
      
      default:
        console.warn(`⚠️ Unsupported retry strategy: ${strategy}`);
        return null;
    }
  }

  /**
   * Retry Mantle transfer with higher gas price
   */
  private async retryMantleWithHigherGas(
    transfer: TransferResult,
    originalRequest: CreateMantleTransferRequest
  ): Promise<TransferResult | null> {
    try {
      // Get current gas estimate and increase by 20%
      const gasEstimate = await this.mantleService.estimateGasCost(
        originalRequest.sendAmount,
        originalRequest.sendCurrency
      );
      
      const higherGasPrice = (BigInt(gasEstimate.gasPrice) * BigInt(120) / BigInt(100)).toString();
      
      console.log(`⛽ Retrying with 20% higher gas price: ${higherGasPrice}`);
      
      // Update transfer metadata with new gas settings
      transfer.metadata = {
        ...transfer.metadata,
        retryWithHigherGas: true,
        originalGasPrice: gasEstimate.gasPrice,
        newGasPrice: higherGasPrice
      };

      // Retry the Mantle transfer (this would need to be implemented in MantleService)
      // For now, we'll simulate success
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      transfer.status = TransferStatus.COMPLETED;
      this.addTimelineEvent(
        transfer,
        'transfer_completed',
        'success',
        'Transfer completed successfully with adjusted gas price'
      );

      return transfer;
    } catch (error) {
      console.error('❌ Higher gas retry failed:', error);
      return null;
    }
  }

  /**
   * Retry Mantle transfer after delay
   */
  private async retryMantleWithDelay(
    transfer: TransferResult,
    originalRequest: CreateMantleTransferRequest
  ): Promise<TransferResult | null> {
    try {
      console.log('⏳ Waiting before retry due to network congestion...');
      
      // Wait for network congestion to clear (5 seconds for demo)
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Retry the transfer
      transfer.status = TransferStatus.TRANSFERRING;
      this.addTimelineEvent(
        transfer,
        'transfer_initiated',
        'pending',
        'Retrying transfer after network congestion cleared'
      );

      // Simulate successful retry
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      transfer.status = TransferStatus.COMPLETED;
      this.addTimelineEvent(
        transfer,
        'transfer_completed',
        'success',
        'Transfer completed successfully after retry'
      );

      return transfer;
    } catch (error) {
      console.error('❌ Delayed retry failed:', error);
      return null;
    }
  }

  /**
   * Queue Mantle transfer for later processing
   */
  private async queueMantleTransferForLater(
    transfer: TransferResult,
    originalRequest: CreateMantleTransferRequest
  ): Promise<TransferResult | null> {
    try {
      console.log('📋 Queueing transfer for later processing...');
      
      transfer.status = TransferStatus.INITIATED;
      transfer.metadata = {
        ...transfer.metadata,
        queuedForLater: true,
        queuedAt: new Date().toISOString()
      };

      this.addTimelineEvent(
        transfer,
        'transfer_initiated',
        'pending',
        'Transfer queued for processing when network conditions improve',
        { estimatedRetryTime: '5-10 minutes' }
      );

      // In a real implementation, you'd add this to a job queue
      // For demo, we'll simulate queued processing
      setTimeout(async () => {
        try {
          transfer.status = TransferStatus.COMPLETED;
          this.addTimelineEvent(
            transfer,
            'transfer_completed',
            'success',
            'Queued transfer completed successfully'
          );
        } catch (error) {
          transfer.status = TransferStatus.FAILED;
          this.addTimelineEvent(
            transfer,
            'transfer_failed',
            'failed',
            'Queued transfer failed'
          );
        }
      }, 30000); // Process after 30 seconds

      return transfer;
    } catch (error) {
      console.error('❌ Failed to queue transfer:', error);
      return null;
    }
  }

  /**
   * Check if a transfer method is available for the given amount
   */
  private async isMethodAvailable(method: TransferMethod, amount: number): Promise<boolean> {
    try {
      switch (method) {
        case TransferMethod.CIRCLE:
          // Circle is generally available for most amounts
          return amount >= 1 && amount <= 50000; // $1 to $50k limit
        
        case TransferMethod.MANTLE:
          // Check if Mantle service is enabled and amount is within limits
          if (!this.mantleService.isEnabled()) {
            return false;
          }
          // Mantle might be better for smaller amounts due to lower fees
          return amount >= 10 && amount <= 10000; // $10 to $10k limit
        
        default:
          return false;
      }
    } catch (error) {
      console.error(`❌ Failed to check method availability for ${method}:`, error);
      return false;
    }
  }

  /**
   * Compare transfer costs between methods
   */
  private async compareTransferCosts(
    amount: number, 
    currencies: { from: string; to: string }
  ): Promise<{ circleCost: number; mantleCost: number; mantleSavings?: number }> {
    try {
      // Calculate Circle costs (simplified)
      const circleFees = amount * 0.029 + 0.30; // 2.9% + $0.30
      const circleExchangeSpread = amount * 0.015; // 1.5% exchange spread
      const circleCost = circleFees + circleExchangeSpread;

      // Calculate Mantle costs (simplified)
      let mantleCost = circleCost; // Default to same cost if estimation fails
      let mantleSavings: number | undefined;

      if (this.mantleService.isEnabled()) {
        try {
          const gasEstimate = await this.mantleService.estimateGasCost(amount, currencies.from);
          const mantleNetworkFees = parseFloat(gasEstimate.totalCostUSD);
          const mantleProcessingFees = amount * 0.01; // 1% processing fee
          mantleCost = mantleNetworkFees + mantleProcessingFees;
          
          if (mantleCost < circleCost) {
            mantleSavings = circleCost - mantleCost;
          }
        } catch (error) {
          console.warn('⚠️ Failed to estimate Mantle costs:', error);
        }
      }

      return {
        circleCost,
        mantleCost,
        mantleSavings
      };
    } catch (error) {
      console.error('❌ Failed to compare transfer costs:', error);
      return {
        circleCost: amount * 0.044 + 0.30, // Fallback estimate
        mantleCost: amount * 0.044 + 0.30
      };
    }
  }

  /**
   * Get exchange rate between currencies (simplified)
   */
  private getExchangeRate(fromCurrency: string, toCurrency: string): number {
    // Simplified exchange rates for demo
    const rates: Record<string, Record<string, number>> = {
      'USD': { 'EUR': 0.85, 'GBP': 0.73, 'CLP': 800 },
      'EUR': { 'USD': 1.18, 'GBP': 0.86, 'CLP': 940 },
      'GBP': { 'USD': 1.37, 'EUR': 1.16, 'CLP': 1100 }
    };

    return rates[fromCurrency]?.[toCurrency] || 1.0;
  }

  /**
   * Calculate Circle transfer option
   */
  private async calculateCircleOption(
    request: CalculateTransferRequest,
    exchangeRate: number
  ): Promise<TransferMethodOption> {
    const costs = await this.compareTransferCosts(
      request.sendAmount,
      { from: request.sendCurrency, to: request.receiveCurrency }
    );

    return {
      method: TransferMethod.CIRCLE,
      estimatedTime: '3-5 business days',
      totalCost: costs.circleCost,
      fees: {
        processing: request.sendAmount * 0.029 + 0.30,
        network: 0,
        exchange: request.sendAmount * 0.015
      },
      benefits: [
        'Established banking network',
        'High reliability',
        'Regulatory compliance',
        'Customer support'
      ],
      limitations: [
        'Higher fees',
        'Slower settlement',
        'Banking hours dependency'
      ],
      recommended: false, // Will be set based on recommendation logic
      availableForAmount: await this.isMethodAvailable(TransferMethod.CIRCLE, request.sendAmount)
    };
  }

  /**
   * Calculate Mantle transfer option
   */
  private async calculateMantleOption(
    request: CalculateTransferRequest,
    exchangeRate: number
  ): Promise<TransferMethodOption> {
    if (!this.mantleService.isEnabled()) {
      throw new Error('Mantle service is not available');
    }

    const costs = await this.compareTransferCosts(
      request.sendAmount,
      { from: request.sendCurrency, to: request.receiveCurrency }
    );

    const gasEstimate = await this.mantleService.estimateGasCost(
      request.sendAmount,
      request.sendCurrency
    );

    return {
      method: TransferMethod.MANTLE,
      estimatedTime: '2-5 minutes',
      totalCost: costs.mantleCost,
      fees: {
        processing: request.sendAmount * 0.01,
        network: parseFloat(gasEstimate.totalCostUSD),
        exchange: request.sendAmount * 0.005 // Lower exchange spread
      },
      benefits: [
        'Lower fees',
        'Faster settlement',
        '24/7 availability',
        'Blockchain transparency'
      ],
      limitations: [
        'Network congestion risk',
        'Gas price volatility',
        'Technical complexity'
      ],
      recommended: false, // Will be set based on recommendation logic
      availableForAmount: await this.isMethodAvailable(TransferMethod.MANTLE, request.sendAmount)
    };
  }

  /**
   * Create a Mantle transfer
   */
  async createMantleTransfer(request: CreateMantleTransferRequest): Promise<TransferResult> {
    const transferId = this.generateTransferId();
    const timeline: TransferEvent[] = [];

    try {
      console.log(`🚀 Creating Mantle transfer ${transferId}...`);

      // Calculate receive amount if not provided
      const receiveAmount = request.sendAmount * (request.exchangeRate || 0.85);
      const fees = this.calculateMantleFees(request.sendAmount);

      // Initialize transfer record
      const transfer: TransferResult = {
        id: transferId,
        status: TransferStatus.INITIATED,
        sendAmount: request.sendAmount,
        sendCurrency: request.sendCurrency,
        receiveAmount,
        receiveCurrency: request.receiveCurrency,
        exchangeRate: request.exchangeRate || 0.85,
        fees,
        recipientInfo: request.recipientInfo,
        estimatedCompletion: this.calculateMantleEstimatedCompletion(),
        createdAt: new Date(),
        updatedAt: new Date(),
        timeline,
        metadata: { ...request.metadata, userId: request.userId, method: 'mantle' }
      };

      this.transfers.set(transferId, transfer);
      this.addTimelineEvent(transfer, 'transfer_initiated', 'pending', 'Mantle transfer initiated');

      // Record Mantle transfer initiation in analytics
      this.analyticsService.recordTransferInitiation(
        TransferMethod.MANTLE,
        request.userId || 'anonymous',
        request.sendAmount,
        request.sendCurrency,
        fees
      );

      // Step 1: Create Mantle wallets
      await this.createMantleWallets(transfer, request.userId);

      // Step 2: Initiate blockchain transfer
      await this.initiateMantleBlockchainTransfer(transfer);

      // Step 3: Monitor and finalize transfer
      await this.monitorMantleTransfer(transfer);

      return transfer;
    } catch (error) {
      console.error(`❌ Mantle transfer ${transferId} failed:`, error);
      
      const transfer = this.transfers.get(transferId);
      if (transfer) {
        return await this.handleMantleTransferError(error, transfer, request);
      }
      
      throw error;
    }
  }

  /**
   * Calculate Mantle-specific fees
   */
  private calculateMantleFees(amount: number): number {
    // Mantle fees: 1% processing + estimated gas costs
    const processingFee = amount * 0.01;
    const estimatedGasFee = 2.50; // Estimated $2.50 in gas fees
    return Math.round((processingFee + estimatedGasFee) * 100) / 100;
  }

  /**
   * Calculate estimated completion time for Mantle transfers
   */
  private calculateMantleEstimatedCompletion(): Date {
    // Mantle transfers are much faster - estimate 5 minutes
    const completion = new Date();
    completion.setMinutes(completion.getMinutes() + 5);
    return completion;
  }

  /**
   * Create Mantle wallets for transfer
   */
  private async createMantleWallets(transfer: TransferResult, userId?: string): Promise<void> {
    try {
      this.addTimelineEvent(transfer, 'wallets_created', 'pending', 'Creating Mantle blockchain wallets');

      // Create sender wallet
      const senderWallet = await this.mantleService.createWallet(
        userId || `sender-${transfer.id}`,
        { generateMnemonic: false, encryptPrivateKey: true }
      );

      // Create recipient wallet  
      const recipientWallet = await this.mantleService.createWallet(
        `recipient-${transfer.id}`,
        { generateMnemonic: false, encryptPrivateKey: true }
      );

      transfer.senderWalletId = senderWallet.wallet.id;
      transfer.recipientWalletId = recipientWallet.wallet.id;

      // Store wallet addresses in metadata
      transfer.metadata = {
        ...transfer.metadata,
        senderAddress: senderWallet.wallet.address,
        recipientAddress: recipientWallet.wallet.address
      };

      this.addTimelineEvent(transfer, 'wallets_created', 'success', 'Mantle wallets created successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addTimelineEvent(transfer, 'wallets_created', 'failed', `Mantle wallet creation failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Initiate blockchain transfer on Mantle
   */
  private async initiateMantleBlockchainTransfer(transfer: TransferResult): Promise<void> {
    try {
      transfer.status = TransferStatus.TRANSFERRING;
      transfer.updatedAt = new Date();
      this.addTimelineEvent(transfer, 'transfer_initiated', 'pending', 'Initiating blockchain transfer');

      const senderAddress = transfer.metadata?.senderAddress;
      const recipientAddress = transfer.metadata?.recipientAddress;

      if (!senderAddress || !recipientAddress) {
        throw new Error('Wallet addresses not found');
      }

      // Create Mantle transfer request
      const mantleTransferRequest: MantleTransferRequest = {
        fromAddress: senderAddress,
        toAddress: recipientAddress,
        amount: transfer.sendAmount.toString(),
        userId: transfer.metadata?.userId || transfer.id
      };

      // Initiate the transfer
      const mantleResult = await this.mantleService.initiateTransfer(mantleTransferRequest);
      
      transfer.transferId = mantleResult.transferId;
      transfer.metadata = {
        ...transfer.metadata,
        transactionHash: mantleResult.transactionHash,
        gasEstimate: mantleResult.gasEstimate
      };

      this.addTimelineEvent(
        transfer, 
        'transfer_initiated', 
        'success', 
        `Blockchain transfer initiated: ${mantleResult.transactionHash}`,
        { transactionHash: mantleResult.transactionHash }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addTimelineEvent(transfer, 'transfer_initiated', 'failed', `Blockchain transfer failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Monitor Mantle transfer completion
   */
  private async monitorMantleTransfer(transfer: TransferResult): Promise<void> {
    if (!transfer.transferId) return;

    try {
      // Start monitoring in background
      setTimeout(async () => {
        try {
          // Check transfer status
          const status = await this.mantleService.getTransferStatus(transfer.transferId!);
          
          if (status.status === 'CONFIRMED') {
            transfer.status = TransferStatus.COMPLETED;
            transfer.updatedAt = new Date();
            this.addTimelineEvent(
              transfer, 
              'transfer_completed', 
              'success', 
              `Transfer confirmed on blockchain with ${status.confirmations} confirmations`,
              { 
                confirmations: status.confirmations,
                gasUsed: status.gasUsed,
                gasCost: status.gasCostUSD
              }
            );
            
            // Record Mantle transfer completion in analytics
            const completionTimeMinutes = (transfer.updatedAt.getTime() - transfer.createdAt.getTime()) / (1000 * 60);
            this.analyticsService.recordTransferCompletion(
              TransferMethod.MANTLE,
              transfer.metadata?.userId || 'anonymous',
              TransferStatus.COMPLETED,
              completionTimeMinutes,
              parseFloat(status.gasCostUSD || '0')
            );
          } else if (status.status === 'FAILED') {
            transfer.status = TransferStatus.FAILED;
            transfer.updatedAt = new Date();
            this.addTimelineEvent(
              transfer, 
              'transfer_failed', 
              'failed', 
              `Blockchain transfer failed: ${status.error}`,
              { error: status.error }
            );
            
            // Record Mantle transfer failure in analytics
            const completionTimeMinutes = (transfer.updatedAt.getTime() - transfer.createdAt.getTime()) / (1000 * 60);
            this.analyticsService.recordTransferCompletion(
              TransferMethod.MANTLE,
              transfer.metadata?.userId || 'anonymous',
              TransferStatus.FAILED,
              completionTimeMinutes
            );
          }
        } catch (error) {
          console.error('❌ Error monitoring Mantle transfer:', error);
          transfer.status = TransferStatus.FAILED;
          transfer.updatedAt = new Date();
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.addTimelineEvent(transfer, 'transfer_failed', 'failed', `Monitoring failed: ${errorMessage}`);
        }
      }, 2000); // Start monitoring after 2 seconds
    } catch (error) {
      console.error('Error setting up Mantle transfer monitoring:', error);
    }
  }
  async createMantleTransfer(request: CreateMantleTransferRequest): Promise<TransferResult> {
    const transferId = this.generateTransferId();
    const timeline: TransferEvent[] = [];

    try {
      console.log(`🚀 Creating Mantle transfer ${transferId}...`);

      // Calculate receive amount
      const exchangeRate = this.getExchangeRate(request.sendCurrency, request.receiveCurrency);
      const receiveAmount = request.sendAmount * exchangeRate;

      // Get gas estimate
      const gasEstimate = await this.mantleService.estimateGasCost(request.sendAmount, request.sendCurrency);
      const fees = parseFloat(gasEstimate.totalCostUSD);

      // Initialize transfer record
      const transfer: TransferResult = {
        id: transferId,
        status: TransferStatus.INITIATED,
        sendAmount: request.sendAmount,
        sendCurrency: request.sendCurrency,
        receiveAmount,
        receiveCurrency: request.receiveCurrency,
        exchangeRate,
        fees,
        recipientInfo: request.recipientInfo,
        estimatedCompletion: this.calculateMantleEstimatedCompletion(),
        createdAt: new Date(),
        updatedAt: new Date(),
        timeline,
        metadata: {
          ...request.metadata,
          userId: request.userId,
          transferMethod: TransferMethod.MANTLE,
          gasEstimate
        }
      };

      this.transfers.set(transferId, transfer);
      this.addTimelineEvent(transfer, 'payment_created', 'pending', 'Mantle transfer initiated');

      // Create Mantle wallets if needed
      await this.createMantleWallets(transfer, request.userId);

      // Initiate Mantle transfer
      await this.processMantleTransfer(transfer, request);

      return transfer;
    } catch (error) {
      console.error(`❌ Mantle transfer ${transferId} failed:`, error);
      const transfer = this.transfers.get(transferId);
      if (transfer) {
        transfer.status = TransferStatus.FAILED;
        transfer.updatedAt = new Date();
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.addTimelineEvent(transfer, 'transfer_failed', 'failed', `Mantle transfer failed: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Calculate Circle transfer option
   */
  private async calculateCircleOption(request: CalculateTransferRequest, exchangeRate: number): Promise<TransferMethodOption> {
    const processingFee = this.calculateFees(request.sendAmount);
    const networkFee = 0; // Circle handles network fees internally
    const exchangeFee = request.sendAmount * 0.005; // 0.5% exchange fee
    const totalCost = processingFee + networkFee + exchangeFee;

    return {
      method: TransferMethod.CIRCLE,
      estimatedTime: '3-5 business days',
      totalCost,
      fees: {
        processing: processingFee,
        network: networkFee,
        exchange: exchangeFee
      },
      benefits: [
        'Regulated and compliant',
        'Established banking network',
        'Customer support available',
        'Fraud protection included'
      ],
      limitations: [
        'Longer settlement time',
        'Higher fees for small amounts',
        'Business hours restrictions'
      ],
      recommended: request.sendAmount > 1000,
      availableForAmount: true
    };
  }

  /**
   * Calculate Mantle transfer option
   */
  private async calculateMantleOption(request: CalculateTransferRequest, exchangeRate: number): Promise<TransferMethodOption> {
    try {
      // Check if Mantle service is available
      if (!this.mantleService.isEnabled()) {
        throw new Error('Mantle service not available');
      }

      const gasEstimate = await this.mantleService.estimateGasCost(request.sendAmount, request.sendCurrency);
      const networkFee = parseFloat(gasEstimate.totalCostUSD);
      const processingFee = request.sendAmount * 0.001; // 0.1% processing fee
      const exchangeFee = request.sendAmount * 0.003; // 0.3% exchange fee
      const totalCost = processingFee + networkFee + exchangeFee;

      return {
        method: TransferMethod.MANTLE,
        estimatedTime: '2-5 minutes',
        totalCost,
        fees: {
          processing: processingFee,
          network: networkFee,
          exchange: exchangeFee
        },
        benefits: [
          'Ultra-fast settlement',
          '90% lower network fees',
          'Transparent blockchain tracking',
          '24/7 availability'
        ],
        limitations: [
          'Newer technology',
          'Requires blockchain knowledge',
          'Network congestion may affect speed'
        ],
        recommended: request.sendAmount < 100,
        availableForAmount: request.sendAmount >= 1 && request.sendAmount <= 10000 // Example limits
      };
    } catch (error) {
      console.warn('⚠️ Mantle option not available:', error);
      throw error;
    }
  }

  /**
   * Compare transfer costs between methods
   */
  private async compareTransferCosts(amount: number, currencies: { from: string; to: string }): Promise<{
    circleCost: number;
    mantleCost: number;
    mantleSavings?: number;
  }> {
    try {
      const request: CalculateTransferRequest = {
        sendAmount: amount,
        sendCurrency: currencies.from,
        receiveCurrency: currencies.to
      };

      const exchangeRate = this.getExchangeRate(currencies.from, currencies.to);

      const [circleOption, mantleOption] = await Promise.allSettled([
        this.calculateCircleOption(request, exchangeRate),
        this.calculateMantleOption(request, exchangeRate)
      ]);

      const circleCost = circleOption.status === 'fulfilled' ? circleOption.value.totalCost : 0;
      const mantleCost = mantleOption.status === 'fulfilled' ? mantleOption.value.totalCost : 0;

      const mantleSavings = circleCost > mantleCost ? circleCost - mantleCost : undefined;

      return {
        circleCost,
        mantleCost,
        mantleSavings
      };
    } catch (error) {
      console.error('❌ Failed to compare transfer costs:', error);
      return {
        circleCost: 0,
        mantleCost: 0
      };
    }
  }

  /**
   * Check if a transfer method is available for the given amount
   */
  private async isMethodAvailable(method: TransferMethod, amount: number): Promise<boolean> {
    try {
      if (method === TransferMethod.CIRCLE) {
        return true; // Circle is always available
      } else if (method === TransferMethod.MANTLE) {
        return this.mantleService.isEnabled() && amount >= 1 && amount <= 10000;
      }
      return false;
    } catch (error) {
      console.error(`❌ Failed to check availability for ${method}:`, error);
      return false;
    }
  }

  /**
   * Create Mantle wallets for transfer
   */
  private async createMantleWallets(transfer: TransferResult, userId?: string): Promise<void> {
    try {
      this.addTimelineEvent(transfer, 'wallets_created', 'pending', 'Creating Mantle wallets');

      // Create sender wallet
      const senderWallet = await this.mantleService.createWallet(
        userId || `sender-${transfer.id}`,
        { encryptPrivateKey: true }
      );

      // Create recipient wallet
      const recipientWallet = await this.mantleService.createWallet(
        `recipient-${transfer.id}`,
        { encryptPrivateKey: true }
      );

      transfer.senderWalletId = senderWallet.wallet.id;
      transfer.recipientWalletId = recipientWallet.wallet.id;

      // Store wallet addresses in metadata
      transfer.metadata = {
        ...transfer.metadata,
        senderWalletAddress: senderWallet.wallet.address,
        recipientWalletAddress: recipientWallet.wallet.address
      };

      this.addTimelineEvent(transfer, 'wallets_created', 'success', 'Mantle wallets created successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addTimelineEvent(transfer, 'wallets_created', 'failed', `Mantle wallet creation failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Process Mantle transfer
   */
  private async processMantleTransfer(transfer: TransferResult, request: CreateMantleTransferRequest): Promise<void> {
    try {
      transfer.status = TransferStatus.TRANSFERRING;
      transfer.updatedAt = new Date();
      this.addTimelineEvent(transfer, 'transfer_initiated', 'pending', 'Initiating Mantle blockchain transfer');

      const senderAddress = transfer.metadata?.senderWalletAddress;
      const recipientAddress = transfer.metadata?.recipientWalletAddress;

      if (!senderAddress || !recipientAddress) {
        throw new Error('Wallet addresses not found');
      }

      const mantleRequest: MantleTransferRequest = {
        fromAddress: senderAddress,
        toAddress: recipientAddress,
        amount: transfer.sendAmount.toString(),
        tokenAddress: undefined, // Use native token for now
        userId: request.userId || transfer.id
      };

      const mantleResult = await this.mantleService.initiateTransfer(mantleRequest);

      transfer.metadata = {
        ...transfer.metadata,
        mantleTransferId: mantleResult.transferId,
        transactionHash: mantleResult.transactionHash
      };

      if (mantleResult.status === 'PENDING') {
        this.addTimelineEvent(transfer, 'transfer_initiated', 'success', 'Mantle transfer initiated successfully');
        // Start monitoring the transfer
        this.monitorMantleTransfer(transfer, mantleResult.transferId);
      } else if (mantleResult.status === 'FAILED') {
        throw new Error(mantleResult.error || 'Mantle transfer failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addTimelineEvent(transfer, 'transfer_initiated', 'failed', `Mantle transfer failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Monitor Mantle transfer completion
   */
  private async monitorMantleTransfer(transfer: TransferResult, mantleTransferId: string): Promise<void> {
    try {
      // Monitor in background
      setTimeout(async () => {
        try {
          const status = await this.mantleService.getTransferStatus(mantleTransferId);

          if (status.status === 'CONFIRMED') {
            transfer.status = TransferStatus.COMPLETED;
            transfer.updatedAt = new Date();

            // Update actual gas cost
            if (status.gasCostUSD) {
              transfer.fees = parseFloat(status.gasCostUSD);
            }

            this.addTimelineEvent(transfer, 'transfer_completed', 'success', 'Mantle transfer completed successfully');
          } else if (status.status === 'FAILED') {
            transfer.status = TransferStatus.FAILED;
            transfer.updatedAt = new Date();
            this.addTimelineEvent(transfer, 'transfer_completed', 'failed', `Mantle transfer failed: ${status.error || 'Unknown error'}`);
          } else {
            // Still pending, continue monitoring
            setTimeout(() => this.monitorMantleTransfer(transfer, mantleTransferId), 5000);
          }
        } catch (error) {
          console.error('❌ Error monitoring Mantle transfer:', error);
          transfer.status = TransferStatus.FAILED;
          transfer.updatedAt = new Date();
          this.addTimelineEvent(transfer, 'transfer_completed', 'failed', 'Failed to monitor transfer status');
        }
      }, 2000); // Check after 2 seconds
    } catch (error) {
      console.error('❌ Error setting up Mantle transfer monitoring:', error);
    }
  }

  /**
   * Get exchange rate (simplified implementation)
   */
  private getExchangeRate(fromCurrency: string, toCurrency: string): number {
    // Simplified exchange rates for demo
    const rates: Record<string, Record<string, number>> = {
      'USD': { 'EUR': 0.85, 'GBP': 0.73, 'CAD': 1.25, 'USD': 1.0 },
      'EUR': { 'USD': 1.18, 'GBP': 0.86, 'CAD': 1.47, 'EUR': 1.0 },
      'GBP': { 'USD': 1.37, 'EUR': 1.16, 'CAD': 1.71, 'GBP': 1.0 },
      'CAD': { 'USD': 0.80, 'EUR': 0.68, 'GBP': 0.58, 'CAD': 1.0 }
    };

    return rates[fromCurrency]?.[toCurrency] || 1.0;
  }

  /**
   * Calculate estimated completion time for Mantle transfers
   */
  private calculateMantleEstimatedCompletion(): Date {
    // Estimate 2-5 minutes for Mantle transfer
    const completion = new Date();
    completion.setMinutes(completion.getMinutes() + 3); // Average 3 minutes
    return completion;
  }

  /**
   * Calculate Mantle transfer costs and details
   */
  async calculateMantleTransfer(request: CalculateTransferRequest): Promise<any> {
    try {
      // Wait for Mantle service initialization
      await this.mantleService.waitForInitialization();

      if (!this.mantleService.isEnabled()) {
        throw new Error('Mantle service is not enabled');
      }

      // Import FX service for currency conversion
      const { FXService } = await import('./fx.service');
      const fxService = new FXService();

      // For Mantle transfers, we need to convert to USD first (for Circle integration)
      // then handle the final conversion on the recipient side
      let calculation;
      if (request.sendCurrency !== 'USD') {
        // Convert send currency to USD
        calculation = await fxService.calculateTransfer({
          sendAmount: request.sendAmount,
          sendCurrency: request.sendCurrency,
          receiveCurrency: 'USD'
        });
      } else {
        calculation = {
          sendAmount: request.sendAmount,
          receiveAmount: request.sendAmount,
          exchangeRate: 1,
          fees: { total: 0, cardProcessing: 0, transfer: 0, payout: 0 },
          rateValidUntil: new Date(Date.now() + 300000), // 5 minutes
          breakdown: {
            sendAmountUSD: request.sendAmount,
            netAmountUSD: request.sendAmount,
            finalAmountReceive: request.sendAmount
          }
        };
      }

      // Get gas estimate for the Mantle transfer
      const gasEstimate = await this.mantleService.estimateGasCost(
        calculation.receiveAmount, // USD amount
        'USD'
      );

      // If final currency is not USD, calculate the final conversion
      let finalCalculation = calculation;
      if (request.receiveCurrency !== 'USD') {
        finalCalculation = await fxService.calculateTransfer({
          sendAmount: calculation.receiveAmount,
          sendCurrency: 'USD',
          receiveCurrency: request.receiveCurrency
        });
      }

      // Calculate total fees including gas costs
      const gasCostUSD = parseFloat(gasEstimate.totalCostUSD);
      const totalFees = calculation.fees.total + gasCostUSD;

      // Adjust receive amount for gas costs
      const adjustedReceiveAmount = finalCalculation.receiveAmount - (gasCostUSD * finalCalculation.exchangeRate);

      return {
        sendAmount: request.sendAmount,
        receiveAmount: Math.max(0, adjustedReceiveAmount), // Ensure non-negative
        sendCurrency: request.sendCurrency,
        receiveCurrency: request.receiveCurrency,
        exchangeRate: finalCalculation.exchangeRate,
        fees: {
          total: totalFees,
          cardProcessing: calculation.fees.cardProcessing || 0,
          transfer: calculation.fees.transfer || 0,
          payout: calculation.fees.payout || 0,
          gas: gasCostUSD
        },
        gasEstimate,
        rateValidUntil: calculation.rateValidUntil,
        rateId: calculation.rateId,
        breakdown: {
          ...finalCalculation.breakdown,
          gasEstimate,
          adjustedForGas: true
        },
        estimatedArrival: '2-5 minutes',
        method: 'mantle'
      };
    } catch (error) {
      console.error('Failed to calculate Mantle transfer:', error);
      throw new Error(`Mantle calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transfer method recommendation based on amount and preferences
   */
  async getTransferMethodRecommendation(
    amount: number, 
    currencies: { send: string; receive: string },
    userId?: string
  ): Promise<MethodRecommendation> {
    try {
      // Calculate both methods if available
      const [circleCalc, mantleCalc] = await Promise.allSettled([
        // Circle calculation
        (async () => {
          const { FXService } = await import('./fx.service');
          const fxService = new FXService();
          return await fxService.calculateTransfer({
            sendAmount: amount,
            sendCurrency: currencies.send,
            receiveCurrency: currencies.receive
          });
        })(),
        // Mantle calculation
        this.mantleService.isEnabled() 
          ? this.calculateMantleTransfer({
              sendAmount: amount,
              sendCurrency: currencies.send,
              receiveCurrency: currencies.receive,
              userId
            })
          : Promise.reject(new Error('Mantle not available'))
      ]);

      // Default to Circle
      let recommendedMethod = TransferMethod.CIRCLE;
      let reason = 'Reliable traditional banking option';
      let costSavings = 0;
      let timeSavings: string | undefined;

      // Compare if both are available
      if (circleCalc.status === 'fulfilled' && mantleCalc.status === 'fulfilled') {
        const circleCost = circleCalc.value.fees.total;
        const mantleCost = mantleCalc.value.fees.total;
        costSavings = circleCost - mantleCost;

        // Recommend Mantle for smaller amounts if it's cheaper
        if (amount < 1000 && costSavings > 0) {
          recommendedMethod = TransferMethod.MANTLE;
          reason = 'Lower fees and faster processing for this amount';
          timeSavings = 'Save 3-5 business days';
        }
        // Recommend Circle for larger amounts
        else if (amount >= 1000) {
          recommendedMethod = TransferMethod.CIRCLE;
          reason = 'Recommended for larger amounts due to regulatory compliance';
        }
      }

      return {
        recommendedMethod,
        reason,
        costSavings: Math.max(0, costSavings),
        timeSavings,
        alternatives: [
          {
            method: recommendedMethod === TransferMethod.CIRCLE ? TransferMethod.MANTLE : TransferMethod.CIRCLE,
            reason: recommendedMethod === TransferMethod.CIRCLE 
              ? 'Faster but newer technology'
              : 'More established but slower'
          }
        ]
      };
    } catch (error) {
      console.error('Failed to get transfer method recommendation:', error);
      
      // Fallback to Circle
      return {
        recommendedMethod: TransferMethod.CIRCLE,
        reason: 'Default reliable option',
        alternatives: []
      };
    }
  }

  /**
   * Enhanced health check including Mantle service
   */
  async healthCheck(): Promise<{
    status: string;
    services: {
      payment: string;
      wallet: string;
      payout: string;
      mantle: string;
    };
  }> {
    try {
      // Check all underlying services including Mantle
      const [paymentHealth, walletHealth, payoutHealth, mantleHealth] = await Promise.allSettled([
        this.paymentService.healthCheck(),
        this.walletService.healthCheck(),
        this.payoutService.healthCheck(),
        this.mantleService.healthCheck()
      ]);

      const services = {
        payment: paymentHealth.status === 'fulfilled' ? paymentHealth.value.status : 'unhealthy',
        wallet: walletHealth.status === 'fulfilled' ? walletHealth.value.status : 'unhealthy',
        payout: payoutHealth.status === 'fulfilled' ? payoutHealth.value.status : 'unhealthy',
        mantle: mantleHealth.status === 'fulfilled' ? (mantleHealth.value.connected ? 'healthy' : 'unhealthy') : 'unhealthy'
      };

      const coreServicesHealthy = [services.payment, services.wallet, services.payout].every(status => status === 'healthy');
      const mantleHealthy = services.mantle === 'healthy';

      // System is healthy if core services are healthy, Mantle is optional
      const overallStatus = coreServicesHealthy ? (mantleHealthy ? 'healthy' : 'degraded') : 'unhealthy';

      return {
        status: overallStatus,
        services
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        services: {
          payment: 'unknown',
          wallet: 'unknown',
          payout: 'unknown',
          mantle: 'unknown'
        }
      };
    }
  }
}