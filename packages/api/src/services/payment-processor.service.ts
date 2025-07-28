// src/services/payment-processor.service.ts
import { PaymentService } from './payment.service';

// Types and interfaces
export interface LocationData {
  country: string;
  region?: string;
  currency: string;
  timezone?: string;
}

export interface FeeStructure {
  fixedFee: number;
  percentageFee: number;
  currency: string;
}

export interface ProcessorOption {
  id: string;
  name: string;
  supportedCountries: string[];
  supportedCurrencies: string[];
  fees: FeeStructure;
  processingTime: string;
  userExperienceScore: number;
  reliability: number;
  isAvailable: boolean;
}

export interface SelectionCriteria {
  prioritizeCost: boolean;
  prioritizeSpeed: boolean;
  prioritizeReliability: boolean;
  maxFeePercentage?: number;
  preferredProcessors?: string[];
}

export interface ProcessorSelection {
  selectedProcessor: ProcessorOption;
  reason: string;
  alternatives: ProcessorOption[];
  estimatedFees: number;
}

export interface PaymentData {
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
  processorResponse?: any;
}

// Abstract base class for payment processor adapters
export abstract class PaymentProcessorAdapter {
  abstract processPayment(paymentData: PaymentData): Promise<PaymentResult>;
  abstract isAvailable(): Promise<boolean>;
  abstract getCapabilities(): ProcessorOption;
}

// Stripe adapter implementation
export class StripeAdapter extends PaymentProcessorAdapter {
  private paymentService: PaymentService;

  constructor() {
    super();
    this.paymentService = new PaymentService();
  }

  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const amountInCents = Math.round(paymentData.amount * 100);
      
      const result = await this.paymentService.createPaymentIntent(
        amountInCents,
        paymentData.currency,
        transactionId
      );

      return {
        success: true,
        transactionId,
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
        processorResponse: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if Stripe is properly configured by checking environment variables
      const secretKey = process.env.STRIPE_SECRET_KEY;
      const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
      
      if (!secretKey || secretKey === 'sk_test_...' || secretKey.length < 20) {
        return false;
      }
      
      if (!publishableKey || publishableKey === 'pk_test_...') {
        return false;
      }
      
      // Also try to get the publishable key to ensure the service is configured
      this.paymentService.getPublishableKey();
      return true;
    } catch {
      return false;
    }
  }

  getCapabilities(): ProcessorOption {
    return {
      id: 'stripe',
      name: 'Stripe',
      supportedCountries: [
        'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT',
        'IE', 'PT', 'DK', 'SE', 'NO', 'FI', 'LU', 'GR', 'CZ', 'PL', 'HU', 'SK',
        'SI', 'EE', 'LV', 'LT', 'CY', 'MT', 'BG', 'RO', 'HR', 'JP', 'SG', 'HK',
        'MY', 'TH', 'PH', 'ID', 'IN', 'BR', 'MX', 'CL', 'CO', 'PE', 'UY', 'AR'
      ],
      supportedCurrencies: [
        'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK',
        'PLN', 'CZK', 'HUF', 'BGN', 'RON', 'HRK', 'SGD', 'HKD', 'MYR', 'THB',
        'PHP', 'IDR', 'INR', 'BRL', 'MXN', 'CLP', 'COP', 'PEN', 'UYU', 'ARS'
      ],
      fees: {
        fixedFee: 0.30,
        percentageFee: 2.9,
        currency: 'USD'
      },
      processingTime: '1-3 business days',
      userExperienceScore: 9.0,
      reliability: 99.9,
      isAvailable: true
    };
  }
}

