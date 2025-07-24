import { logger } from '../middleware/logging.middleware';

/**
 * Bank account for verification
 */
export interface VerificationBankAccount {
  id: string;
  accountNumber: string;
  routingNumber?: string; // US/Canada
  country: string;
  currency: string;
  accountHolderName: string;
  bankName: string;
  // International fields
  iban?: string;
  bic?: string;
  rut?: string; // Chile
  bankCode?: string; // Chilean bank code
  chileanAccountNumber?: string; // Chilean account number
  clabe?: string; // Mexico
  sortCode?: string; // UK
}

/**
 * Verification request
 */
export interface VerificationRequest {
  bankAccount: VerificationBankAccount;
  userId: string;
  metadata?: Record<string, any>;
}

/**
 * Verification response
 */
export interface VerificationResponse {
  id: string;
  method: 'plaid' | 'nordigen' | 'belvo' | 'microdeposit' | 'open_banking';
  status: 'pending' | 'verified' | 'failed';
  provider: string;
  cost: number; // Cost in USD
  estimatedTime: {
    min: number;
    max: number;
    unit: 'seconds' | 'minutes' | 'hours' | 'days';
  };
  instructions?: string;
  redirectUrl?: string; // For OAuth flows
  expiresAt?: string;
  metadata?: Record<string, any>;
}

/**
 * Provider configuration
 */
interface VerificationProvider {
  name: string;
  supportedCountries: string[];
  cost: number; // USD per verification
  estimatedTime: { min: number; max: number; unit: string };
  method: 'oauth' | 'microdeposit' | 'api';
  priority: number; // Lower = higher priority
  enabled: boolean;
}

/**
 * Hybrid Bank Account Verification Service
 * Routes verification requests to the most cost-effective provider based on country
 */
export class HybridVerificationService {
  
  private providers: Record<string, VerificationProvider> = {
    // Europe - FREE with Nordigen
    nordigen: {
      name: 'Nordigen',
      supportedCountries: [
        'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 
        'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU', 
        'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB'
      ],
      cost: 0.00, // FREE!
      estimatedTime: { min: 10, max: 30, unit: 'seconds' },
      method: 'oauth',
      priority: 1, // Highest priority due to free cost
      enabled: true
    },

    // US/Canada - Plaid
    plaid: {
      name: 'Plaid',
      supportedCountries: ['US', 'CA'],
      cost: 0.75, // $0.75 per verification
      estimatedTime: { min: 5, max: 15, unit: 'seconds' },
      method: 'oauth',
      priority: 2,
      enabled: true
    },

    // Latin America - Belvo
    belvo: {
      name: 'Belvo',
      supportedCountries: ['MX', 'CO', 'BR'], // Expanding to CL, PE, AR
      cost: 0.50, // $0.50 per verification
      estimatedTime: { min: 10, max: 30, unit: 'seconds' },
      method: 'oauth',
      priority: 3,
      enabled: true
    },

    // Same-day microdeposits (global fallback)
    microdeposit_fast: {
      name: 'Same-Day ACH',
      supportedCountries: ['US'], // US only for same-day ACH
      cost: 0.30, // $0.30 per verification
      estimatedTime: { min: 4, max: 8, unit: 'hours' },
      method: 'microdeposit',
      priority: 4,
      enabled: true
    },

    // Traditional microdeposits (global fallback)
    microdeposit_traditional: {
      name: 'Traditional Microdeposits',
      supportedCountries: ['*', 'CL', 'US', 'CA', 'MX', 'BR', 'AR', 'PE', 'CO'], // Explicit support for Latin American countries
      cost: 1.00, // $1.00 per verification
      estimatedTime: { min: 1, max: 3, unit: 'days' },
      method: 'microdeposit',
      priority: 10, // Lowest priority (most expensive)
      enabled: true
    },

    // Future: Chilean Open Banking (2026)
    chile_open_banking: {
      name: 'Chilean Open Banking',
      supportedCountries: ['CL'],
      cost: 0.25, // Estimated cost once available
      estimatedTime: { min: 5, max: 15, unit: 'seconds' },
      method: 'oauth',
      priority: 1,
      enabled: false // Not available yet
    }
  };

