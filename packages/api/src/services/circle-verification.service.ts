import { CircleService } from './circle.service';
import { CircleRetryHandler } from '../utils/circle-error-handler';

/**
 * Interface for bank account verification details
 */
export interface VerificationBankAccount {
  id: string;
  accountNumber: string;
  routingNumber?: string; // For US ACH
  country: string;
  currency: string;
  accountHolderName: string;
  bankName: string;
  // Additional fields for international
  iban?: string;
  bic?: string;
  rut?: string; // For Chilean accounts
  clabe?: string; // For Mexican accounts
  sortCode?: string; // For UK accounts
}

/**
 * Interface for micro-deposit request
 */
export interface CreateMicroDepositRequest {
  bankAccount: VerificationBankAccount;
  amount1: number; // Amount in cents (e.g., 12 for $0.12)
  amount2: number; // Amount in cents (e.g., 34 for $0.34)
  sourceWalletId: string; // Company verification wallet
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for micro-deposit response
 */
export interface MicroDepositResponse {
  id: string;
  bankAccountId: string;
  payoutId1: string;
  payoutId2: string;
  amount1: {
    amount: string;
    currency: string;
  };
  amount2: {
    amount: string;
    currency: string;
  };
  status: 'pending' | 'sent' | 'failed' | 'expired';
  estimatedArrival?: {
    min: number;
    max: number;
    unit: 'hours' | 'days';
  };
  createDate: string;
  expiresAt: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for company verification wallet
 */
export interface VerificationWallet {
  walletId: string;
  balance: {
    amount: string;
    currency: string;
  };
  minimumBalance: string;
}

/**
 * Circle Verification Service for micro-deposit bank account verification
 * Handles sending small amounts to bank accounts for verification purposes
 */
export class CircleVerificationService extends CircleService {
  
  // Company verification wallet (should be configured via environment)
  private readonly VERIFICATION_WALLET_ID = process.env.CIRCLE_VERIFICATION_WALLET_ID || 'verification-wallet-id';
  private readonly MINIMUM_BALANCE_USD = '100.00'; // Minimum $100 USD in verification wallet
  private readonly MICRO_DEPOSIT_EXPIRY_DAYS = 7; // 7 days to verify

  /**
   * Send micro-deposits to a bank account for verification
   */
  async sendMicroDeposits(request: CreateMicroDepositRequest): Promise<MicroDepositResponse> {
    return CircleRetryHandler.withRetry(
      async () => {
        try {
          this.validateMicroDepositRequest(request);
          
          // Check verification wallet balance first
          await this.ensureSufficientBalance(request.amount1 + request.amount2);
          
          // Determine transfer method based on bank account location
          const transferMethod = this.getTransferMethod(request.bankAccount);
          
          // Send the two micro-deposits
          const payout1 = await this.sendMicroDeposit(
            request,
            request.amount1,
            `Verification deposit 1 - ${request.description || 'Bank account verification'}`
          );
          
          const payout2 = await this.sendMicroDeposit(
            request,
            request.amount2,
            `Verification deposit 2 - ${request.description || 'Bank account verification'}`
          );

          // Create verification record
          const verificationId = this.generateIdempotencyKey('verification');
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + this.MICRO_DEPOSIT_EXPIRY_DAYS);

          return {
            id: verificationId,
            bankAccountId: request.bankAccount.id,
            payoutId1: payout1.id,
            payoutId2: payout2.id,
            amount1: {
              amount: this.formatAmountFromCents(request.amount1),
              currency: this.getCurrencyForCountry(request.bankAccount.country)
            },
            amount2: {
              amount: this.formatAmountFromCents(request.amount2),
              currency: this.getCurrencyForCountry(request.bankAccount.country)
            },
            status: 'pending',
            estimatedArrival: this.getEstimatedArrival(request.bankAccount.country),
            createDate: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            metadata: {
              ...request.metadata,
              transferMethod,
              bankAccountId: request.bankAccount.id
            }
          };

        } catch (error) {
          this.handleCircleError(error, 'micro-deposit creation');
        }
      },
      'micro-deposit creation',
      3,
      2000,
      10000
    );
  }

