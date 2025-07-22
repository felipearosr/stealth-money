import { 
  CircleError, 
  CircleErrorCode, 
  CircleErrorHandler, 
  CircleRetryHandler 
} from '../circle-error-handler';

describe('CircleError', () => {
  it('should create error with all properties', () => {
    const error = new CircleError(
      CircleErrorCode.PAYMENT_FAILED,
      'Payment processing failed',
      'Your payment could not be processed',
      true,
      60,
      { paymentId: 'pay-123' },
      new Error('Original error')
    );

    expect(error.code).toBe(CircleErrorCode.PAYMENT_FAILED);
    expect(error.message).toBe('Payment processing failed');
    expect(error.userMessage).toBe('Your payment could not be processed');
    expect(error.retryable).toBe(true);
    expect(error.retryAfter).toBe(60);
    expect(error.details).toEqual({ paymentId: 'pay-123' });
    expect(error.originalError).toBeInstanceOf(Error);
  });

  it('should convert to API response format', () => {
    const error = new CircleError(
      CircleErrorCode.CARD_DECLINED,
      'Card declined',
      'Your card was declined',
      false,
      undefined,
      { reason: 'insufficient_funds' }
    );

    const apiResponse = error.toApiResponse();
    expect(apiResponse).toEqual({
      error: {
        code: CircleErrorCode.CARD_DECLINED,
        message: 'Your card was declined',
        details: { reason: 'insufficient_funds' },
        retryable: false,
        retryAfter: undefined
      }
    });
  });
});

describe('CircleErrorHandler', () => {
  describe('handleError', () => {
    it('should handle network errors', () => {
      const networkError = {
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      };

      expect(() => {
        CircleErrorHandler.handleError(networkError, 'payment creation');
      }).toThrow(CircleError);

      try {
        CircleErrorHandler.handleError(networkError, 'payment creation');
      } catch (error) {
        expect(error).toBeInstanceOf(CircleError);
        const circleError = error as CircleError;
        expect(circleError.code).toBe(CircleErrorCode.NETWORK_ERROR);
        expect(circleError.retryable).toBe(true);
        expect(circleError.retryAfter).toBe(30);
      }
    });

    it('should handle timeout errors', () => {
      const timeoutError = {
        message: 'Request timeout after 30000ms'
      };

      expect(() => {
        CircleErrorHandler.handleError(timeoutError, 'payment creation');
      }).toThrow(CircleError);

      try {
        CircleErrorHandler.handleError(timeoutError, 'payment creation');
      } catch (error) {
        expect(error).toBeInstanceOf(CircleError);
        const circleError = error as CircleError;
        expect(circleError.code).toBe(CircleErrorCode.PAYMENT_TIMEOUT);
        expect(circleError.retryable).toBe(true);
      }
    });

    it('should handle validation errors', () => {
      const validationError = {
        message: 'Invalid card number'
      };

      expect(() => {
        CircleErrorHandler.handleError(validationError, 'payment creation');
      }).toThrow(CircleError);

      try {
        CircleErrorHandler.handleError(validationError, 'payment creation');
      } catch (error) {
        expect(error).toBeInstanceOf(CircleError);
        const circleError = error as CircleError;
        expect(circleError.code).toBe(CircleErrorCode.VALIDATION_ERROR);
        expect(circleError.retryable).toBe(false);
      }
    });

    it('should handle Circle API payment errors', () => {
      const apiError = {
        response: {
          data: {
            code: 'payment_declined',
            message: 'Payment was declined by the issuer'
          }
        }
      };

      expect(() => {
        CircleErrorHandler.handleError(apiError, 'payment creation');
      }).toThrow(CircleError);

      try {
        CircleErrorHandler.handleError(apiError, 'payment creation');
      } catch (error) {
        expect(error).toBeInstanceOf(CircleError);
        const circleError = error as CircleError;
        expect(circleError.code).toBe(CircleErrorCode.CARD_DECLINED);
        expect(circleError.retryable).toBe(false);
        expect(circleError.details?.errorCode).toBe('payment_declined');
      }
    });

    it('should handle Circle API wallet errors', () => {
      const apiError = {
        response: {
          data: {
            code: 'wallet_not_found',
            message: 'Wallet does not exist'
          }
        }
      };

      expect(() => {
        CircleErrorHandler.handleError(apiError, 'wallet retrieval');
      }).toThrow(CircleError);

      try {
        CircleErrorHandler.handleError(apiError, 'wallet retrieval');
      } catch (error) {
        expect(error).toBeInstanceOf(CircleError);
        const circleError = error as CircleError;
        expect(circleError.code).toBe(CircleErrorCode.WALLET_NOT_FOUND);
        expect(circleError.retryable).toBe(false);
      }
    });

    it('should handle Circle API payout errors', () => {
      const apiError = {
        response: {
          data: {
            code: 'invalid_iban',
            message: 'IBAN format is invalid'
          }
        }
      };

      expect(() => {
        CircleErrorHandler.handleError(apiError, 'payout creation');
      }).toThrow(CircleError);

      try {
        CircleErrorHandler.handleError(apiError, 'payout creation');
      } catch (error) {
        expect(error).toBeInstanceOf(CircleError);
        const circleError = error as CircleError;
        expect(circleError.code).toBe(CircleErrorCode.INVALID_BANK_DETAILS);
        expect(circleError.retryable).toBe(false);
      }
    });

    it('should handle HTTP status errors', () => {
      const httpError = {
        response: {
          status: 429
        }
      };

      expect(() => {
        CircleErrorHandler.handleError(httpError, 'payment creation');
      }).toThrow(CircleError);

      try {
        CircleErrorHandler.handleError(httpError, 'payment creation');
      } catch (error) {
        expect(error).toBeInstanceOf(CircleError);
        const circleError = error as CircleError;
        expect(circleError.code).toBe(CircleErrorCode.API_RATE_LIMITED);
        expect(circleError.retryable).toBe(true);
        expect(circleError.retryAfter).toBe(60);
      }
    });

    it('should handle unknown errors', () => {
      const unknownError = {
        message: 'Something went wrong'
      };

      expect(() => {
        CircleErrorHandler.handleError(unknownError, 'payment creation');
      }).toThrow(CircleError);

      try {
        CircleErrorHandler.handleError(unknownError, 'payment creation');
      } catch (error) {
        expect(error).toBeInstanceOf(CircleError);
        const circleError = error as CircleError;
        expect(circleError.code).toBe(CircleErrorCode.UNKNOWN_ERROR);
        expect(circleError.retryable).toBe(true);
      }
    });
  });
});

