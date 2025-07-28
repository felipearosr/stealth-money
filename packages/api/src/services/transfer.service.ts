import { PrismaClient } from '@prisma/client';
import { PaymentRequestService, PaymentRequestData } from './payment-request.service';
import { PaymentProcessorService, LocationData, SelectionCriteria, PaymentData } from './payment-processor.service';
import { v4 as uuidv4 } from 'uuid';

export interface UnregisteredUserData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country: string;
  currency: string;
}

export interface TransferRequest {
  senderId?: string; // Optional for unregistered users
  recipientId: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface PaymentRequestTransferData {
  paymentRequestId: string;
  senderData: UnregisteredUserData;
  processorId?: string;
  settlementMethod?: string;
  metadata?: Record<string, any>;
}

export interface TransferResult {
  success: boolean;
  transferId?: string;
  paymentId?: string;
  userId?: string; // For newly created users
  requiresOnboarding?: boolean;
  onboardingToken?: string;
  error?: string;
}

export interface OnboardingFlowData {
  token: string;
  paymentRequestId: string;
  userData: UnregisteredUserData;
  expiresAt: Date;
}

export class TransferService {
  private prisma: PrismaClient;
  private paymentRequestService: PaymentRequestService;
  private paymentProcessorService: PaymentProcessorService;
  private onboardingTokens: Map<string, OnboardingFlowData>;

  constructor() {
    this.prisma = new PrismaClient();
    this.paymentRequestService = new PaymentRequestService();
    this.paymentProcessorService = new PaymentProcessorService();
    this.onboardingTokens = new Map();
    
    // Start cleanup interval for expired onboarding tokens
    this.startOnboardingTokenCleanup();
  }