  /**
   * Check the status of micro-deposits
   */
  async getMicroDepositStatus(verificationId: string): Promise<MicroDepositResponse> {
    try {
      // In a real implementation, this would fetch from database/Circle API
      // For now, we'll use the mock implementation
      const response = await this.mockGetMicroDepositStatus(verificationId);
      return response;
    } catch (error) {
      this.handleCircleError(error, 'micro-deposit status retrieval');
    }
  }

  /**
   * Get verification wallet balance
   */
  async getVerificationWalletBalance(): Promise<VerificationWallet> {
    try {
      // Mock API call - in real implementation this would call Circle API
      const response = await this.mockGetWalletBalance(this.VERIFICATION_WALLET_ID);
      
      return {
        walletId: this.VERIFICATION_WALLET_ID,
        balance: {
          amount: response.available[0]?.amount || '0',
          currency: response.available[0]?.currency || 'USD'
        },
        minimumBalance: this.MINIMUM_BALANCE_USD
      };
    } catch (error) {
      this.handleCircleError(error, 'verification wallet balance retrieval');
    }
  }

  /**
   * Ensure verification wallet has sufficient balance
   */
  private async ensureSufficientBalance(totalAmountCents: number): Promise<void> {
    const wallet = await this.getVerificationWalletBalance();
    const currentBalance = parseFloat(wallet.balance.amount);
    const requiredAmount = totalAmountCents / 100; // Convert cents to dollars
    const minimumBalance = parseFloat(this.MINIMUM_BALANCE_USD);

    if (currentBalance < requiredAmount + minimumBalance) {
      throw new Error(
        `Insufficient verification wallet balance. Current: $${currentBalance}, ` +
        `Required: $${requiredAmount + minimumBalance} (including $${minimumBalance} minimum reserve)`
      );
    }
  }

  /**
   * Send a single micro-deposit
   */
  private async sendMicroDeposit(
    request: CreateMicroDepositRequest,
    amountCents: number,
    description: string
  ): Promise<{ id: string; status: string }> {
    
    const amountUSD = this.formatAmountFromCents(amountCents);
    const idempotencyKey = this.generateIdempotencyKey('micro-deposit');

    // Determine the appropriate Circle API method based on destination
    if (request.bankAccount.country === 'US') {
      // US ACH transfer
      return await this.sendUSACHTransfer({
        idempotencyKey,
        sourceWalletId: request.sourceWalletId,
        amount: amountUSD,
        routingNumber: request.bankAccount.routingNumber!,
        accountNumber: request.bankAccount.accountNumber,
        accountHolderName: request.bankAccount.accountHolderName,
        description
      });
    } else {
      // International wire transfer
      return await this.sendInternationalTransfer({
        idempotencyKey,
        sourceWalletId: request.sourceWalletId,
        amount: amountUSD,
        bankAccount: request.bankAccount,
        description
      });
    }
  }

  /**
   * Send US ACH transfer for micro-deposit
   */
  private async sendUSACHTransfer(request: {
    idempotencyKey: string;
    sourceWalletId: string;
    amount: string;
    routingNumber: string;
    accountNumber: string;
    accountHolderName: string;
    description: string;
  }): Promise<{ id: string; status: string }> {
    
    // Mock API call - in real implementation this would call Circle's ACH API
    const achRequest = {
      idempotencyKey: request.idempotencyKey,
      source: {
        type: 'wallet' as const,
        id: request.sourceWalletId
      },
      destination: {
        type: 'ach' as const,
        accountNumber: request.accountNumber,
        routingNumber: request.routingNumber,
        accountHolderName: request.accountHolderName,
        accountType: 'checking' as const, // Default to checking for verification
      },
      amount: {
        amount: request.amount,
        currency: 'USD'
      },
      description: request.description
    };

    const response = await this.mockCreateACHPayout(achRequest);
    
    if (!response.data) {
      throw new Error('No ACH payout data received from Circle API');
    }

    return {
      id: response.data.id,
      status: response.data.status
    };
  }

