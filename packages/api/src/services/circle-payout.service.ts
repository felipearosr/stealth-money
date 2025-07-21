import { CircleService } from './circle.service';

/**
 * Interface for bank account details
 */
export interface BankAccount {
  iban: string;
  bic: string;
  bankName: string;
  accountHolderName: string;
  country: string;
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
 * Interface for payout creation request
 */
export interface CreatePayoutRequest {
  amount: string;
  currency: 'EUR';
  sourceWalletId: string;
  bankAccount: BankAccount;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for payout response
 */
export interface PayoutResponse {
  id: string;
  sourceWalletId: string;
  destination: {
    type: string;
    iban?: string;
    accountHolderName?: string;
    bankName?: string;
  };
  amount: {
    amount: string;
    currency: string;
  };
  fees?: {
    amount: string;
    currency: string;
  };
  status: 'pending' | 'complete' | 'failed';
  trackingRef?: string;
  errorCode?: string;
  riskEvaluation?: {
    decision: string;
    reason?: string;
  };
  adjustments?: Array<{
    fxRate: string;
    fxAmount: string;
  }>;
  createDate: string;
  updateDate: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Circle Payout Service for EUR bank deposits
 * Handles USDC to EUR conversion and bank transfers
 */
export class CirclePayoutService extends CircleService {

  /**
   * Create a payout from wallet to EUR bank account
   */
  async createPayout(request: CreatePayoutRequest): Promise<PayoutResponse> {
    try {
      this.validatePayoutRequest(request);
      
      const idempotencyKey = this.generateIdempotencyKey('payout');
      
      const payoutRequest = {
        idempotencyKey,
        source: {
          type: 'wallet' as const,
          id: request.sourceWalletId
        },
        destination: {
          type: 'wire' as const,
          beneficiary: {
            name: request.bankAccount.accountHolderName,
            address1: request.bankAccount.address?.line1 || request.bankAccount.city || '',
            address2: request.bankAccount.address?.line2,
            city: request.bankAccount.address?.city || request.bankAccount.city || '',
            postalCode: request.bankAccount.address?.postalCode || '',
            country: request.bankAccount.country
          },
          beneficiaryBank: {
            name: request.bankAccount.bankName,
            swiftCode: request.bankAccount.bic,
            routingNumber: request.bankAccount.iban,
            accountNumber: request.bankAccount.iban,
            country: request.bankAccount.country
          }
        },
        amount: {
          amount: request.amount,
          currency: request.currency
        },
        description: request.description || 'International transfer payout',
        metadata: request.metadata || {}
      };

      // Mock API call - in real implementation this would call Circle API
      const response = await this.mockCreatePayout(payoutRequest);
      
      if (!response.data) {
        throw new Error('No payout data received from Circle API');
      }

      return this.formatPayoutResponse(response.data);
    } catch (error) {
      this.handleCircleError(error, 'payout creation');
    }
  }

  /**
   * Get payout status by payout ID
   */
  async getPayoutStatus(payoutId: string): Promise<PayoutResponse> {
    try {
      // Mock API call - in real implementation this would call Circle API
      const response = await this.mockGetPayout(payoutId);
      
      if (!response.data) {
        throw new Error(`Payout ${payoutId} not found`);
      }

      return this.formatPayoutResponse(response.data);
    } catch (error) {
      this.handleCircleError(error, 'payout status retrieval');
    }
  }

  /**
   * Check if a payout is complete
   */
  async isPayoutComplete(payoutId: string): Promise<boolean> {
    const payout = await this.getPayoutStatus(payoutId);
    return payout.status === 'complete';
  }

  /**
   * Wait for payout completion with timeout
   * Polls payout status until complete or timeout
   */
  async waitForPayoutCompletion(
    payoutId: string,
    timeoutMs: number = 1800000, // 30 minutes default (bank transfers take longer)
    pollIntervalMs: number = 30000 // 30 seconds default
  ): Promise<PayoutResponse> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const payout = await this.getPayoutStatus(payoutId);
      
      if (payout.status === 'complete') {
        return payout;
      }
      
      if (payout.status === 'failed') {
        throw new Error(`Payout ${payoutId} failed: ${payout.errorCode || 'Unknown error'}`);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    
    throw new Error(`Payout ${payoutId} completion timeout after ${timeoutMs}ms`);
  }

  /**
   * Get estimated payout time for EUR transfers
   */
  getEstimatedPayoutTime(): {
    min: number;
    max: number;
    unit: 'minutes' | 'hours' | 'days';
  } {
    // EUR SEPA transfers typically take 1-2 business days
    return {
      min: 1,
      max: 2,
      unit: 'days'
    };
  }

  /**
   * Validate IBAN format (basic validation)
   */
  public validateIBAN(iban: string): boolean {
    // Remove spaces and convert to uppercase
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    
    // Basic IBAN format check (length and structure)
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIban)) {
      return false;
    }
    