  /**
   * Creates a standard user-to-user transfer (existing functionality)
   */
  async createUserToUserTransfer(transferRequest: TransferRequest): Promise<TransferResult> {
    try {
      if (!transferRequest.senderId) {
        throw new Error('Sender ID is required for user-to-user transfers');
      }

      // Verify both users exist
      const [sender, recipient] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: transferRequest.senderId } }),
        this.prisma.user.findUnique({ where: { id: transferRequest.recipientId } })
      ]);

      if (!sender) {
        throw new Error('Sender not found');
      }

      if (!recipient) {
        throw new Error('Recipient not found');
      }

      // Get sender's location for processor selection
      const location = await this.paymentProcessorService.analyzeUserLocation(transferRequest.senderId);
      
      // Select optimal payment processor
      const availableProcessors = await this.paymentProcessorService.getAvailableProcessors(location);
      const selection = await this.paymentProcessorService.selectOptimalProcessor(
        availableProcessors,
        { prioritizeCost: true, prioritizeSpeed: false, prioritizeReliability: true }
      );

      // Create payment record
      const payment = await this.prisma.payment.create({
        data: {
          senderId: transferRequest.senderId,
          recipientId: transferRequest.recipientId,
          amount: transferRequest.amount,
          currency: transferRequest.currency,
          processorId: selection.selectedProcessor.id,
          settlementMethod: 'circle', // Default settlement method
          status: 'PENDING',
          metadata: transferRequest.metadata || {},
        },
      });

      return {
        success: true,
        transferId: payment.id,
        paymentId: payment.id,
      };
    } catch (error) {
      console.error('Error creating user-to-user transfer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create transfer',
      };
    }
  }

  /**
   * Handles payment request access by unregistered users
   * Triggers onboarding flow and returns onboarding token
   */
  async handleUnregisteredUserAccess(paymentRequestId: string, userData: UnregisteredUserData): Promise<TransferResult> {
    try {
      // Verify payment request exists and is valid
      const paymentRequest = await this.paymentRequestService.getRequestStatus(paymentRequestId);
      
      if (!paymentRequest) {
        throw new Error('Payment request not found');
      }

      if (paymentRequest.status !== 'PENDING') {
        throw new Error('Payment request is not available for payment');
      }

      if (new Date() > paymentRequest.expiresAt) {
        throw new Error('Payment request has expired');
      }

      // Check if user already exists by email
      const existingUser = await this.prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        // User exists, proceed with normal payment flow
        return this.processPaymentRequestForRegisteredUser(paymentRequestId, existingUser.id);
      }

      // Create onboarding token for unregistered user
      const onboardingToken = uuidv4();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      const onboardingData: OnboardingFlowData = {
        token: onboardingToken,
        paymentRequestId,
        userData,
        expiresAt,
      };

      this.onboardingTokens.set(onboardingToken, onboardingData);

      return {
        success: true,
        requiresOnboarding: true,
        onboardingToken,
      };
    } catch (error) {
      console.error('Error handling unregistered user access:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process request',
      };
    }
  }

  /**
   * Completes user onboarding and processes payment request
   */
  async completeOnboardingAndProcessPayment(
    onboardingToken: string,
    additionalUserData?: Partial<UnregisteredUserData>
  ): Promise<TransferResult> {
    try {
      const onboardingData = this.onboardingTokens.get(onboardingToken);
      
      if (!onboardingData) {
        throw new Error('Invalid or expired onboarding token');
      }

      if (new Date() > onboardingData.expiresAt) {
        this.onboardingTokens.delete(onboardingToken);
        throw new Error('Onboarding token has expired');
      }

      // Merge additional user data if provided
      const finalUserData = {
        ...onboardingData.userData,
        ...additionalUserData,
      };

      // Create new user account
      const newUser = await this.prisma.user.create({
        data: {
          email: finalUserData.email,
          firstName: finalUserData.firstName,
          lastName: finalUserData.lastName,
          phone: finalUserData.phone,
          country: finalUserData.country,
          currency: finalUserData.currency,
          kycStatus: 'PENDING',
        },
      });

      // Clean up onboarding token
      this.onboardingTokens.delete(onboardingToken);

      // Process the payment request with the new user
      const paymentResult = await this.processPaymentRequestForRegisteredUser(
        onboardingData.paymentRequestId,
        newUser.id
      );

      return {
        ...paymentResult,
        userId: newUser.id,
      };
    } catch (error) {
      console.error('Error completing onboarding and processing payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete onboarding',
      };
    }
  }

  /**
   * Processes payment request for registered users
   */
  private async processPaymentRequestForRegisteredUser(
    paymentRequestId: string,
    senderId: string
  ): Promise<TransferResult> {
    try {
      const paymentRequest = await this.paymentRequestService.getRequestStatus(paymentRequestId);
      
      if (!paymentRequest) {
        throw new Error('Payment request not found');
      }

      // Get sender's location for processor selection
      const location = await this.paymentProcessorService.analyzeUserLocation(senderId);
      
      // Select optimal payment processor
      const availableProcessors = await this.paymentProcessorService.getAvailableProcessors(location);
      const selection = await this.paymentProcessorService.selectOptimalProcessor(
        availableProcessors,
        { prioritizeCost: true, prioritizeSpeed: false, prioritizeReliability: true }
      );

      // Process the payment request
      const paymentData = {
        senderId,
        processorId: selection.selectedProcessor.id,
        settlementMethod: 'circle',
        metadata: {},
      };

      const result = await this.paymentRequestService.processPaymentRequest(
        paymentRequestId,
        paymentData
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to process payment request');
      }

      return {
        success: true,
        transferId: result.paymentId,
        paymentId: result.paymentId,
      };
    } catch (error) {
      console.error('Error processing payment request for registered user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payment request',
      };
    }
  }

  /**
   * Processes payment request fulfillment with automatic user creation
   */
  async fulfillPaymentRequest(transferData: PaymentRequestTransferData): Promise<TransferResult> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: transferData.senderData.email }
      });

      let senderId: string;

      if (existingUser) {
        senderId = existingUser.id;
      } else {
        // Create new user account
        const newUser = await this.prisma.user.create({
          data: {
            email: transferData.senderData.email,
            firstName: transferData.senderData.firstName,
            lastName: transferData.senderData.lastName,
            phone: transferData.senderData.phone,
            country: transferData.senderData.country,
            currency: transferData.senderData.currency,
            kycStatus: 'PENDING',
          },
        });
        senderId = newUser.id;
      }

      // Get location for processor selection
      const location = await this.paymentProcessorService.analyzeUserLocation(senderId);
      
      // Select optimal payment processor if not specified
      let processorId = transferData.processorId;
      if (!processorId) {
        const availableProcessors = await this.paymentProcessorService.getAvailableProcessors(location);
        const selection = await this.paymentProcessorService.selectOptimalProcessor(
          availableProcessors,
          { prioritizeCost: true, prioritizeSpeed: false, prioritizeReliability: true }
        );
        processorId = selection.selectedProcessor.id;
      }

      // Process the payment request
      const paymentData = {
        senderId,
        processorId,
        settlementMethod: transferData.settlementMethod || 'circle',
        metadata: transferData.metadata || {},
      };

      const result = await this.paymentRequestService.processPaymentRequest(
        transferData.paymentRequestId,
        paymentData
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to process payment request');
      }

      return {
        success: true,
        transferId: result.paymentId,
        paymentId: result.paymentId,
        userId: !existingUser ? senderId : undefined,
      };
    } catch (error) {
      console.error('Error fulfilling payment request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fulfill payment request',
      };
    }
  }

  /**
   * Gets onboarding flow data by token
   */
  async getOnboardingFlowData(token: string): Promise<OnboardingFlowData | null> {
    const data = this.onboardingTokens.get(token);
    
    if (!data) {
      return null;
    }

    if (new Date() > data.expiresAt) {
      this.onboardingTokens.delete(token);
      return null;
    }

    return data;
  }

  /**
   * Validates if a payment request can be processed by an unregistered user
   */
  async validatePaymentRequestAccess(paymentRequestId: string): Promise<{
    valid: boolean;
    paymentRequest?: any;
    error?: string;
  }> {
    try {
      const paymentRequest = await this.paymentRequestService.getRequestStatus(paymentRequestId);
      
      if (!paymentRequest) {
        return { valid: false, error: 'Payment request not found' };
      }

      if (paymentRequest.status !== 'PENDING') {
        return { valid: false, error: 'Payment request is not available for payment' };
      }

      if (new Date() > paymentRequest.expiresAt) {
        return { valid: false, error: 'Payment request has expired' };
      }

      return { valid: true, paymentRequest };
    } catch (error) {
      console.error('Error validating payment request access:', error);
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Failed to validate payment request' 
      };
    }
  }

  /**
   * Gets transfer history for a user (both sent and received)
   */
  async getUserTransferHistory(userId: string): Promise<any[]> {
    try {
      const [sentPayments, receivedPayments] = await Promise.all([
        this.prisma.payment.findMany({
          where: { senderId: userId },
          include: {
            recipient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            paymentRequest: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.payment.findMany({
          where: { recipientId: userId },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            paymentRequest: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      // Combine and sort by creation date
      const allTransfers = [
        ...sentPayments.map(payment => ({ ...payment, type: 'sent' })),
        ...receivedPayments.map(payment => ({ ...payment, type: 'received' })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return allTransfers;
    } catch (error) {
      console.error('Error getting user transfer history:', error);
      throw new Error('Failed to get transfer history');
    }
  }

  /**
   * Cleanup expired onboarding tokens
   */
  private async cleanupExpiredOnboardingTokens(): Promise<void> {
    const now = new Date();
    const expiredTokens: string[] = [];

    for (const [token, data] of this.onboardingTokens.entries()) {
      if (now > data.expiresAt) {
        expiredTokens.push(token);
      }
    }

    expiredTokens.forEach(token => {
      this.onboardingTokens.delete(token);
    });

    if (expiredTokens.length > 0) {
      console.log(`Cleaned up ${expiredTokens.length} expired onboarding tokens`);
    }
  }

  /**
   * Start cleanup interval for expired onboarding tokens
   */
  private startOnboardingTokenCleanup(): void {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.cleanupExpiredOnboardingTokens();
    }, 5 * 60 * 1000);

    // Run initial cleanup
    this.cleanupExpiredOnboardingTokens();
  }

  /**
   * Cleanup resources
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    await this.paymentRequestService.disconnect();
  }
}