// Plaid adapter implementation (mock for now)
export class PlaidAdapter extends PaymentProcessorAdapter {
  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    // Mock implementation - in real scenario, this would integrate with Plaid API
    try {
      const transactionId = `plaid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        success: true,
        transactionId,
        processorResponse: {
          processorId: 'plaid',
          status: 'processing',
          estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    // Mock availability check - in real scenario, check Plaid API status
    return process.env.PLAID_CLIENT_ID !== undefined && process.env.PLAID_SECRET !== undefined;
  }

  getCapabilities(): ProcessorOption {
    return {
      id: 'plaid',
      name: 'Plaid',
      supportedCountries: ['US', 'CA', 'GB', 'FR', 'ES', 'IE', 'NL'],
      supportedCurrencies: ['USD', 'CAD', 'GBP', 'EUR'],
      fees: {
        fixedFee: 0.25,
        percentageFee: 1.5,
        currency: 'USD'
      },
      processingTime: '1-2 business days',
      userExperienceScore: 8.5,
      reliability: 99.5,
      isAvailable: false // Default to false since it's not configured
    };
  }
}

// Circle adapter implementation (mock for now)
export class CircleAdapter extends PaymentProcessorAdapter {
  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    // Mock implementation - in real scenario, this would integrate with Circle API
    try {
      const transactionId = `circle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 150));
      
      return {
        success: true,
        transactionId,
        processorResponse: {
          processorId: 'circle',
          status: 'processing',
          estimatedCompletion: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    // Mock availability check - in real scenario, check Circle API status
    return process.env.CIRCLE_API_KEY !== undefined;
  }

  getCapabilities(): ProcessorOption {
    return {
      id: 'circle',
      name: 'Circle',
      supportedCountries: [
        'US', 'CA', 'GB', 'AU', 'SG', 'HK', 'JP', 'KR', 'TW', 'MY', 'TH', 'PH',
        'ID', 'VN', 'IN', 'AE', 'SA', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB', 'EG',
        'ZA', 'NG', 'KE', 'GH', 'UG', 'TZ', 'RW', 'ZM', 'BW', 'MU', 'MZ'
      ],
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'USDC', 'USDT'],
      fees: {
        fixedFee: 0.10,
        percentageFee: 1.0,
        currency: 'USD'
      },
      processingTime: '10-30 minutes',
      userExperienceScore: 7.5,
      reliability: 98.5,
      isAvailable: false // Default to false since it's not configured
    };
  }
}

// Main Payment Processor Selection Service
export class PaymentProcessorService {
  private adapters: Map<string, PaymentProcessorAdapter>;
  private countryToCurrency: Map<string, string>;
  private regionPreferences: Map<string, string[]>;

  constructor() {
    this.adapters = new Map();
    this.initializeAdapters();
    this.initializeCountryMappings();
    this.initializeRegionPreferences();
  }

  private initializeAdapters(): void {
    this.adapters.set('stripe', new StripeAdapter());
    this.adapters.set('plaid', new PlaidAdapter());
    this.adapters.set('circle', new CircleAdapter());
  }

  private initializeCountryMappings(): void {
    this.countryToCurrency = new Map([
      ['US', 'USD'], ['CA', 'CAD'], ['GB', 'GBP'], ['AU', 'AUD'],
      ['DE', 'EUR'], ['FR', 'EUR'], ['IT', 'EUR'], ['ES', 'EUR'],
      ['NL', 'EUR'], ['BE', 'EUR'], ['AT', 'EUR'], ['IE', 'EUR'],
      ['PT', 'EUR'], ['GR', 'EUR'], ['FI', 'EUR'], ['LU', 'EUR'],
      ['CY', 'EUR'], ['MT', 'EUR'], ['SI', 'EUR'], ['SK', 'EUR'],
      ['EE', 'EUR'], ['LV', 'EUR'], ['LT', 'EUR'],
      ['JP', 'JPY'], ['CH', 'CHF'], ['SE', 'SEK'], ['NO', 'NOK'],
      ['DK', 'DKK'], ['PL', 'PLN'], ['CZ', 'CZK'], ['HU', 'HUF'],
      ['BG', 'BGN'], ['RO', 'RON'], ['HR', 'HRK'],
      ['SG', 'SGD'], ['HK', 'HKD'], ['MY', 'MYR'], ['TH', 'THB'],
      ['PH', 'PHP'], ['ID', 'IDR'], ['IN', 'INR'],
      ['BR', 'BRL'], ['MX', 'MXN'], ['CL', 'CLP'], ['CO', 'COP'],
      ['PE', 'PEN'], ['UY', 'UYU'], ['AR', 'ARS']
    ]);
  }

