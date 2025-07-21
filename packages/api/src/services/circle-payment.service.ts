import { CircleService } from './circle.service';

/**
 * Interface for card details used in payment processing
 */
export interface CardDetails {
  number: string;
  cvv: string;
  expiry: {
    month: string;
    year: string;
  };
  billingDetails: {
    name: string;
    city: string;
    country: string;
    line1: string;
    line2?: string;
    district?: string;
    postalCode: string;
  };
}

/**
 * Interface for payment creation request
 */
export interface CreatePaymentRequest {
  amount: number;
  currency: 'USD';
  cardDetails: CardDetails;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for payment response
 */
export interface PaymentResponse {
  id: string;
  status: 'pending' | 'confirmed' | 'failed';
  amount: number;
  currency: string;
  description?: string;
  fees?: number;
  createDate: string;
  updateDate: string;
  merchantId?: string;
  merchantWalletId?: string;
  source?: {
    id: string;
    type: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Circle Payment Service for handling card payments and USDC conversion
 * Implements secure payment processing using Circle's Payments API
 */
export class CirclePaymentService extends CircleService {
  
  /**
   * Create a payment from card to USDC
   * Converts USD from card to USDC in merchant wallet
   */
  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    try {
      this.validateCardDetails(request.cardDetails);
      
      const idempotencyKey = this.generateIdempotencyKey('payment');
      
      // Simplified API call structure for testing
      const paymentRequest = {
        idempotencyKey,
        amount: {
          amount: request.amount.toString(),
          currency: request.currency
        },
        source: {
          type: 'card' as const,
          card: {
            number: request.cardDetails.number,
            cvv: request.cardDetails.cvv,
            expMonth: parseInt(request.cardDetails.expiry.month),
            expYear: parseInt(request.cardDetails.expiry.year)
          },
          billingDetails: request.cardDetails.billingDetails
        },
        verification: 'cvv' as const,
        description: request.description || 'International transfer payment',
        metadata: request.metadata || {}
      };

      // Mock API call - in real implementation this would call Circle API
      const response = await this.mockCreatePayment(paymentRequest);
      
      if (!response.data) {
        throw new Error('No payment data received from Circle API');
      }

      return this.formatPaymentResponse(response.data);
    } catch (error) {
      this.handleCircleError(error, 'payment creation');
    }
  }

  /**
   * Get payment status by payment ID
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    try {
      // Mock API call - in real implementation this would call Circle API
      const response = await this.mockGetPayment(paymentId);
      
      if (!response.data) {
        throw new Error(`Payment ${paymentId} not found`);
      }

      return this.formatPaymentResponse(response.data);
    } catch (error) {
      this.handleCircleError(error, 'payment status retrieval');
    }
  }

  /**
   * Check if a payment is confirmed and ready for transfer
   */
  async isPaymentConfirmed(paymentId: string): Promise<boolean> {
    const payment = await this.getPaymentStatus(paymentId);
    return payment.status === 'confirmed';
  }

  /**
   * Wait for payment confirmation with timeout
   * Polls payment status until confirmed or timeout
   */
  async waitForPaymentConfirmation(
    paymentId: string, 
    timeoutMs: number = 300000, // 5 minutes default
    pollIntervalMs: number = 5000 // 5 seconds default
  ): Promise<PaymentResponse> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const payment = await this.getPaymentStatus(paymentId);
      
      if (payment.status === 'confirmed') {
        return payment;
      }
      
      if (payment.status === 'failed') {
        throw new Error(`Payment ${paymentId} failed`);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    
    throw new Error(`Payment ${paymentId} confirmation timeout after ${timeoutMs}ms`);
  }

  /**
   * Validate card details before processing
   */
  public validateCardDetails(cardDetails: CardDetails): void {
    if (!cardDetails.number || cardDetails.number.length < 13) {
      throw new Error('Invalid card number');
    }
    
    if (!cardDetails.cvv || cardDetails.cvv.length < 3) {
      throw new Error('Invalid CVV');
    }
    
    const month = parseInt(cardDetails.expiry.month);
    const year = parseInt(cardDetails.expiry.year);
    
    if (month < 1 || month > 12) {
      throw new Error('Invalid expiry month');
    }
    
    if (year < new Date().getFullYear()) {
      throw new Error('Card has expired');
    }
    
    if (!cardDetails.billingDetails.name) {
      throw new Error('Billing name is required');
    }
    
    if (!cardDetails.billingDetails.country) {
      throw new Error('Billing country is required');
    }
  }

  /**
   * Mock Circle API payment creation for testing
   * In production, this would be replaced with actual Circle SDK calls
   */
  private async mockCreatePayment(request: any): Promise<{ data: any }> {
    // Simulate API call
    return {
      data: {
        id: `payment-${Date.now()}`,
        status: 'pending',
        amount: request.amount,
        description: request.description,
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        metadata: request.metadata
      }
    };
  }

  /**
   * Mock Circle API payment retrieval for testing
   * In production, this would be replaced with actual Circle SDK calls
   */
  private async mockGetPayment(paymentId: string): Promise<{ data: any }> {
    // Simulate API call
    return {
      data: {
        id: paymentId,
        status: 'confirmed',
        amount: { amount: '100', currency: 'USD' },
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString()
      }
    };
  }

  /**
   * Format Circle API payment response to our interface
   */
  private formatPaymentResponse(circlePayment: any): PaymentResponse {
    return {
      id: circlePayment.id,
      status: this.mapCirclePaymentStatus(circlePayment.status),
      amount: parseFloat(circlePayment.amount?.amount || circlePayment.amount || '0'),
      currency: circlePayment.amount?.currency || 'USD',
      description: circlePayment.description,
      fees: circlePayment.fees ? parseFloat(circlePayment.fees.amount) : undefined,
      createDate: circlePayment.createDate,
      updateDate: circlePayment.updateDate,
      merchantId: circlePayment.merchantId,
      merchantWalletId: circlePayment.merchantWalletId,
      source: circlePayment.source ? {
        id: circlePayment.source.id,
        type: circlePayment.source.type
      } : undefined,
      metadata: circlePayment.metadata
    };
  }

  /**
   * Map Circle payment status to our standardized status
   */
  private mapCirclePaymentStatus(circleStatus: string): 'pending' | 'confirmed' | 'failed' {
    switch (circleStatus?.toLowerCase()) {
      case 'confirmed':
        return 'confirmed';
      case 'failed':
      case 'canceled':
        return 'failed';
      case 'pending':
      default:
        return 'pending';
    }
  }
}