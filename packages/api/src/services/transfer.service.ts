import { CirclePaymentService, CardDetails, PaymentResponse } from './circle-payment.service';
import { CircleWalletService, WalletResponse, TransferResponse } from './circle-wallet.service';
import { CirclePayoutService, BankAccount, PayoutResponse } from './circle-payout.service';

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
 * Interface for transfer creation request
 */
export interface CreateTransferRequest {
  sendAmount: number;
  sendCurrency: 'USD';
  receiveCurrency: 'EUR';
  cardDetails: CardDetails;
  recipientInfo: RecipientInfo;
  userId?: string;
  exchangeRate?: number;
  metadata?: Record<string, any>;
}

/**
 * Interface for recipient information
 */
export interface RecipientInfo {
  name: string;
  email: string;
  phone?: string;
  bankAccount: BankAccount;
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
 */
export class TransferService {
  private paymentService: CirclePaymentService;
  private walletService: CircleWalletService;
  private payoutService: CirclePayoutService;
  private transfers: Map<string, TransferResult> = new Map(); // In-memory storage for demo

  constructor() {
    this.paymentService = new CirclePaymentService();
    this.walletService = new CircleWalletService();
    this.payoutService = new CirclePayoutService();
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

      const payout = await this.payoutService.createPayout({
        amount: transfer.receiveAmount.toString(),
        currency: 'EUR',
        sourceWalletId: transfer.recipientWalletId,
        bankAccount: transfer.recipientInfo.bankAccount,
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
   * Health check for all underlying services
   */
  async healthCheck(): Promise<{
    status: string;
    services: {
      payment: string;
      wallet: string;
      payout: string;
    };
  }> {
    try {
      // Check all underlying services
      const [paymentHealth, walletHealth, payoutHealth] = await Promise.allSettled([
        this.paymentService.healthCheck(),
        this.walletService.healthCheck(),
        this.payoutService.healthCheck()
      ]);

      const services = {
        payment: paymentHealth.status === 'fulfilled' ? paymentHealth.value.status : 'unhealthy',
        wallet: walletHealth.status === 'fulfilled' ? walletHealth.value.status : 'unhealthy',
        payout: payoutHealth.status === 'fulfilled' ? payoutHealth.value.status : 'unhealthy'
      };

      const allHealthy = Object.values(services).every(status => status === 'healthy');

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        services
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        services: {
          payment: 'unknown',
          wallet: 'unknown',
          payout: 'unknown'
        }
      };
    }
  }
}