  /**
   * Send international transfer for micro-deposit
   */
  private async sendInternationalTransfer(request: {
    idempotencyKey: string;
    sourceWalletId: string;
    amount: string;
    bankAccount: VerificationBankAccount;
    description: string;
  }): Promise<{ id: string; status: string }> {
    
    // Convert USD to local currency if needed
    const localCurrency = this.getCurrencyForCountry(request.bankAccount.country);
    const localAmount = await this.convertUSDToLocalCurrency(request.amount, localCurrency);

    // Mock API call - in real implementation this would call Circle's international transfer API
    const wireRequest = {
      idempotencyKey: request.idempotencyKey,
      source: {
        type: 'wallet' as const,
        id: request.sourceWalletId
      },
      destination: this.buildInternationalDestination(request.bankAccount),
      amount: {
        amount: localAmount,
        currency: localCurrency
      },
      description: request.description
    };

    const response = await this.mockCreateInternationalPayout(wireRequest);
    
    if (!response.data) {
      throw new Error('No international payout data received from Circle API');
    }

    return {
      id: response.data.id,
      status: response.data.status
    };
  }

  /**
   * Build destination object for international transfers
   */
  private buildInternationalDestination(bankAccount: VerificationBankAccount): any {
    switch (bankAccount.country) {
      case 'CL': // Chile
        return {
          type: 'wire' as const,
          beneficiary: {
            name: bankAccount.accountHolderName,
            address1: 'Santiago, Chile', // Default address
            country: 'CL'
          },
          beneficiaryBank: {
            name: bankAccount.bankName,
            accountNumber: bankAccount.accountNumber,
            routingNumber: bankAccount.rut, // Use RUT as identifier
            country: 'CL'
          }
        };
      
      case 'MX': // Mexico
        return {
          type: 'wire' as const,
          beneficiary: {
            name: bankAccount.accountHolderName,
            address1: 'Mexico City, Mexico',
            country: 'MX'
          },
          beneficiaryBank: {
            name: bankAccount.bankName,
            accountNumber: bankAccount.clabe,
            country: 'MX'
          }
        };

      default: // European countries (SEPA)
        return {
          type: 'wire' as const,
          beneficiary: {
            name: bankAccount.accountHolderName,
            address1: 'Europe', // Default
            country: bankAccount.country
          },
          beneficiaryBank: {
            name: bankAccount.bankName,
            swiftCode: bankAccount.bic,
            accountNumber: bankAccount.iban,
            country: bankAccount.country
          }
        };
    }
  }

  /**
   * Get estimated arrival time for micro-deposits
   */
  private getEstimatedArrival(country: string): { min: number; max: number; unit: 'hours' | 'days' } {
    switch (country) {
      case 'US':
        return { min: 1, max: 3, unit: 'days' }; // ACH typically 1-3 business days
      case 'CL':
      case 'MX':
        return { min: 2, max: 5, unit: 'days' }; // International wire 2-5 days
      default:
        return { min: 1, max: 2, unit: 'days' }; // SEPA transfers 1-2 days
    }
  }

  /**
   * Get transfer method based on bank account location
   */
  private getTransferMethod(bankAccount: VerificationBankAccount): string {
    switch (bankAccount.country) {
      case 'US':
        return 'ACH';
      case 'CL':
      case 'MX':
        return 'International Wire';
      default:
        return 'SEPA Transfer';
    }
  }

