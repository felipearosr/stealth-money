import { CirclePaymentService, CardDetails, PaymentResponse } from './circle-payment.service';
import { CircleWalletService, WalletResponse, TransferResponse } from './circle-wallet.service';
import { CirclePayoutService, BankAccount, PayoutResponse } from './circle-payout.service';
import { MantleService, MantleTransferRequest, MantleTransferResult, GasEstimate } from './mantle.service';

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
  private transfers: Map<string, TransferResult> = new Map(); // In-memory storage for demo

  constructor() {
    this.paymentService = new CirclePaymentService();
    this.walletService = new CircleWalletService();
    this.payoutService = new CirclePayoutService();
    this.mantleService = new MantleService();
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
        } catch (error) {
          transfer.status = TransferStatus.FAILED;
          transfer.updatedAt = new Date();
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.addTimelineEvent(transfer, 'payout_completed', 'failed', `Payout failed: ${errorMessage}`);
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
        { from: request.sendCurrency, to: request.receiveCurrency },
        request.preferredMethod
      );

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
    currencies: { from: string; to: string },
    preferredMethod?: TransferMethod
  ): Promise<MethodRecommendation> {
    try {
      // Check if Mantle is available first
      const mantleAvailable = await this.isMethodAvailable(TransferMethod.MANTLE, amount);

      // If user has a preferred method and it's available, recommend it
      if (preferredMethod) {
        const isAvailable = await this.isMethodAvailable(preferredMethod, amount);
        if (isAvailable) {
          return {
            recommendedMethod: preferredMethod,
            reason: 'Based on your preference',
            alternatives: [{
              method: preferredMethod === TransferMethod.CIRCLE ? TransferMethod.MANTLE : TransferMethod.CIRCLE,
              reason: 'Alternative option available'
            }]
          };
        }
      }

      // If Mantle is not available, default to Circle
      if (!mantleAvailable) {
        return {
          recommendedMethod: TransferMethod.CIRCLE,
          reason: 'Mantle service not available, using reliable Circle option',
          alternatives: [{
            method: TransferMethod.MANTLE,
            reason: 'Blockchain option (currently unavailable)'
          }]
        };
      }

      // Get cost comparison
      const costComparison = await this.compareTransferCosts(amount, currencies);

      // Recommendation logic based on requirements
      if (amount < 100) {
        // For amounts below $100, recommend Mantle for cost efficiency
        return {
          recommendedMethod: TransferMethod.MANTLE,
          reason: 'Lower fees for smaller amounts',
          costSavings: costComparison.mantleSavings,
          timeSavings: 'Up to 3 days faster',
          alternatives: [{
            method: TransferMethod.CIRCLE,
            reason: 'More regulatory compliance and reliability'
          }]
        };
      } else if (amount > 1000) {
        // For amounts above $1000, recommend Circle for regulatory compliance
        return {
          recommendedMethod: TransferMethod.CIRCLE,
          reason: 'Better regulatory compliance and reliability for larger amounts',
          alternatives: [{
            method: TransferMethod.MANTLE,
            reason: `Save approximately $${costComparison.mantleSavings?.toFixed(2)} in fees`
          }]
        };
      } else {
        // For medium amounts, recommend based on cost savings
        const significantSavings = (costComparison.mantleSavings || 0) > (amount * 0.01); // 1% savings threshold

        if (significantSavings) {
          return {
            recommendedMethod: TransferMethod.MANTLE,
            reason: 'Significant cost savings with fast settlement',
            costSavings: costComparison.mantleSavings,
            timeSavings: 'Up to 3 days faster',
            alternatives: [{
              method: TransferMethod.CIRCLE,
              reason: 'Traditional banking with established regulatory framework'
            }]
          };
        } else {
          return {
            recommendedMethod: TransferMethod.CIRCLE,
            reason: 'Established reliability with minimal cost difference',
            alternatives: [{
              method: TransferMethod.MANTLE,
              reason: 'Faster settlement with blockchain technology'
            }]
          };
        }
      }
    } catch (error) {
      console.error('❌ Failed to get method recommendation:', error);
      // Default to Circle if recommendation fails
      return {
        recommendedMethod: TransferMethod.CIRCLE,
        reason: 'Default recommendation due to system error',
        alternatives: [{
          method: TransferMethod.MANTLE,
          reason: 'Alternative blockchain option'
        }]
      };
    }
  }

  /**
   * Create a Mantle transfer
   */
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