  private initializeRegionPreferences(): void {
    this.regionPreferences = new Map([
      ['US', ['plaid', 'stripe', 'circle']],
      ['CA', ['plaid', 'stripe', 'circle']],
      ['GB', ['plaid', 'stripe', 'circle']],
      ['EU', ['stripe', 'circle', 'plaid']],
      ['ASIA', ['circle', 'stripe']],
      ['LATAM', ['stripe', 'circle']],
      ['AFRICA', ['circle', 'stripe']],
      ['OCEANIA', ['stripe', 'circle']],
      ['DEFAULT', ['stripe', 'circle', 'plaid']]
    ]);
  }

  /**
   * Analyzes user location and returns location data
   */
  async analyzeUserLocation(userId: string): Promise<LocationData> {
    // In a real implementation, this would:
    // 1. Look up user's country from database
    // 2. Potentially use IP geolocation as fallback
    // 3. Consider user's preferred currency settings
    
    // Mock implementation for now
    const mockLocation: LocationData = {
      country: 'US',
      region: 'North America',
      currency: 'USD',
      timezone: 'America/New_York'
    };

    return mockLocation;
  }

  /**
   * Gets available payment processors for a given location
   */
  async getAvailableProcessors(location: LocationData): Promise<ProcessorOption[]> {
    const availableProcessors: ProcessorOption[] = [];

    for (const [processorId, adapter] of this.adapters) {
      try {
        const capabilities = adapter.getCapabilities();
        const isAvailable = await adapter.isAvailable();
        
        // Check if processor supports the country and currency
        const supportsCountry = capabilities.supportedCountries.includes(location.country);
        const supportsCurrency = capabilities.supportedCurrencies.includes(location.currency);
        
        if (supportsCountry && supportsCurrency && isAvailable) {
          availableProcessors.push({
            ...capabilities,
            isAvailable: true
          });
        }
      } catch (error) {
        console.warn(`Error checking availability for processor ${processorId}:`, error);
      }
    }

    return availableProcessors;
  }

  /**
   * Selects the optimal payment processor based on criteria
   */
  async selectOptimalProcessor(
    options: ProcessorOption[],
    criteria: SelectionCriteria
  ): Promise<ProcessorSelection> {
    if (options.length === 0) {
      throw new Error('No available payment processors for the given criteria');
    }

    // Filter by preferred processors if specified
    let filteredOptions = options;
    if (criteria.preferredProcessors && criteria.preferredProcessors.length > 0) {
      const preferred = options.filter(option => 
        criteria.preferredProcessors!.includes(option.id)
      );
      if (preferred.length > 0) {
        filteredOptions = preferred;
      }
    }

    // Filter by maximum fee percentage if specified
    if (criteria.maxFeePercentage) {
      filteredOptions = filteredOptions.filter(option => 
        option.fees.percentageFee <= criteria.maxFeePercentage!
      );
    }

    if (filteredOptions.length === 0) {
      throw new Error('No processors meet the specified criteria');
    }

    // Calculate scores for each processor
    const scoredProcessors = filteredOptions.map(processor => {
      let score = 0;
      
      // Cost score (lower fees = higher score)
      const costScore = criteria.prioritizeCost ? 
        (10 - processor.fees.percentageFee) * 2 : 
        (10 - processor.fees.percentageFee);
      
      // Speed score (based on processing time)
      const speedScore = criteria.prioritizeSpeed ? 
        this.calculateSpeedScore(processor.processingTime) * 2 : 
        this.calculateSpeedScore(processor.processingTime);
      
      // Reliability score
      const reliabilityScore = criteria.prioritizeReliability ? 
        (processor.reliability / 10) * 2 : 
        (processor.reliability / 10);
      
      // User experience score
      const uxScore = processor.userExperienceScore;
      
      score = costScore + speedScore + reliabilityScore + uxScore;
      
      return { processor, score };
    });

    // Sort by score (highest first)
    scoredProcessors.sort((a, b) => b.score - a.score);
    
    const selectedProcessor = scoredProcessors[0].processor;
    const alternatives = scoredProcessors.slice(1).map(item => item.processor);
    
    // Calculate estimated fees for a typical transaction (e.g., $100)
    const estimatedFees = selectedProcessor.fees.fixedFee + 
      (100 * selectedProcessor.fees.percentageFee / 100);

    return {
      selectedProcessor,
      reason: this.generateSelectionReason(selectedProcessor, criteria),
      alternatives,
      estimatedFees
    };
  }