  /**
   * Route verification request to the best provider
   */
  async startVerification(request: VerificationRequest): Promise<VerificationResponse> {
    try {
      // Get optimal provider for this country
      const provider = this.getOptimalProvider(request.bankAccount.country);
      
      logger.info('Starting verification with optimal provider', {
        country: request.bankAccount.country,
        provider: provider.name,
        cost: provider.cost,
        method: provider.method
      });

      // Route to specific provider implementation
      switch (provider.name) {
        case 'Nordigen':
          return await this.verifyWithNordigen(request, provider);
        
        case 'Plaid':
          return await this.verifyWithPlaid(request, provider);
        
        case 'Belvo':
          return await this.verifyWithBelvo(request, provider);
        
        case 'Same-Day ACH':
          return await this.verifyWithSameDayACH(request, provider);
        
        case 'Traditional Microdeposits':
          return await this.verifyWithMicrodeposits(request, provider);
        
        default:
          throw new Error(`Provider ${provider.name} not implemented`);
      }

    } catch (error) {
      logger.error('Verification routing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        country: request.bankAccount.country,
        userId: request.userId
      });
      
      // Fallback to traditional microdeposits
      const fallbackProvider = this.providers.microdeposit_traditional;
      return await this.verifyWithMicrodeposits(request, fallbackProvider);
    }
  }

  /**
   * Get the optimal provider for a country
   */
  private getOptimalProvider(country: string): VerificationProvider {
    // Get all providers that support this country
    const supportedProviders = Object.values(this.providers).filter(provider => 
      provider.enabled && (
        provider.supportedCountries.includes(country) ||
        provider.supportedCountries.includes('*')
      )
    );

    if (supportedProviders.length === 0) {
      throw new Error(`No verification providers available for country: ${country}`);
    }

    // Sort by priority (lower number = higher priority) then by cost
    supportedProviders.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.cost - b.cost;
    });

    return supportedProviders[0];
  }

  /**
   * Verify with Nordigen (FREE for EU)
   */
  private async verifyWithNordigen(
    request: VerificationRequest, 
    provider: VerificationProvider
  ): Promise<VerificationResponse> {
    
    // Mock Nordigen implementation - in real implementation, use Nordigen SDK
    const verificationId = `nordigen-${Date.now()}`;
    const redirectUrl = `https://ob.nordigen.com/psd2/start/${verificationId}`;

    return {
      id: verificationId,
      method: 'nordigen',
      status: 'pending',
      provider: provider.name,
      cost: provider.cost,
      estimatedTime: provider.estimatedTime,
      redirectUrl,
      instructions: 'Click the link to verify your bank account through your online banking. This is free and takes 10-30 seconds.',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      metadata: {
        method: 'open_banking',
        country: request.bankAccount.country,
        bank: request.bankAccount.bankName
      }
    };
  }

  /**
   * Verify with Plaid (US/Canada)
   */
  private async verifyWithPlaid(
    request: VerificationRequest,
    provider: VerificationProvider
  ): Promise<VerificationResponse> {
    
    // Mock Plaid implementation - in real implementation, use Plaid SDK
    const verificationId = `plaid-${Date.now()}`;
    const linkToken = `link-token-${Date.now()}`;

    return {
      id: verificationId,
      method: 'plaid',
      status: 'pending',
      provider: provider.name,
      cost: provider.cost,
      estimatedTime: provider.estimatedTime,
      redirectUrl: `https://link.plaid.com/?token=${linkToken}`,
      instructions: 'Connect your bank account securely through Plaid Link. Takes 5-15 seconds.',
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
      metadata: {
        method: 'plaid_link',
        linkToken,
        country: request.bankAccount.country,
        routing: request.bankAccount.routingNumber
      }
    };
  }

  /**
   * Verify with Belvo (Latin America)
   */
  private async verifyWithBelvo(
    request: VerificationRequest,
    provider: VerificationProvider
  ): Promise<VerificationResponse> {
    
    // Mock Belvo implementation
    const verificationId = `belvo-${Date.now()}`;
    const widgetToken = `widget-${Date.now()}`;

    return {
      id: verificationId,
      method: 'belvo',
      status: 'pending',
      provider: provider.name,
      cost: provider.cost,
      estimatedTime: provider.estimatedTime,
      redirectUrl: `https://widget.belvo.com/?token=${widgetToken}`,
      instructions: 'Verify your bank account through Belvo\'s secure connection. Takes 10-30 seconds.',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
      metadata: {
        method: 'belvo_widget',
        widgetToken,
        country: request.bankAccount.country
      }
    };
  }

  /**
   * Verify with Same-Day ACH (US only)
   */
  private async verifyWithSameDayACH(
    request: VerificationRequest,
    provider: VerificationProvider
  ): Promise<VerificationResponse> {
    
    // Generate micro-deposit amounts
    const amount1 = Math.floor(Math.random() * 99) + 1; // 1-99 cents
    const amount2 = Math.floor(Math.random() * 99) + 1;
    const verificationId = `ach-sameday-${Date.now()}`;

    // Mock same-day ACH implementation
    return {
      id: verificationId,
      method: 'microdeposit',
      status: 'pending',
      provider: provider.name,
      cost: provider.cost,
      estimatedTime: provider.estimatedTime,
      instructions: `Two small deposits (less than $1 each) will appear in your ${request.bankAccount.bankName} account within 4-8 hours. Enter the exact amounts to verify.`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      metadata: {
        method: 'same_day_ach',
        amounts: [amount1, amount2],
        country: request.bankAccount.country,
        routingNumber: request.bankAccount.routingNumber
      }
    };
  }

  /**
   * Verify with traditional microdeposits (global fallback)
   */
  private async verifyWithMicrodeposits(
    request: VerificationRequest,
    provider: VerificationProvider
  ): Promise<VerificationResponse> {
    
    // Generate micro-deposit amounts (in cents for Chilean pesos, use smaller amounts)
    const isChilean = request.bankAccount.country === 'CL';
    const amount1 = isChilean ? Math.floor(Math.random() * 50) + 10 : Math.floor(Math.random() * 99) + 1; // 10-59 CLP cents
    const amount2 = isChilean ? Math.floor(Math.random() * 50) + 10 : Math.floor(Math.random() * 99) + 1; // 10-59 CLP cents
    const verificationId = `microdeposit-${Date.now()}`;

    // Chilean-specific instructions
    const instructions = isChilean 
      ? `Se enviarán dos pequeños depósitos (menos de $1 CLP cada uno) a tu cuenta ${request.bankAccount.bankName}. Esto puede tomar 2-5 días hábiles. Una vez que veas los depósitos, ingresa los montos exactos para verificar tu cuenta.`
      : `Two small deposits (less than $1 each) will be sent to your ${request.bankAccount.bankName} account. This may take 1-3 business days depending on your bank and country.`;

    return {
      id: verificationId,
      method: 'microdeposit',
      status: 'pending',
      provider: provider.name,
      cost: provider.cost,
      estimatedTime: provider.estimatedTime,
      instructions,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        method: 'traditional_microdeposit',
        amounts: [amount1, amount2],
        country: request.bankAccount.country,
        accountNumber: request.bankAccount.chileanAccountNumber || request.bankAccount.accountNumber,
        rut: request.bankAccount.rut,
        bankCode: request.bankAccount.bankCode,
        estimatedArrival: this.getEstimatedArrival(request.bankAccount.country)
      }
    };
  }

  /**
   * Get estimated arrival time for microdeposits by country
   */
  private getEstimatedArrival(country: string): string {
    const arrivalTimes: Record<string, string> = {
      'US': '1-2 business days',
      'CA': '1-3 business days',
      'CL': '2-5 business days',
      'MX': '2-4 business days',
      'BR': '1-3 business days',
      'GB': '1-2 business days',
      'DE': '1-2 business days',
      'FR': '1-2 business days',
      'ES': '1-2 business days'
    };
    
    return arrivalTimes[country] || '2-5 business days';
  }

  /**
   * Get cost estimate for verification by country
   */
  async getCostEstimate(country: string): Promise<{
    provider: string;
    cost: number;
    method: string;
    estimatedTime: string;
  }> {
    try {
      const provider = this.getOptimalProvider(country);
      
      return {
        provider: provider.name,
        cost: provider.cost,
        method: provider.method,
        estimatedTime: `${provider.estimatedTime.min}-${provider.estimatedTime.max} ${provider.estimatedTime.unit}`
      };
    } catch (error) {
      // Fallback to traditional microdeposits
      const fallback = this.providers.microdeposit_traditional;
      return {
        provider: fallback.name,
        cost: fallback.cost,
        method: fallback.method,
        estimatedTime: `${fallback.estimatedTime.min}-${fallback.estimatedTime.max} ${fallback.estimatedTime.unit}`
      };
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(verificationId: string): Promise<VerificationResponse> {
    // Mock implementation - in real system, check with actual provider
    const provider = this.extractProviderFromId(verificationId);
    
    // Simulate different statuses based on time elapsed
    const createdTime = this.extractTimestampFromId(verificationId);
    const elapsedMinutes = (Date.now() - createdTime) / (1000 * 60);
    
    let status: 'pending' | 'verified' | 'failed' = 'pending';
    
    // Simulate OAuth completion (fast)
    if (provider.includes('nordigen') || provider.includes('plaid') || provider.includes('belvo')) {
      if (elapsedMinutes > 2) { // 2 minutes for simulation
        status = Math.random() > 0.1 ? 'verified' : 'failed'; // 90% success rate
      }
    }
    // Simulate microdeposit verification (slower)
    else if (elapsedMinutes > 5) { // 5 minutes for simulation
      status = Math.random() > 0.05 ? 'verified' : 'failed'; // 95% success rate
    }

    return {
      id: verificationId,
      method: provider.includes('nordigen') ? 'nordigen' : 
             provider.includes('plaid') ? 'plaid' :
             provider.includes('belvo') ? 'belvo' : 'microdeposit',
      status,
      provider: provider,
      cost: 0, // Already charged
      estimatedTime: { min: 0, max: 0, unit: 'seconds' },
      instructions: status === 'verified' ? 'Account verified successfully!' : 
                   status === 'failed' ? 'Verification failed. Please try again.' :
                   'Verification in progress...'
    };
  }

  /**
   * Extract provider name from verification ID
   */
  private extractProviderFromId(verificationId: string): string {
    if (verificationId.startsWith('nordigen-')) return 'Nordigen';
    if (verificationId.startsWith('plaid-')) return 'Plaid';
    if (verificationId.startsWith('belvo-')) return 'Belvo';
    if (verificationId.startsWith('ach-sameday-')) return 'Same-Day ACH';
    return 'Traditional Microdeposits';
  }

  /**
   * Extract timestamp from verification ID
   */
  private extractTimestampFromId(verificationId: string): number {
    const parts = verificationId.split('-');
    return parseInt(parts[parts.length - 1]) || Date.now();
  }

  /**
   * Get supported countries
   */
  getSupportedCountries(): Record<string, {provider: string; cost: number; method: string}> {
    const countries: Record<string, {provider: string; cost: number; method: string}> = {};
    
    // Build comprehensive country support map
    Object.values(this.providers).forEach(provider => {
      if (!provider.enabled) return;
      
      provider.supportedCountries.forEach(country => {
        if (country === '*') return; // Skip wildcard
        
        // Use the cheapest provider for each country
        if (!countries[country] || countries[country].cost > provider.cost) {
          countries[country] = {
            provider: provider.name,
            cost: provider.cost,
            method: provider.method
          };
        }
      });
    });

    return countries;
  }
}