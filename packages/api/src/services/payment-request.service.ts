import { PrismaClient } from '@prisma/client';
import * as QRCode from 'qrcode';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { ComplianceService } from './compliance.service';
import { FraudDetectionService } from './fraud-detection.service';
import { AuditService } from './audit.service';

export interface PaymentRequestData {
  requesterId: string;
  amount: number;
  currency: string;
  description?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface QRCodeData {
  qrCodeDataUrl: string;
  shareableLink: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export interface RequestStatus {
  id: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  amount: number;
  currency: string;
  description?: string;
  createdAt: Date;
  expiresAt: Date;
  paidAt?: Date;
  paymentId?: string;
}

export class PaymentRequestService {
  private prisma: PrismaClient;
  private jwtSecret: string;
  private baseUrl: string;
  private complianceService: ComplianceService;
  private fraudDetectionService: FraudDetectionService;
  private auditService: AuditService;

  constructor() {
    this.prisma = new PrismaClient();
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.complianceService = new ComplianceService();
    this.fraudDetectionService = new FraudDetectionService();
    this.auditService = new AuditService();
    
    // Start cleanup interval for expired requests
    this.startCleanupInterval();
  }

  /**
   * Creates a new payment request with compliance and fraud checks
   */
  async createPaymentRequest(requestData: PaymentRequestData, req?: any): Promise<any> {
    try {
      console.log(`🔍 Creating payment request for user ${requestData.requesterId}`);

      // Get user information for compliance checks
      const user = await this.prisma.user.findUnique({
        where: { id: requestData.requesterId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Perform fraud detection check
      const fraudCheck = await this.fraudDetectionService.detectFraud({
        userId: requestData.requesterId,
        transactionType: 'payment_request',
        amount: requestData.amount,
        currency: requestData.currency,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
        deviceFingerprint: req?.headers?.['x-device-fingerprint'],
        metadata: requestData.metadata,
      });

      // Log fraud detection result
      await this.auditService.logFraudDetection(
        requestData.requesterId,
        fraudCheck.riskScore,
        fraudCheck.riskLevel,
        fraudCheck.fraudulent,
        fraudCheck.flags,
        undefined,
        req
      );

      // Block if fraudulent
      if (fraudCheck.fraudulent) {
        throw new Error('Payment request blocked due to fraud detection');
      }

      // Perform compliance check
      const complianceCheck = await this.complianceService.performComplianceCheck({
        userId: requestData.requesterId,
        transactionAmount: requestData.amount,
        currency: requestData.currency,
        recipientCountry: user.country,
        senderCountry: user.country,
        transactionType: 'payment_request',
        metadata: requestData.metadata,
      });

      // Block if compliance check fails
      if (!complianceCheck.approved) {
        throw new Error(`Payment request blocked: ${complianceCheck.requirements.join(', ')}`);
      }

      // Set default expiration to 24 hours if not provided
      const expiresAt = requestData.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Generate unique shareable link token
      const linkToken = uuidv4();
      const shareableLink = `${this.baseUrl}/pay/${linkToken}`;

      const paymentRequest = await this.prisma.paymentRequest.create({
        data: {
          requesterId: requestData.requesterId,
          amount: requestData.amount,
          currency: requestData.currency,
          description: requestData.description,
          expiresAt,
          shareableLink,
          metadata: {
            ...requestData.metadata,
            complianceCheck: {
              riskScore: complianceCheck.riskScore,
              riskLevel: complianceCheck.riskLevel,
              approved: complianceCheck.approved,
            },
            fraudCheck: {
              riskScore: fraudCheck.riskScore,
              riskLevel: fraudCheck.riskLevel,
              flags: fraudCheck.flags,
            },
          },
        },
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Log payment request creation
      await this.auditService.logPaymentRequestCreation(
        requestData.requesterId,
        paymentRequest.id,
        requestData.amount,
        requestData.currency,
        req
      );

      console.log(`✅ Payment request created successfully: ${paymentRequest.id}`);
      return paymentRequest;
    } catch (error) {
      console.error('Error creating payment request:', error);
      
      // Log the error for audit purposes
      if (requestData.requesterId) {
        await this.auditService.logSecurityEvent(
          'PAYMENT_REQUEST_CREATION_FAILED',
          'MEDIUM',
          {
            userId: requestData.requesterId,
            amount: requestData.amount,
            currency: requestData.currency,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          requestData.requesterId,
          req
        );
      }

      throw error;
    }
  }

  /**
   * Generates QR code for a payment request
   */
  async generateQRCode(requestId: string): Promise<QRCodeData> {
    try {
      const paymentRequest = await this.prisma.paymentRequest.findUnique({
        where: { id: requestId },
      });

      if (!paymentRequest) {
        throw new Error('Payment request not found');
      }

      if (paymentRequest.status !== 'PENDING') {
        throw new Error('Payment request is not in pending status');
      }

      if (new Date() > paymentRequest.expiresAt) {
        throw new Error('Payment request has expired');
      }

      const shareableLink = paymentRequest.shareableLink!;
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(shareableLink, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 256,
      });

      // Update the payment request with QR code
      await this.prisma.paymentRequest.update({
        where: { id: requestId },
        data: { qrCode: qrCodeDataUrl },
      });

      return {
        qrCodeDataUrl,
        shareableLink,
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Re-throw the original error if it's one of our validation errors
      if (error instanceof Error && (
        error.message === 'Payment request not found' ||
        error.message === 'Payment request is not in pending status' ||
        error.message === 'Payment request has expired'
      )) {
        throw error;
      }
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generates a secure shareable link with JWT token
   */
  async generateShareableLink(requestId: string): Promise<string> {
    try {
      const paymentRequest = await this.prisma.paymentRequest.findUnique({
        where: { id: requestId },
      });

      if (!paymentRequest) {
        throw new Error('Payment request not found');
      }

      if (paymentRequest.status !== 'PENDING') {
        throw new Error('Payment request is not in pending status');
      }

      if (new Date() > paymentRequest.expiresAt) {
        throw new Error('Payment request has expired');
      }

      // Create JWT token with payment request info
      const token = jwt.sign(
        {
          requestId,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          expiresAt: paymentRequest.expiresAt.toISOString(),
        },
        this.jwtSecret,
        { expiresIn: '24h' }
      );

      const secureLink = `${this.baseUrl}/pay/secure/${token}`;
      
      return secureLink;
    } catch (error) {
      console.error('Error generating shareable link:', error);
      // Re-throw the original error if it's one of our validation errors
      if (error instanceof Error && (
        error.message === 'Payment request not found' ||
        error.message === 'Payment request is not in pending status' ||
        error.message === 'Payment request has expired'
      )) {
        throw error;
      }
      throw new Error('Failed to generate shareable link');
    }
  }

  /**
   * Processes a payment request with compliance and fraud checks
   */
  async processPaymentRequest(requestId: string, paymentData: any, req?: any): Promise<PaymentResult> {
    try {
      console.log(`🔍 Processing payment request ${requestId} from user ${paymentData.senderId}`);

      const paymentRequest = await this.prisma.paymentRequest.findUnique({
        where: { id: requestId },
        include: {
          requester: true,
        },
      });

      if (!paymentRequest) {
        return { success: false, error: 'Payment request not found' };
      }

      if (paymentRequest.status !== 'PENDING') {
        return { success: false, error: 'Payment request is not in pending status' };
      }

      if (new Date() > paymentRequest.expiresAt) {
        return { success: false, error: 'Payment request has expired' };
      }

      // Get sender information
      const sender = await this.prisma.user.findUnique({
        where: { id: paymentData.senderId },
      });

      if (!sender) {
        return { success: false, error: 'Sender not found' };
      }

      // Check if sender is blocked by fraud detection
      if (this.fraudDetectionService.isUserBlocked(paymentData.senderId)) {
        await this.auditService.logSecurityEvent(
          'BLOCKED_USER_PAYMENT_ATTEMPT',
          'HIGH',
          {
            senderId: paymentData.senderId,
            paymentRequestId: requestId,
            amount: paymentRequest.amount,
          },
          paymentData.senderId,
          req
        );
        return { success: false, error: 'User is temporarily blocked from making payments' };
      }

      // Perform fraud detection check for payment fulfillment
      const fraudCheck = await this.fraudDetectionService.detectFraud({
        userId: paymentData.senderId,
        transactionType: 'payment_request',
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        recipientId: paymentRequest.requesterId,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
        deviceFingerprint: req?.headers?.['x-device-fingerprint'],
        metadata: paymentData.metadata,
      });

      // Log fraud detection result
      await this.auditService.logFraudDetection(
        paymentData.senderId,
        fraudCheck.riskScore,
        fraudCheck.riskLevel,
        fraudCheck.fraudulent,
        fraudCheck.flags,
        undefined,
        req
      );

      // Block if fraudulent
      if (fraudCheck.fraudulent) {
        return { success: false, error: 'Payment blocked due to fraud detection' };
      }

      // Perform compliance check for cross-border transfer
      const complianceCheck = await this.complianceService.performComplianceCheck({
        userId: paymentData.senderId,
        transactionAmount: paymentRequest.amount,
        currency: paymentRequest.currency,
        recipientCountry: paymentRequest.requester.country,
        senderCountry: sender.country,
        transactionType: 'payment_request',
        metadata: paymentData.metadata,
      });

      // Block if compliance check fails
      if (!complianceCheck.approved) {
        return { 
          success: false, 
          error: `Payment blocked: ${complianceCheck.requirements.join(', ')}` 
        };
      }

      // Create payment record with compliance and fraud metadata
      const payment = await this.prisma.payment.create({
        data: {
          senderId: paymentData.senderId,
          recipientId: paymentRequest.requesterId,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          processorId: paymentData.processorId || 'default',
          settlementMethod: paymentData.settlementMethod || 'circle',
          status: 'PROCESSING',
          metadata: {
            ...paymentData.metadata,
            complianceCheck: {
              riskScore: complianceCheck.riskScore,
              riskLevel: complianceCheck.riskLevel,
              approved: complianceCheck.approved,
              flags: complianceCheck.flags,
            },
            fraudCheck: {
              riskScore: fraudCheck.riskScore,
              riskLevel: fraudCheck.riskLevel,
              flags: fraudCheck.flags,
            },
            paymentRequestId: requestId,
          },
        },
      });

      // Update payment request status
      await this.prisma.paymentRequest.update({
        where: { id: requestId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentId: payment.id,
        },
      });

      // Log payment request fulfillment
      await this.auditService.logPaymentRequestFulfillment(
        paymentData.senderId,
        paymentRequest.requesterId,
        requestId,
        payment.id,
        paymentRequest.amount,
        paymentRequest.currency,
        paymentData.processorId || 'default',
        req
      );

      console.log(`✅ Payment request processed successfully: ${payment.id}`);
      return { success: true, paymentId: payment.id };
    } catch (error) {
      console.error('Error processing payment request:', error);
      
      // Log the error for audit purposes
      await this.auditService.logSecurityEvent(
        'PAYMENT_REQUEST_PROCESSING_FAILED',
        'HIGH',
        {
          paymentRequestId: requestId,
          senderId: paymentData.senderId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        paymentData.senderId,
        req
      );

      return { success: false, error: 'Failed to process payment request' };
    }
  }

  /**
   * Gets the status of a payment request
   */
  async getRequestStatus(requestId: string): Promise<RequestStatus | null> {
    try {
      const paymentRequest = await this.prisma.paymentRequest.findUnique({
        where: { id: requestId },
        include: {
          payment: true,
        },
      });

      if (!paymentRequest) {
        return null;
      }

      return {
        id: paymentRequest.id,
        status: paymentRequest.status as 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED',
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        description: paymentRequest.description || undefined,
        createdAt: paymentRequest.createdAt,
        expiresAt: paymentRequest.expiresAt,
        paidAt: paymentRequest.paidAt || undefined,
        paymentId: paymentRequest.paymentId || undefined,
      };
    } catch (error) {
      console.error('Error getting request status:', error);
      throw new Error('Failed to get request status');
    }
  }

  /**
   * Validates a JWT token from shareable link
   */
  async validateShareableToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      // Check if the payment request still exists and is valid
      const paymentRequest = await this.prisma.paymentRequest.findUnique({
        where: { id: decoded.requestId },
      });

      if (!paymentRequest) {
        throw new Error('Payment request not found');
      }

      if (paymentRequest.status !== 'PENDING') {
        throw new Error('Payment request is not in pending status');
      }

      if (new Date() > paymentRequest.expiresAt) {
        throw new Error('Payment request has expired');
      }

      return {
        requestId: decoded.requestId,
        amount: decoded.amount,
        currency: decoded.currency,
        expiresAt: decoded.expiresAt,
        paymentRequest,
      };
    } catch (error) {
      console.error('Error validating shareable token:', error);
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Cancels a payment request
   */
  async cancelPaymentRequest(requestId: string, requesterId: string): Promise<boolean> {
    try {
      const paymentRequest = await this.prisma.paymentRequest.findUnique({
        where: { id: requestId },
      });

      if (!paymentRequest) {
        throw new Error('Payment request not found');
      }

      if (paymentRequest.requesterId !== requesterId) {
        throw new Error('Unauthorized to cancel this payment request');
      }

      if (paymentRequest.status !== 'PENDING') {
        throw new Error('Can only cancel pending payment requests');
      }

      await this.prisma.paymentRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' },
      });

      return true;
    } catch (error) {
      console.error('Error cancelling payment request:', error);
      // Re-throw the original error if it's one of our validation errors
      if (error instanceof Error && (
        error.message === 'Payment request not found' ||
        error.message === 'Unauthorized to cancel this payment request' ||
        error.message === 'Can only cancel pending payment requests'
      )) {
        throw error;
      }
      throw new Error('Failed to cancel payment request');
    }
  }

  /**
   * Gets payment requests for a user
   */
  async getUserPaymentRequests(userId: string, status?: string): Promise<any[]> {
    try {
      const where: any = { requesterId: userId };
      if (status) {
        where.status = status;
      }

      const paymentRequests = await this.prisma.paymentRequest.findMany({
        where,
        include: {
          payment: {
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return paymentRequests;
    } catch (error) {
      console.error('Error getting user payment requests:', error);
      throw new Error('Failed to get payment requests');
    }
  }

  /**
   * Cleanup expired payment requests
   */
  private async cleanupExpiredRequests(): Promise<void> {
    try {
      const now = new Date();
      
      const expiredRequests = await this.prisma.paymentRequest.updateMany({
        where: {
          status: 'PENDING',
          expiresAt: {
            lt: now,
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      if (expiredRequests.count > 0) {
        console.log(`Marked ${expiredRequests.count} payment requests as expired`);
      }
    } catch (error) {
      console.error('Error cleaning up expired requests:', error);
    }
  }

  /**
   * Start cleanup interval for expired requests
   */
  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.cleanupExpiredRequests();
    }, 5 * 60 * 1000);

    // Run initial cleanup
    this.cleanupExpiredRequests();
  }

  /**
   * Cleanup resources
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}