  /**
   * Processes payment using the specified processor
   */
  async processPayment(processorId: string, paymentData: PaymentData): Promise<PaymentResult> {
    const adapter = this.adapters.get(processorId);
    if (!adapter) {
      throw new Error(`Payment processor ${processorId} not found`);
    }

    const isAvailable = await adapter.isAvailable();
    if (!isAvailable) {
      throw new Error(`Payment processor ${processorId} is not available`);
    }

    return adapter.processPayment(paymentData);
  }

  /**
   * Processes payment with automatic fallback to alternative processors
   */
  async processPaymentWithFallback(
    location: LocationData,
    paymentData: PaymentData,
    criteria: SelectionCriteria
  ): Promise<PaymentResult> {
    const availableProcessors = await this.getAvailableProcessors(location);
    const selection = await this.selectOptimalProcessor(availableProcessors, criteria);
    
    // Try primary processor
    try {
      const result = await this.processPayment(selection.selectedProcessor.id, paymentData);
      if (result.success) {
        return result;
      }
    } catch (error) {
      console.warn(`Primary processor ${selection.selectedProcessor.id} failed:`, error);
    }

    // Try alternative processors
    for (const alternative of selection.alternatives) {
      try {
        console.log(`Trying fallback processor: ${alternative.id}`);
        const result = await this.processPayment(alternative.id, paymentData);
        if (result.success) {
          return {
            ...result,
            processorResponse: {
              ...result.processorResponse,
              fallbackUsed: true,
              originalProcessor: selection.selectedProcessor.id,
              actualProcessor: alternative.id
            }
          };
        }
      } catch (error) {
        console.warn(`Fallback processor ${alternative.id} failed:`, error);
      }
    }

    throw new Error('All payment processors failed');
  }

  /**
   * Gets processor recommendations for a specific region
   */
  getRegionPreferences(country: string): string[] {
    // Determine region
    const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'PT', 'GR', 'FI', 'LU', 'CY', 'MT', 'SI', 'SK', 'EE', 'LV', 'LT'];
    const asiaCountries = ['JP', 'SG', 'HK', 'MY', 'TH', 'PH', 'ID', 'VN', 'IN', 'KR', 'TW'];
    const latamCountries = ['BR', 'MX', 'CL', 'CO', 'PE', 'UY', 'AR'];
    const africaCountries = ['ZA', 'NG', 'KE', 'GH', 'UG', 'TZ', 'RW', 'ZM', 'BW', 'MU', 'MZ', 'EG'];
    const oceaniaCountries = ['AU', 'NZ'];

    let region = 'DEFAULT';
    if (country === 'US' || country === 'CA') {
      region = country;
    } else if (euCountries.includes(country)) {
      region = 'EU';
    } else if (asiaCountries.includes(country)) {
      region = 'ASIA';
    } else if (latamCountries.includes(country)) {
      region = 'LATAM';
    } else if (africaCountries.includes(country)) {
      region = 'AFRICA';
    } else if (oceaniaCountries.includes(country)) {
      region = 'OCEANIA';
    }

    return this.regionPreferences.get(region) || this.regionPreferences.get('DEFAULT')!;
  }

  private calculateSpeedScore(processingTime: string): number {
    // Convert processing time to a score (higher = faster)
    if (processingTime.includes('minutes')) {
      return 10;
    } else if (processingTime.includes('1-2 business days')) {
      return 8;
    } else if (processingTime.includes('1-3 business days')) {
      return 6;
    } else if (processingTime.includes('3-5 business days')) {
      return 4;
    } else {
      return 2;
    }
  }

  private generateSelectionReason(processor: ProcessorOption, criteria: SelectionCriteria): string {
    const reasons = [];
    
    if (criteria.prioritizeCost) {
      reasons.push(`lowest fees (${processor.fees.percentageFee}%)`);
    }
    
    if (criteria.prioritizeSpeed) {
      reasons.push(`fast processing (${processor.processingTime})`);
    }
    
    if (criteria.prioritizeReliability) {
      reasons.push(`high reliability (${processor.reliability}%)`);
    }
    
    reasons.push(`excellent user experience (${processor.userExperienceScore}/10)`);
    
    return `Selected ${processor.name} for ${reasons.join(', ')}`;
  }
}