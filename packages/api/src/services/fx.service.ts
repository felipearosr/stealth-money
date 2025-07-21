import { CircleService } from './circle.service';

/**
 * Interface for exchange rate request
 */
export interface ExchangeRateRequest {
  fromCurrency: 'USD';
  toCurrency: 'EUR';
  amount?: number;
}

/**
 * Interface for exchange rate response
 */
export interface ExchangeRateResponse {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  inverseRate: number;
  amount?: number;
  convertedAmount?: number;
  rateId: string;
  validUntil: Date;
  fees: {
    percentage: number;
    fixed: number;
    total: number;
  };
  timestamp: Date;
  source: 'circle' | 'fallback';
}

/**
 * Interface for rate lock request
 */
export interface RateLockRequest {
  fromCurrency: 'USD';
  toCurrency: 'EUR';
  amount: number;
  lockDurationMinutes?: number;
}

/**
 * Interface for locked rate response
 */
export interface LockedRateResponse {
  rateId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  amount: number;
  convertedAmount: number;
  fees: {
    percentage: number;
    fixed: number;
    total: number;
  };
  lockedAt: Date;
  expiresAt: Date;
  isLocked: true;
}

/**
 * Interface for rate calculation request
 */
export interface CalculateTransferRequest {
  sendAmount: number;
  sendCurrency: 'USD';
  receiveCurrency: 'EUR';
  includeFeesInCalculation?: boolean;
}

/**
 * Interface for transfer calculation response
 */
export interface TransferCalculationResponse {
  sendAmount: number;
  receiveAmount: number;
  exchangeRate: number;
  fees: {
    cardProcessing: number;
    transfer: number;
    payout: number;
    total: number;
  };
  rateId: string;
  rateValidUntil: Date;
  estimatedArrival: {
    min: number;
    max: number;
    unit: 'minutes' | 'hours' | 'days';
  };
  breakdown: {
    sendAmountUSD: number;
    cardProcessingFee: number;
    netAmountUSD: number;
    exchangeRate: number;
    grossAmountEUR: number;
    transferFee: number;
    payoutFee: number;
    finalAmountEUR: number;
  };
}

/**
 * FX Service for exchange rate calculation and management
 * Provides real-time rates, rate locking, and transfer calculations
 */
export class FXService extends CircleService {
  private rateCache: Map<string, ExchangeRateResponse> = new Map();
  private lockedRates: Map<string, LockedRateResponse> = new Map();
  private readonly CACHE_DURATION_MS = 30000; // 30 seconds
  private readonly DEFAULT_LOCK_DURATION_MINUTES = 10;
  private readonly FALLBACK_RATES: Record<string, number> = {
    'USD-EUR': 0.85,
    'EUR-USD': 1.18
  };

