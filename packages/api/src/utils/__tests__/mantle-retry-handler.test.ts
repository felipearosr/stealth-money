/**
 * Unit tests for Mantle retry handler utilities
 */

import { MantleRetryHandler, RetryResult } from '../mantle-retry-handler';
import { MantleError, MantleErrorType, FallbackStrategy } from '../mantle-error-handler';

// Mock setTimeout for testing
jest.useFakeTimers();

describe('MantleRetryHandler', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const resultPromise = MantleRetryHandler.executeWithRetry(mockOperation);
      
      // Fast-forward timers to complete the operation
      jest.runAllTimers();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(result.fallbackTriggered).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const retryableError = new MantleError(MantleErrorType.NETWORK_CONGESTION, 'Network busy');
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');
      
      const config = {
        maxAttempts: 3,
        baseDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000,
        jitter: false
      };
      
      const resultPromise = MantleRetryHandler.executeWithRetry(mockOperation, config);
      
      // Fast-forward timers to complete all retries
      jest.runAllTimers();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts with retryable error', async () => {
      const retryableError = new MantleError(MantleErrorType.NETWORK_CONGESTION, 'Network busy');
      const mockOperation = jest.fn().mockRejectedValue(retryableError);
      
      const config = {
        maxAttempts: 2,
        baseDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000,
        jitter: false
      };
      
      const resultPromise = MantleRetryHandler.executeWithRetry(mockOperation, config);
      
      // Fast-forward timers to complete all retries
      jest.runAllTimers();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(retryableError);
      expect(result.attempts).toBe(2);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableError = new MantleError(MantleErrorType.INVALID_ADDRESS, 'Bad address');
      const mockOperation = jest.fn().mockRejectedValue(nonRetryableError);
      
      const resultPromise = MantleRetryHandler.executeWithRetry(mockOperation);
      
      // Fast-forward timers
      jest.runAllTimers();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(nonRetryableError);
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should convert generic errors to MantleError', async () => {
      const genericError = new Error('Generic error');
      const mockOperation = jest.fn().mockRejectedValue(genericError);
      
      const resultPromise = MantleRetryHandler.executeWithRetry(mockOperation);
      
      // Fast-forward timers
      jest.runAllTimers();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(MantleError);
      expect(result.error?.type).toBe(MantleErrorType.UNKNOWN_ERROR);
      expect(result.error?.originalError).toBe(genericError);
    });

    it('should apply exponential backoff correctly', async () => {
      const retryableError = new MantleError(MantleErrorType.NETWORK_TIMEOUT, 'Timeout');
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');
      
      const config = {
        maxAttempts: 3,
        baseDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000,
        jitter: false
      };
      
      const resultPromise = MantleRetryHandler.executeWithRetry(mockOperation, config);
      
      // First attempt should happen immediately
      expect(mockOperation).toHaveBeenCalledTimes(1);
      
      // Advance by first delay (1000ms)
      jest.advanceTimersByTime(1000);
      expect(mockOperation).toHaveBeenCalledTimes(2);
      
      // Advance by second delay (2000ms due to backoff)
      jest.advanceTimersByTime(2000);
      expect(mockOperation).toHaveBeenCalledTimes(3);
      
      const result = await resultPromise;
      expect(result.success).toBe(true);
    });

    it('should respect max delay limit', async () => {
      const retryableError = new MantleError(MantleErrorType.NETWORK_CONGESTION, 'Congestion');
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');
      
      const config = {
        maxAttempts: 2,
        baseDelay: 5000,
        backoffMultiplier: 10, // Would normally create very large delay
        maxDelay: 3000, // But this limits it
        jitter: false
      };
      
      const resultPromise = MantleRetryHandler.executeWithRetry(mockOperation, config);
      
      // First attempt
      expect(mockOperation).toHaveBeenCalledTimes(1);
      
      // Should only need to wait maxDelay, not the calculated exponential delay
      jest.advanceTimersByTime(3000);
      expect(mockOperation).toHaveBeenCalledTimes(2);
      
      const result = await resultPromise;
      expect(result.success).toBe(true);
    });
  });

  describe('executeWithAdaptiveRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const resultPromise = MantleRetryHandler.executeWithAdaptiveRetry(mockOperation);
      
      jest.runAllTimers();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
    });

    it('should use error-specific retry configuration', async () => {
      const networkError = new MantleError(MantleErrorType.NETWORK_CONGESTION, 'Network busy');
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');
      
      const resultPromise = MantleRetryHandler.executeWithAdaptiveRetry(mockOperation);
      
      jest.runAllTimers();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.attempts).toBeGreaterThan(1); // Should have retried
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableError = new MantleError(MantleErrorType.INVALID_ADDRESS, 'Bad address');
      const mockOperation = jest.fn().mockRejectedValue(nonRetryableError);
      
      const resultPromise = MantleRetryHandler.executeWithAdaptiveRetry(mockOperation);
      
      jest.runAllTimers();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
    });
  });

  describe('executeWithGasRetry', () => {
    it('should succeed with initial gas multiplier', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const resultPromise = MantleRetryHandler.executeWithGasRetry(mockOperation);
      
      jest.runAllTimers();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledWith(1.0); // First multiplier
    });

    it('should retry with higher gas multipliers', async () => {
      const gasError = new MantleError(MantleErrorType.GAS_PRICE_TOO_LOW, 'Gas too low');
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(gasError)
        .mockRejectedValueOnce(gasError)
        .mockResolvedValue('success');
      
      const resultPromise = MantleRetryHandler.executeWithGasRetry(mockOperation);
      
      jest.runAllTimers();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(mockOperation).toHaveBeenNthCalledWith(1, 1.0);
      expect(mockOperation).toHaveBeenNthCalledWith(2, 1.2);
      expect(mockOperation).toHaveBeenNthCalledWith(3, 1.5);
    });

    it('should stop retrying for non-gas-related errors', async () => {
      const networkError = new MantleError(MantleErrorType.NETWORK_UNAVAILABLE, 'Network down');
      const mockOperation = jest.fn().mockRejectedValue(networkError);
      
      const resultPromise = MantleRetryHandler.executeWithGasRetry(mockOperation);
      
      jest.runAllTimers();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeWithNonceRetry', () => {
    it('should succeed with initial nonce', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const mockGetNonce = jest.fn().mockResolvedValue(42);
      
      const resultPromise = MantleRetryHandler.executeWithNonceRetry(mockOperation, mockGetNonce);
      
      jest.runAllTimers();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledWith(42);
    });

    it('should retry with fresh nonce for nonce errors', async () => {
      const nonceError = new MantleError(MantleErrorType.NONCE_TOO_LOW, 'Nonce too low');
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(nonceError)
        .mockResolvedValue('success');
      const mockGetNonce = jest.fn()
        .mockResolvedValueOnce(42)
        .mockResolvedValueOnce(43);
      
      const resultPromise = MantleRetryHandler.executeWithNonceRetry(mockOperation, mockGetNonce);
      
      jest.runAllTimers();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(mockOperation).toHaveBeenNthCalledWith(1, 42);
      expect(mockOperation).toHaveBeenNthCalledWith(2, 43);
    });

    it('should stop retrying for non-nonce-related errors', async () => {
      const gasError = new MantleError(MantleErrorType.INSUFFICIENT_GAS, 'Not enough gas');
      const mockOperation = jest.fn().mockRejectedValue(gasError);
      const mockGetNonce = jest.fn().mockResolvedValue(42);
      
      const resultPromise = MantleRetryHandler.executeWithNonceRetry(mockOperation, mockGetNonce);
      
      jest.runAllTimers();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
    });
  });

  describe('getRetryStrategy', () => {
    it('should return correct strategies for different error types', () => {
      expect(MantleRetryHandler.getRetryStrategy(MantleErrorType.NETWORK_CONGESTION))
        .toBe(FallbackStrategy.RETRY_WITH_DELAY);
      
      expect(MantleRetryHandler.getRetryStrategy(MantleErrorType.INSUFFICIENT_GAS))
        .toBe(FallbackStrategy.RETRY_WITH_HIGHER_GAS);
      
      expect(MantleRetryHandler.getRetryStrategy(MantleErrorType.TRANSACTION_TIMEOUT))
        .toBe(FallbackStrategy.QUEUE_FOR_LATER);
      
      expect(MantleRetryHandler.getRetryStrategy(MantleErrorType.INVALID_ADDRESS))
        .toBe(FallbackStrategy.FALLBACK_TO_CIRCLE);
    });
  });

  describe('createRetryConfig', () => {
    it('should create appropriate retry configs for different error types', () => {
      const networkConfig = MantleRetryHandler.createRetryConfig(MantleErrorType.NETWORK_CONGESTION);
      expect(networkConfig.maxAttempts).toBe(3);
      expect(networkConfig.baseDelay).toBe(5000);
      expect(networkConfig.jitter).toBe(true);
      
      const gasConfig = MantleRetryHandler.createRetryConfig(MantleErrorType.INSUFFICIENT_GAS);
      expect(gasConfig.maxAttempts).toBe(2);
      expect(gasConfig.baseDelay).toBe(1000);
      expect(gasConfig.jitter).toBe(false);
      
      const nonceConfig = MantleRetryHandler.createRetryConfig(MantleErrorType.NONCE_TOO_LOW);
      expect(nonceConfig.maxAttempts).toBe(2);
      expect(nonceConfig.maxDelay).toBe(3000);
    });
  });

  describe('delay calculation', () => {
    it('should calculate exponential backoff delays correctly', async () => {
      const retryableError = new MantleError(MantleErrorType.NETWORK_TIMEOUT, 'Timeout');
      const mockOperation = jest.fn().mockRejectedValue(retryableError);
      
      const config = {
        maxAttempts: 4,
        baseDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 20000,
        jitter: false
      };
      
      const resultPromise = MantleRetryHandler.executeWithRetry(mockOperation, config);
      
      // Track when each attempt happens
      const attemptTimes: number[] = [];
      
      // First attempt (immediate)
      attemptTimes.push(Date.now());
      expect(mockOperation).toHaveBeenCalledTimes(1);
      
      // Second attempt (after 1000ms)
      jest.advanceTimersByTime(1000);
      attemptTimes.push(Date.now());
      expect(mockOperation).toHaveBeenCalledTimes(2);
      
      // Third attempt (after 2000ms more)
      jest.advanceTimersByTime(2000);
      attemptTimes.push(Date.now());
      expect(mockOperation).toHaveBeenCalledTimes(3);
      
      // Fourth attempt (after 4000ms more)
      jest.advanceTimersByTime(4000);
      attemptTimes.push(Date.now());
      expect(mockOperation).toHaveBeenCalledTimes(4);
      
      const result = await resultPromise;
      expect(result.success).toBe(false);
    });
  });
});