import { FXService, ExchangeRateRequest, RateLockRequest, CalculateTransferRequest } from '../fx.service';

// Mock the CircleService base class
jest.mock('../circle.service', () => {
  return {
    CircleService: class MockCircleService {
      protected environment = 'sandbox';
      
      getEnvironment() {
        return this.environment;
      }
      
      isSandbox() {
        return this.environment === 'sandbox';
      }
      
      async healthCheck() {
        return { status: 'healthy', environment: this.environment };
      }
      
      generateIdempotencyKey(prefix = 'req') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      handleCircleError(error: any, operation: string): never {
        throw new Error(`Circle API ${operation} failed: ${error.message}`);
      }
    }
  };
});

describe('FXService', () => {
  let fxService: FXService;

  beforeEach(() => {
    jest.clearAllMocks();
    fxService = new FXService();
    
    // Clear any cached data
    (fxService as any).rateCache.clear();
    (fxService as any).lockedRates.clear();
  });

  describe('getExchangeRate', () => {
    it('should return exchange rate for USD to EUR', async () => {
      const request: ExchangeRateRequest = {
        fromCurrency: 'USD',
        toCurrency: 'EUR'
      };

      const result = await fxService.getExchangeRate(request);

      expect(result.fromCurrency).toBe('USD');
      expect(result.toCurrency).toBe('EUR');
      expect(result.rate).toBeGreaterThan(0);
      expect(result.rate).toBeLessThan(1); // USD to EUR should be less than 1
      expect(result.inverseRate).toBeGreaterThan(1);
      expect(result.rateId).toMatch(/^rate-/);
      expect(result.validUntil).toBeInstanceOf(Date);
      expect(result.validUntil.getTime()).toBeGreaterThan(Date.now());
      expect(result.fees).toBeDefined();
      expect(result.fees.total).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(['circle', 'fallback']).toContain(result.source);
    });

    it('should calculate converted amount when amount is provided', async () => {
      const request: ExchangeRateRequest = {
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 100
      };

      const result = await fxService.getExchangeRate(request);

      expect(result.amount).toBe(100);
      expect(result.convertedAmount).toBeDefined();
      expect(result.convertedAmount!).toBeGreaterThan(0);
      expect(result.convertedAmount!).toBeLessThan(100); // Should be less due to fees and rate
    });

    it('should use cached rate when available and valid', async () => {
      const request: ExchangeRateRequest = {
        fromCurrency: 'USD',
        toCurrency: 'EUR'
      };

      // First call
      const result1 = await fxService.getExchangeRate(request);
      
      // Second call should use cache
      const result2 = await fxService.getExchangeRate(request);

      expect(result1.rateId).toBe(result2.rateId);
      expect(result1.rate).toBe(result2.rate);
    });

    it('should handle API failures gracefully with fallback rates', async () => {
      // Mock the Circle API to fail
      jest.spyOn(fxService as any, 'mockCircleRateAPI').mockRejectedValue(new Error('API unavailable'));

      const request: ExchangeRateRequest = {
        fromCurrency: 'USD',
        toCurrency: 'EUR'
      };

      const result = await fxService.getExchangeRate(request);

      expect(result.source).toBe('fallback');
      expect(result.rate).toBe(0.85); // Fallback rate
    });
  });

  describe('lockExchangeRate', () => {
    it('should lock exchange rate for specified duration', async () => {
      const request: RateLockRequest = {
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 100,
        lockDurationMinutes: 15
      };

      const result = await fxService.lockExchangeRate(request);

      expect(result.rateId).toMatch(/^rate-/);
      expect(result.fromCurrency).toBe('USD');
      expect(result.toCurrency).toBe('EUR');
      expect(result.amount).toBe(100);
      expect(result.convertedAmount).toBeGreaterThan(0);
      expect(result.isLocked).toBe(true);
      expect(result.lockedAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(result.lockedAt.getTime());
      
      // Should expire in approximately 15 minutes
      const lockDuration = result.expiresAt.getTime() - result.lockedAt.getTime();
      expect(lockDuration).toBeCloseTo(15 * 60 * 1000, -3); // Within 1 second tolerance
    });

    it('should use default lock duration when not specified', async () => {
      const request: RateLockRequest = {
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 100
      };

      const result = await fxService.lockExchangeRate(request);

      const lockDuration = result.expiresAt.getTime() - result.lockedAt.getTime();
      expect(lockDuration).toBeCloseTo(10 * 60 * 1000, -3); // Default 10 minutes
    });

    it('should store locked rate for retrieval', async () => {
      const request: RateLockRequest = {
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 100
      };

      const lockedRate = await fxService.lockExchangeRate(request);
      const retrievedRate = await fxService.getLockedRate(lockedRate.rateId);

      expect(retrievedRate).toEqual(lockedRate);
    });
  });

  describe('getLockedRate', () => {
    it('should return locked rate by ID', async () => {
      const lockRequest: RateLockRequest = {
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 100
      };

      const lockedRate = await fxService.lockExchangeRate(lockRequest);
      const result = await fxService.getLockedRate(lockedRate.rateId);

      expect(result).toEqual(lockedRate);
    });

    it('should return null for non-existent rate ID', async () => {
      const result = await fxService.getLockedRate('non-existent-rate');
      expect(result).toBeNull();
    });

    it('should return null for expired rate', async () => {
      const lockRequest: RateLockRequest = {
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 100,
        lockDurationMinutes: 0.001 // Very short duration (0.06 seconds)
      };

      const lockedRate = await fxService.lockExchangeRate(lockRequest);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await fxService.getLockedRate(lockedRate.rateId);
      expect(result).toBeNull();
    });
  });

  describe('calculateTransfer', () => {
    it('should calculate complete transfer cost and breakdown', async () => {
      const request: CalculateTransferRequest = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const result = await fxService.calculateTransfer(request);

      expect(result.sendAmount).toBe(100);
      expect(result.receiveAmount).toBeGreaterThan(0);
      expect(result.receiveAmount).toBeLessThan(100); // Should be less due to fees and rate
      expect(result.exchangeRate).toBeGreaterThan(0);
      expect(result.fees).toBeDefined();
      expect(result.fees.total).toBeGreaterThan(0);
      expect(result.rateId).toMatch(/^rate-/);
      expect(result.rateValidUntil).toBeInstanceOf(Date);
      expect(result.estimatedArrival).toBeDefined();
      expect(result.breakdown).toBeDefined();

      // Verify breakdown calculations
      const breakdown = result.breakdown;
      expect(breakdown.sendAmountUSD).toBe(100);
      expect(breakdown.cardProcessingFee).toBeGreaterThan(0);
      expect(breakdown.netAmountUSD).toBe(breakdown.sendAmountUSD - breakdown.cardProcessingFee);
      expect(breakdown.grossAmountEUR).toBeCloseTo(breakdown.netAmountUSD * breakdown.exchangeRate, 2);
      expect(breakdown.finalAmountEUR).toBe(result.receiveAmount);
    });

    it('should handle different send amounts correctly', async () => {
      const request1: CalculateTransferRequest = {
        sendAmount: 50,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const request2: CalculateTransferRequest = {
        sendAmount: 200,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const result1 = await fxService.calculateTransfer(request1);
      const result2 = await fxService.calculateTransfer(request2);

      expect(result1.sendAmount).toBe(50);
      expect(result2.sendAmount).toBe(200);
      expect(result2.receiveAmount).toBeGreaterThan(result1.receiveAmount);
      
      // Fees should scale appropriately
      expect(result2.fees.cardProcessing).toBeGreaterThan(result1.fees.cardProcessing);
    });
  });

  describe('getRateUpdates', () => {
    it('should provide real-time rate updates', async () => {
      const rates: any[] = [];
      const callback = (rate: any) => rates.push(rate);

      const cleanup = await fxService.getRateUpdates('USD', 'EUR', callback, 100); // 100ms interval

      // Wait for a few updates
      await new Promise(resolve => setTimeout(resolve, 350));
      
      cleanup();

      expect(rates.length).toBeGreaterThanOrEqual(2);
      rates.forEach(rate => {
        expect(rate.fromCurrency).toBe('USD');
        expect(rate.toCurrency).toBe('EUR');
        expect(rate.rate).toBeGreaterThan(0);
      });
    });

    it('should handle errors in rate updates gracefully', async () => {
      // Mock getExchangeRate to fail
      jest.spyOn(fxService, 'getExchangeRate').mockRejectedValue(new Error('Rate fetch failed'));

      const rates: any[] = [];
      const callback = (rate: any) => rates.push(rate);

      const cleanup = await fxService.getRateUpdates('USD', 'EUR', callback, 100);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 250));
      
      cleanup();

      // Should not crash, rates array should remain empty
      expect(rates).toHaveLength(0);
    });
  });

  describe('validateRate', () => {
    it('should validate locked rates correctly', async () => {
      const lockRequest: RateLockRequest = {
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 100
      };

      const lockedRate = await fxService.lockExchangeRate(lockRequest);
      
      // Should be valid with exact rate
      const isValid1 = await fxService.validateRate(lockedRate.rateId, lockedRate.rate, 2);
      expect(isValid1).toBe(true);

      // Should be valid within variance
      const isValid2 = await fxService.validateRate(lockedRate.rateId, lockedRate.rate * 1.01, 2);
      expect(isValid2).toBe(true);

      // Should be invalid outside variance
      const isValid3 = await fxService.validateRate(lockedRate.rateId, lockedRate.rate * 1.05, 2);
      expect(isValid3).toBe(false);
    });

    it('should validate current rates for non-locked rate IDs', async () => {
      const isValid = await fxService.validateRate('non-existent-rate', 0.85, 5);
      expect(typeof isValid).toBe('boolean');
    });

    it('should handle validation errors gracefully', async () => {
      // Mock getExchangeRate to fail
      jest.spyOn(fxService, 'getExchangeRate').mockRejectedValue(new Error('Rate fetch failed'));

      const isValid = await fxService.validateRate('test-rate', 0.85, 2);
      expect(isValid).toBe(false);
    });
  });

  describe('getRateHistory', () => {
    it('should return rate history for specified duration', async () => {
      const history = await fxService.getRateHistory('USD', 'EUR', 12);

      expect(history).toHaveLength(13); // 12 hours + current
      history.forEach(entry => {
        expect(entry.rate).toBeGreaterThan(0);
        expect(entry.timestamp).toBeInstanceOf(Date);
      });

      // Should be sorted chronologically
      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp.getTime()).toBeGreaterThanOrEqual(history[i-1].timestamp.getTime());
      }
    });

    it('should return default 24 hours of history', async () => {
      const history = await fxService.getRateHistory('USD', 'EUR');
      expect(history).toHaveLength(25); // 24 hours + current
    });
  });

  describe('fee calculations', () => {
    it('should calculate fees correctly', async () => {
      const fees = (fxService as any).calculateFees(100);

      expect(fees.percentage).toBe(0.5); // 0.5% of 100
      expect(fees.fixed).toBe(0.5);
      expect(fees.total).toBe(1.0);
    });

    it('should calculate all transfer fees correctly', async () => {
      const fees = (fxService as any).calculateAllFees(100);

      expect(fees.cardProcessing).toBeCloseTo(3.20, 2); // 2.9% + $0.30
      expect(fees.transfer).toBe(0.5); // 0.5% of 100
      expect(fees.payout).toBe(2.5); // Fixed EUR payout fee
      expect(fees.total).toBeCloseTo(6.20, 2);
    });
  });

  describe('caching behavior', () => {
    it('should cache rates for performance', async () => {
      const request: ExchangeRateRequest = {
        fromCurrency: 'USD',
        toCurrency: 'EUR'
      };

      // Spy on the mock API method
      const apiSpy = jest.spyOn(fxService as any, 'mockCircleRateAPI');

      // First call should hit API
      await fxService.getExchangeRate(request);
      expect(apiSpy).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await fxService.getExchangeRate(request);
      expect(apiSpy).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should refresh cache when expired', async () => {
      const request: ExchangeRateRequest = {
        fromCurrency: 'USD',
        toCurrency: 'EUR'
      };

      // Get initial rate
      const rate1 = await fxService.getExchangeRate(request);

      // Manually expire the cache entry
      const cacheKey = 'USD-EUR';
      const cachedRate = (fxService as any).rateCache.get(cacheKey);
      if (cachedRate) {
        cachedRate.validUntil = new Date(Date.now() - 1000); // Expired 1 second ago
      }

      // Next call should fetch fresh rate
      const rate2 = await fxService.getExchangeRate(request);

      expect(rate1.rateId).not.toBe(rate2.rateId); // Different rate IDs indicate fresh fetch
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when rates are available', async () => {
      const health = await fxService.fxHealthCheck();

      expect(health.status).toBe('healthy');
      expect(health.ratesAvailable).toBe(true);
      expect(typeof health.cacheSize).toBe('number');
      expect(typeof health.environment).toBe('string');
    });

    it('should return degraded status when rate fetch fails', async () => {
      // Mock getExchangeRate to fail
      jest.spyOn(fxService, 'getExchangeRate').mockRejectedValue(new Error('Rate fetch failed'));

      const health = await fxService.fxHealthCheck();

      expect(health.status).toBe('degraded');
      expect(health.ratesAvailable).toBe(false);
      expect(typeof health.environment).toBe('string');
    });

    it('should return base health check format', async () => {
      const health = await fxService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(typeof health.environment).toBe('string');
      expect(health).not.toHaveProperty('ratesAvailable');
      expect(health).not.toHaveProperty('cacheSize');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle zero amounts gracefully', async () => {
      const request: ExchangeRateRequest = {
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 0
      };

      const result = await fxService.getExchangeRate(request);
      expect(result.amount).toBe(0);
      expect(result.convertedAmount).toBe(0);
    });

    it('should handle very large amounts', async () => {
      const request: CalculateTransferRequest = {
        sendAmount: 1000000,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const result = await fxService.calculateTransfer(request);
      expect(result.sendAmount).toBe(1000000);
      expect(result.receiveAmount).toBeGreaterThan(0);
      expect(result.breakdown.finalAmountEUR).toBeGreaterThan(0);
    });

    it('should clean up expired locked rates', async () => {
      const lockRequest: RateLockRequest = {
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 100,
        lockDurationMinutes: 0.001 // Very short duration
      };

      // Lock first rate
      const lockedRate1 = await fxService.lockExchangeRate(lockRequest);
      expect((fxService as any).lockedRates.size).toBe(1);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify the rate is expired by trying to get it
      const expiredRate = await fxService.getLockedRate(lockedRate1.rateId);
      expect(expiredRate).toBeNull();
      
      // The expired rate should have been cleaned up during the getLockedRate call
      expect((fxService as any).lockedRates.size).toBe(0);
    });
  });
});