  /**
   * Get current exchange rate between currencies
   */
  async getExchangeRate(request: ExchangeRateRequest): Promise<ExchangeRateResponse> {
    try {
      const cacheKey = `${request.fromCurrency}-${request.toCurrency}`;
      
      // Check cache first
      const cached = this.rateCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        // Update converted amount if amount provided
        if (request.amount !== undefined) {
          cached.amount = request.amount;
          cached.convertedAmount = this.calculateConvertedAmount(request.amount, cached.rate, cached.fees);
        }
        return cached;
      }

      // Fetch fresh rate from Circle API
      const rate = await this.fetchRateFromCircle(request);
      
      // Cache the rate
      this.rateCache.set(cacheKey, rate);
      
      return rate;
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      
      // Fallback to static rates if Circle API fails
      return this.getFallbackRate(request);
    }
  }

  /**
   * Lock an exchange rate for a specific duration
   */
  async lockExchangeRate(request: RateLockRequest): Promise<LockedRateResponse> {
    try {
      // Get current rate
      const currentRate = await this.getExchangeRate({
        fromCurrency: request.fromCurrency,
        toCurrency: request.toCurrency,
        amount: request.amount
      });

      // Create locked rate
      const lockDuration = request.lockDurationMinutes || this.DEFAULT_LOCK_DURATION_MINUTES;
      const lockedRate: LockedRateResponse = {
        rateId: this.generateRateId(),
        fromCurrency: request.fromCurrency,
        toCurrency: request.toCurrency,
        rate: currentRate.rate,
        amount: request.amount,
        convertedAmount: this.calculateConvertedAmount(request.amount, currentRate.rate, currentRate.fees),
        fees: currentRate.fees,
        lockedAt: new Date(),
        expiresAt: new Date(Date.now() + lockDuration * 60 * 1000),
        isLocked: true
      };

      // Store locked rate
      this.lockedRates.set(lockedRate.rateId, lockedRate);

      // Clean up expired rates
      this.cleanupExpiredRates();

      return lockedRate;
    } catch (error) {
      console.error('Error locking exchange rate:', error);
      throw new Error(`Failed to lock exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a locked rate by ID
   */
  async getLockedRate(rateId: string): Promise<LockedRateResponse | null> {
    const lockedRate = this.lockedRates.get(rateId);
    
    if (!lockedRate) {
      return null;
    }

    // Check if rate has expired
    if (new Date() > lockedRate.expiresAt) {
      this.lockedRates.delete(rateId);
      return null;
    }

    return lockedRate;
  }

  /**
   * Calculate complete transfer cost and receive amount
   */
  async calculateTransfer(request: CalculateTransferRequest): Promise<TransferCalculationResponse> {
    try {
      // Get current exchange rate
      const rateResponse = await this.getExchangeRate({
        fromCurrency: request.sendCurrency,
        toCurrency: request.receiveCurrency,
        amount: request.sendAmount
      });

      // Calculate all fees
      const fees = this.calculateAllFees(request.sendAmount);
      
      // Calculate breakdown
      const breakdown = this.calculateTransferBreakdown(request.sendAmount, rateResponse.rate, fees);

      return {
        sendAmount: request.sendAmount,
        receiveAmount: breakdown.finalAmountEUR,
        exchangeRate: rateResponse.rate,
        fees,
        rateId: rateResponse.rateId,
        rateValidUntil: rateResponse.validUntil,
        estimatedArrival: {
          min: 2,
          max: 5,
          unit: 'minutes'
        },
        breakdown
      };
    } catch (error) {
      console.error('Error calculating transfer:', error);
      throw new Error(`Failed to calculate transfer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get real-time rate updates (for WebSocket or polling)
   */
  async getRateUpdates(
    fromCurrency: 'USD',
    toCurrency: 'EUR',
    callback: (rate: ExchangeRateResponse) => void,
    intervalMs: number = 5000
  ): Promise<() => void> {
    const interval = setInterval(async () => {
      try {
        const rate = await this.getExchangeRate({ fromCurrency, toCurrency });
        callback(rate);
      } catch (error) {
        console.error('Error in rate update:', error);
      }
    }, intervalMs);

    // Return cleanup function
    return () => clearInterval(interval);
  }

  /**
   * Validate if a rate is still valid and within acceptable variance
   */
  async validateRate(rateId: string, expectedRate: number, maxVariancePercent: number = 2): Promise<boolean> {
    try {
      // Check if it's a locked rate first
      const lockedRate = await this.getLockedRate(rateId);
      if (lockedRate) {
        return Math.abs(lockedRate.rate - expectedRate) / expectedRate <= maxVariancePercent / 100;
      }

      // For non-locked rates, get current rate and compare
      const currentRate = await this.getExchangeRate({ fromCurrency: 'USD', toCurrency: 'EUR' });
      return Math.abs(currentRate.rate - expectedRate) / expectedRate <= maxVariancePercent / 100;
    } catch (error) {
      console.error('Error validating rate:', error);
      return false;
    }
  }

  /**
   * Get rate history for analytics (simplified implementation)
   */
  async getRateHistory(
    fromCurrency: 'USD',
    toCurrency: 'EUR',
    hours: number = 24
  ): Promise<Array<{ rate: number; timestamp: Date }>> {
    // In a real implementation, this would fetch from a database or external service
    // For now, return mock data
    const history: Array<{ rate: number; timestamp: Date }> = [];
    const baseRate = this.FALLBACK_RATES['USD-EUR'];
    
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
      const variance = (Math.random() - 0.5) * 0.02; // ±1% variance
      const rate = baseRate + (baseRate * variance);
      history.push({ rate: Math.round(rate * 10000) / 10000, timestamp });
    }
    
    return history;
  }

  /**
   * Fetch exchange rate from Circle API
   */
  private async fetchRateFromCircle(request: ExchangeRateRequest): Promise<ExchangeRateResponse> {
    try {
      // Mock Circle API call - in production this would use actual Circle SDK
      const mockRate = await this.mockCircleRateAPI(request);
      
      const fees = this.calculateFees(request.amount || 100);
      const convertedAmount = request.amount !== undefined ? 
        this.calculateConvertedAmount(request.amount, mockRate.rate, fees) : undefined;

      return {
        fromCurrency: request.fromCurrency,
        toCurrency: request.toCurrency,
        rate: mockRate.rate,
        inverseRate: 1 / mockRate.rate,
        amount: request.amount,
        convertedAmount,
        rateId: this.generateRateId(),
        validUntil: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        fees,
        timestamp: new Date(),
        source: 'circle'
      };
    } catch (error) {
      throw new Error(`Circle API rate fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mock Circle API rate call
   */
  private async mockCircleRateAPI(request: ExchangeRateRequest): Promise<{ rate: number }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Add some realistic variance to the base rate
    const baseRate = this.FALLBACK_RATES[`${request.fromCurrency}-${request.toCurrency}`] || 0.85;
    const variance = (Math.random() - 0.5) * 0.01; // ±0.5% variance
    const rate = baseRate + (baseRate * variance);
    
    return { rate: Math.round(rate * 10000) / 10000 };
  }

  /**
   * Get fallback rate when Circle API is unavailable
   */
  private getFallbackRate(request: ExchangeRateRequest): ExchangeRateResponse {
    const rateKey = `${request.fromCurrency}-${request.toCurrency}`;
    const rate = this.FALLBACK_RATES[rateKey] || 0.85;
    const fees = this.calculateFees(request.amount || 100);
    const convertedAmount = request.amount !== undefined ? 
      this.calculateConvertedAmount(request.amount, rate, fees) : undefined;

    return {
      fromCurrency: request.fromCurrency,
      toCurrency: request.toCurrency,
      rate,
      inverseRate: 1 / rate,
      amount: request.amount,
      convertedAmount,
      rateId: this.generateRateId(),
      validUntil: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes for fallback
      fees,
      timestamp: new Date(),
      source: 'fallback'
    };
  }

  /**
   * Calculate fees for currency conversion
   */
  private calculateFees(amount: number): { percentage: number; fixed: number; total: number } {
    const percentage = 0.005; // 0.5% conversion fee
    const fixed = 0.50; // $0.50 fixed fee
    const percentageFee = amount * percentage;
    const total = percentageFee + fixed;

    return {
      percentage: Math.round(percentageFee * 100) / 100,
      fixed,
      total: Math.round(total * 100) / 100
    };
  }

  /**
   * Calculate all transfer fees
   */
  private calculateAllFees(amount: number): {
    cardProcessing: number;
    transfer: number;
    payout: number;
    total: number;
  } {
    const cardProcessing = Math.round((amount * 0.029 + 0.30) * 100) / 100; // 2.9% + $0.30
    const transfer = Math.round((amount * 0.005) * 100) / 100; // 0.5% transfer fee
    const payout = 2.50; // Fixed EUR payout fee
    const total = cardProcessing + transfer + payout;

    return {
      cardProcessing,
      transfer,
      payout,
      total: Math.round(total * 100) / 100
    };
  }

  /**
   * Calculate transfer breakdown
   */
  private calculateTransferBreakdown(
    sendAmount: number,
    exchangeRate: number,
    fees: { cardProcessing: number; transfer: number; payout: number; total: number }
  ) {
    const sendAmountUSD = sendAmount;
    const cardProcessingFee = fees.cardProcessing;
    const netAmountUSD = sendAmountUSD - cardProcessingFee;
    const grossAmountEUR = netAmountUSD * exchangeRate;
    const transferFee = fees.transfer * exchangeRate; // Convert to EUR
    const payoutFee = fees.payout;
    const finalAmountEUR = grossAmountEUR - transferFee - payoutFee;

    return {
      sendAmountUSD: Math.round(sendAmountUSD * 100) / 100,
      cardProcessingFee: Math.round(cardProcessingFee * 100) / 100,
      netAmountUSD: Math.round(netAmountUSD * 100) / 100,
      exchangeRate: Math.round(exchangeRate * 10000) / 10000,
      grossAmountEUR: Math.round(grossAmountEUR * 100) / 100,
      transferFee: Math.round(transferFee * 100) / 100,
      payoutFee: Math.round(payoutFee * 100) / 100,
      finalAmountEUR: Math.round(finalAmountEUR * 100) / 100
    };
  }

  /**
   * Calculate converted amount after fees
   */
  private calculateConvertedAmount(
    amount: number,
    rate: number,
    fees: { percentage: number; fixed: number; total: number }
  ): number {
    if (amount === 0) return 0;
    const netAmount = Math.max(0, amount - fees.total);
    const converted = netAmount * rate;
    return Math.round(converted * 100) / 100;
  }

  /**
   * Check if cached rate is still valid
   */
  private isCacheValid(rate: ExchangeRateResponse): boolean {
    return new Date() < rate.validUntil;
  }

  /**
   * Generate unique rate ID
   */
  private generateRateId(): string {
    return `rate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up expired locked rates
   */
  private cleanupExpiredRates(): void {
    const now = new Date();
    for (const [rateId, lockedRate] of this.lockedRates.entries()) {
      if (now > lockedRate.expiresAt) {
        this.lockedRates.delete(rateId);
      }
    }
  }

  /**
   * Health check for FX service
   */
  async healthCheck(): Promise<{ status: string; environment: string }> {
    try {
      // Test rate fetch
      await this.getExchangeRate({ fromCurrency: 'USD', toCurrency: 'EUR' });
      
      return {
        status: 'healthy',
        environment: this.getEnvironment()
      };
    } catch (error) {
      return {
        status: 'degraded',
        environment: this.getEnvironment()
      };
    }
  }

  /**
   * Extended health check with FX-specific information
   */
  async fxHealthCheck(): Promise<{ status: string; environment: string; ratesAvailable: boolean; cacheSize: number }> {
    try {
      // Test rate fetch
      await this.getExchangeRate({ fromCurrency: 'USD', toCurrency: 'EUR' });
      
      return {
        status: 'healthy',
        environment: this.getEnvironment(),
        ratesAvailable: true,
        cacheSize: this.rateCache.size
      };
    } catch (error) {
      return {
        status: 'degraded',
        environment: this.getEnvironment(),
        ratesAvailable: false,
        cacheSize: this.rateCache.size
      };
    }
  }
}