  /**
   * Get appropriate currency for country
   */
  private getCurrencyForCountry(country: string): string {
    const currencyMap: Record<string, string> = {
      'US': 'USD',
      'CL': 'CLP',
      'MX': 'MXN',
      'GB': 'GBP',
      'EU': 'EUR',
      'DE': 'EUR',
      'FR': 'EUR',
      'ES': 'EUR',
      'IT': 'EUR',
      'NL': 'EUR'
    };
    return currencyMap[country] || 'USD';
  }

  /**
   * Convert USD amount to local currency (mock implementation)
   */
  private async convertUSDToLocalCurrency(usdAmount: string, currency: string): Promise<string> {
    // Mock exchange rates - in real implementation, use Circle's FX API or external rate service
    const exchangeRates: Record<string, number> = {
      'USD': 1.0,
      'CLP': 800, // Approximate rate
      'MXN': 18,
      'EUR': 0.85,
      'GBP': 0.75
    };

    const rate = exchangeRates[currency] || 1.0;
    const convertedAmount = parseFloat(usdAmount) * rate;
    return convertedAmount.toFixed(2);
  }

  /**
   * Format amount from cents to dollar string
   */
  private formatAmountFromCents(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  /**
   * Validate micro-deposit request
   */
  private validateMicroDepositRequest(request: CreateMicroDepositRequest): void {
    if (!request.bankAccount) {
      throw new Error('Bank account is required');
    }

    if (!request.bankAccount.id) {
      throw new Error('Bank account ID is required');
    }

    if (!request.bankAccount.accountNumber) {
      throw new Error('Account number is required');
    }

    if (!request.bankAccount.accountHolderName) {
      throw new Error('Account holder name is required');
    }

    if (!request.bankAccount.country) {
      throw new Error('Bank account country is required');
    }

    // Validate US-specific fields
    if (request.bankAccount.country === 'US' && !request.bankAccount.routingNumber) {
      throw new Error('Routing number is required for US bank accounts');
    }

    // Validate Chilean-specific fields
    if (request.bankAccount.country === 'CL' && !request.bankAccount.rut) {
      throw new Error('RUT is required for Chilean bank accounts');
    }

    // Validate amounts
    if (!request.amount1 || request.amount1 < 1 || request.amount1 > 99) {
      throw new Error('Amount 1 must be between 1 and 99 cents');
    }

    if (!request.amount2 || request.amount2 < 1 || request.amount2 > 99) {
      throw new Error('Amount 2 must be between 1 and 99 cents');
    }

    if (request.amount1 === request.amount2) {
      throw new Error('The two micro-deposit amounts must be different');
    }

    if (!request.sourceWalletId) {
      throw new Error('Source wallet ID is required');
    }
  }

  // Mock implementations for testing (replace with real Circle API calls)

  private async mockCreateACHPayout(request: any): Promise<{ data: any }> {
    return {
      data: {
        id: `ach-payout-${Date.now()}`,
        status: 'pending',
        amount: request.amount,
        destination: request.destination,
        createDate: new Date().toISOString()
      }
    };
  }

  private async mockCreateInternationalPayout(request: any): Promise<{ data: any }> {
    return {
      data: {
        id: `intl-payout-${Date.now()}`,
        status: 'pending',
        amount: request.amount,
        destination: request.destination,
        createDate: new Date().toISOString()
      }
    };
  }

  private async mockGetWalletBalance(walletId: string): Promise<{ available: Array<{ amount: string; currency: string }> }> {
    return {
      available: [
        { amount: '500.00', currency: 'USD' } // Mock $500 balance
      ]
    };
  }

  private async mockGetMicroDepositStatus(verificationId: string): Promise<MicroDepositResponse> {
    return {
      id: verificationId,
      bankAccountId: 'mock-bank-account-id',
      payoutId1: `payout-1-${Date.now()}`,
      payoutId2: `payout-2-${Date.now()}`,
      amount1: { amount: '0.12', currency: 'USD' },
      amount2: { amount: '0.34', currency: 'USD' },
      status: 'sent',
      estimatedArrival: { min: 1, max: 3, unit: 'days' },
      createDate: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }
}