    // Length check for common European countries
    const countryLengths: Record<string, number> = {
      'DE': 22, // Germany
      'FR': 27, // France
      'ES': 24, // Spain
      'IT': 27, // Italy
      'NL': 18, // Netherlands
      'BE': 16, // Belgium
      'AT': 20, // Austria
      'CH': 21, // Switzerland
      'GB': 22, // United Kingdom
    };
    
    const countryCode = cleanIban.substring(0, 2);
    const expectedLength = countryLengths[countryCode];
    
    if (expectedLength && cleanIban.length !== expectedLength) {
      return false;
    }
    
    return true;
  }

  /**
   * Validate BIC/SWIFT code format
   */
  public validateBIC(bic: string): boolean {
    // BIC format: 4 letters (bank code) + 2 letters (country) + 2 alphanumeric (location) + optional 3 alphanumeric (branch)
    const bicRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
    return bicRegex.test(bic.toUpperCase());
  }

  /**
   * Mock Circle API payout creation for testing
   */
  private async mockCreatePayout(request: any): Promise<{ data: any }> {
    return {
      data: {
        id: `payout-${Date.now()}`,
        sourceWalletId: request.source.id,
        destination: request.destination,
        amount: request.amount,
        status: 'pending',
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        metadata: request.metadata
      }
    };
  }

  /**
   * Mock Circle API payout retrieval for testing
   */
  private async mockGetPayout(payoutId: string): Promise<{ data: any }> {
    return {
      data: {
        id: payoutId,
        status: 'complete',
        amount: { amount: '100', currency: 'EUR' },
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString()
      }
    };
  }

  /**
   * Format Circle API payout response to our interface
   */
  private formatPayoutResponse(circlePayout: any): PayoutResponse {
    return {
      id: circlePayout.id,
      sourceWalletId: circlePayout.sourceWalletId,
      destination: {
        type: circlePayout.destination?.type || 'wire',
        iban: circlePayout.destination?.beneficiaryBank?.accountNumber,
        accountHolderName: circlePayout.destination?.beneficiary?.name,
        bankName: circlePayout.destination?.beneficiaryBank?.name
      },
      amount: {
        amount: circlePayout.amount?.amount || '0',
        currency: circlePayout.amount?.currency || 'EUR'
      },
      fees: circlePayout.fees ? {
        amount: circlePayout.fees.amount,
        currency: circlePayout.fees.currency
      } : undefined,
      status: this.mapCirclePayoutStatus(circlePayout.status),
      trackingRef: circlePayout.trackingRef,
      errorCode: circlePayout.errorCode,
      riskEvaluation: circlePayout.riskEvaluation ? {
        decision: circlePayout.riskEvaluation.decision,
        reason: circlePayout.riskEvaluation.reason
      } : undefined,
      adjustments: circlePayout.adjustments,
      createDate: circlePayout.createDate,
      updateDate: circlePayout.updateDate,
      description: circlePayout.description,
      metadata: circlePayout.metadata
    };
  }

  /**
   * Map Circle payout status to our standardized status
   */
  private mapCirclePayoutStatus(circleStatus: string): 'pending' | 'complete' | 'failed' {
    switch (circleStatus?.toLowerCase()) {
      case 'complete':
        return 'complete';
      case 'failed':
      case 'cancelled':
        return 'failed';
      case 'pending':
      case 'confirmed':
      default:
        return 'pending';
    }
  }

  /**
   * Validate payout request
   */
  private validatePayoutRequest(request: CreatePayoutRequest): void {
    if (!request.sourceWalletId) {
      throw new Error('Source wallet ID is required');
    }
    
    const amount = parseFloat(request.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Payout amount must be a positive number');
    }
    
    if (request.currency !== 'EUR') {
      throw new Error('Only EUR payouts are currently supported');
    }
    
    if (!request.bankAccount) {
      throw new Error('Bank account details are required');
    }
    
    this.validateBankAccount(request.bankAccount);
  }

  /**
   * Validate bank account details
   */
  private validateBankAccount(bankAccount: BankAccount): void {
    if (!bankAccount.accountHolderName) {
      throw new Error('Account holder name is required');
    }
    
    if (!bankAccount.iban) {
      throw new Error('IBAN is required');
    }
    
    if (!this.validateIBAN(bankAccount.iban)) {
      throw new Error('Invalid IBAN format');
    }
    
    if (!bankAccount.bic) {
      throw new Error('BIC/SWIFT code is required');
    }
    
    if (!this.validateBIC(bankAccount.bic)) {
      throw new Error('Invalid BIC/SWIFT code format');
    }
    
    if (!bankAccount.bankName) {
      throw new Error('Bank name is required');
    }
    
    if (!bankAccount.country) {
      throw new Error('Bank country is required');
    }
    
    // Validate country is in supported list (EU countries for EUR transfers)
    const supportedCountries = [
      'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'CH', 'GB', 'IE', 'PT', 'FI', 'SE', 'DK', 'NO'
    ];
    
    if (!supportedCountries.includes(bankAccount.country.toUpperCase())) {
      throw new Error(`EUR payouts to ${bankAccount.country} are not currently supported`);
    }
  }
}