describe('CircleRetryHandler', () => {
  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await CircleRetryHandler.withRetry(
        operation,
        'test operation',
        3
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const retryableError = new CircleError(
        CircleErrorCode.NETWORK_ERROR,
        'Network error',
        'Network error',
        true
      );

      const operation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      const result = await CircleRetryHandler.withRetry(
        operation,
        'test operation',
        3,
        10, // very short delay for testing
        100
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new CircleError(
        CircleErrorCode.CARD_DECLINED,
        'Card declined',
        'Card declined',
        false
      );

      const operation = jest.fn().mockRejectedValue(nonRetryableError);

      await expect(
        CircleRetryHandler.withRetry(operation, 'test operation', 3)
      ).rejects.toThrow(CircleError);

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      const retryableError = new CircleError(
        CircleErrorCode.NETWORK_ERROR,
        'Network error',
        'Network error',
        true
      );

      const operation = jest.fn().mockRejectedValue(retryableError);

      await expect(
        CircleRetryHandler.withRetry(
          operation, 
          'test operation', 
          2,
          10,
          100
        )
      ).rejects.toThrow(CircleError);

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should handle non-CircleError exceptions', async () => {
      const genericError = new Error('Generic error');
      const operation = jest.fn()
        .mockRejectedValueOnce(genericError)
        .mockResolvedValue('success');

      const result = await CircleRetryHandler.withRetry(
        operation,
        'test operation',
        3,
        10,
        100
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should apply exponential backoff with jitter', async () => {
      const retryableError = new CircleError(
        CircleErrorCode.NETWORK_ERROR,
        'Network error',
        'Network error',
        true
      );

      const operation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      const startTime = Date.now();
      
      const result = await CircleRetryHandler.withRetry(
        operation,
        'test operation',
        3,
        100, // 100ms base delay
        1000
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      // Should take at least 100ms (first retry) + 200ms (second retry) = 300ms
      expect(totalTime).toBeGreaterThan(250);
    });
  });
});