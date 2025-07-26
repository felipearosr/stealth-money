/**
 * Unit tests for Mantle error handling utilities
 */

import { 
  MantleError, 
  MantleErrorType, 
  MantleErrorClassifier, 
  FallbackStrategy 
} from '../mantle-error-handler';

describe('MantleError', () => {
  describe('constructor', () => {
    it('should create a MantleError with default values', () => {
      const error = new MantleError(MantleErrorType.NETWORK_CONGESTION, 'Network is busy');
      
      expect(error.type).toBe(MantleErrorType.NETWORK_CONGESTION);
      expect(error.message).toBe('Network is busy');
      expect(error.name).toBe('MantleError');
      expect(error.retryable).toBe(true); // Network congestion is retryable by default
      expect(error.fallbackToCircle).toBe(true);
      expect(error.userMessage).toContain('blockchain network is currently busy');
      expect(error.suggestedAction).toContain('Wait for network congestion');
    });

    it('should create a MantleError with custom options', () => {
      const originalError = new Error('Original error');
      const context = { transferId: 'test-123' };
      
      const error = new MantleError(MantleErrorType.INVALID_ADDRESS, 'Bad address', {
        retryable: false,
        fallbackToCircle: false,
        userMessage: 'Custom user message',
        technicalDetails: 'Custom technical details',
        suggestedAction: 'Custom action',
        originalError,
        context
      });
      
      expect(error.type).toBe(MantleErrorType.INVALID_ADDRESS);
      expect(error.retryable).toBe(false);
      expect(error.fallbackToCircle).toBe(false);
      expect(error.userMessage).toBe('Custom user message');
      expect(error.technicalDetails).toBe('Custom technical details');
      expect(error.suggestedAction).toBe('Custom action');
      expect(error.originalError).toBe(originalError);
      expect(error.context).toBe(context);
    });
  });

  describe('error type defaults', () => {
    it('should set correct defaults for retryable errors', () => {
      const retryableTypes = [
        MantleErrorType.NETWORK_CONGESTION,
        MantleErrorType.NETWORK_TIMEOUT,
        MantleErrorType.RPC_CONNECTION_FAILED,
        MantleErrorType.GAS_PRICE_TOO_LOW,
        MantleErrorType.TRANSACTION_UNDERPRICED,
        MantleErrorType.NONCE_TOO_LOW,
        MantleErrorType.TRANSACTION_TIMEOUT
      ];

      retryableTypes.forEach(type => {
        const error = new MantleError(type, 'Test message');
        expect(error.retryable).toBe(true);
      });
    });

    it('should set correct defaults for non-retryable errors', () => {
      const nonRetryableTypes = [
        MantleErrorType.INVALID_ADDRESS,
        MantleErrorType.WALLET_CREATION_FAILED,
        MantleErrorType.TRANSACTION_REVERTED
      ];

      nonRetryableTypes.forEach(type => {
        const error = new MantleError(type, 'Test message');
        expect(error.retryable).toBe(false);
      });
    });

    it('should set correct defaults for fallback-to-circle errors', () => {
      const fallbackTypes = [
        MantleErrorType.NETWORK_UNAVAILABLE,
        MantleErrorType.SERVICE_DISABLED,
        MantleErrorType.SERVICE_NOT_INITIALIZED,
        MantleErrorType.BRIDGE_UNAVAILABLE,
        MantleErrorType.CONFIGURATION_ERROR
      ];

      fallbackTypes.forEach(type => {
        const error = new MantleError(type, 'Test message');
        expect(error.fallbackToCircle).toBe(true);
      });
    });
  });

  describe('user messages', () => {
    it('should generate appropriate user messages for different error types', () => {
      const error1 = new MantleError(MantleErrorType.NETWORK_CONGESTION, 'Test');
      expect(error1.userMessage).toContain('blockchain network is currently busy');

      const error2 = new MantleError(MantleErrorType.INSUFFICIENT_GAS, 'Test');
      expect(error2.userMessage).toContain('Transaction fees are higher than expected');

      const error3 = new MantleError(MantleErrorType.INVALID_ADDRESS, 'Test');
      expect(error3.userMessage).toContain('Invalid wallet address provided');
    });
  });

  describe('fallback configuration', () => {
    it('should provide correct fallback configuration for network congestion', () => {
      const error = new MantleError(MantleErrorType.NETWORK_CONGESTION, 'Test');
      
      expect(error.fallbackConfig.strategy).toBe(FallbackStrategy.RETRY_WITH_DELAY);
      expect(error.fallbackConfig.fallbackToCircle).toBe(true);
      expect(error.fallbackConfig.userNotification).toBe(true);
      expect(error.fallbackConfig.retryConfig).toBeDefined();
      expect(error.fallbackConfig.retryConfig?.maxAttempts).toBe(3);
    });

    it('should provide correct fallback configuration for gas errors', () => {
      const error = new MantleError(MantleErrorType.INSUFFICIENT_GAS, 'Test');
      
      expect(error.fallbackConfig.strategy).toBe(FallbackStrategy.RETRY_WITH_HIGHER_GAS);
      expect(error.fallbackConfig.fallbackToCircle).toBe(true);
      expect(error.fallbackConfig.retryConfig?.maxAttempts).toBe(2);
    });

    it('should provide correct fallback configuration for service errors', () => {
      const error = new MantleError(MantleErrorType.SERVICE_DISABLED, 'Test');
      
      expect(error.fallbackConfig.strategy).toBe(FallbackStrategy.FALLBACK_TO_CIRCLE);
      expect(error.fallbackConfig.fallbackToCircle).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON correctly', () => {
      const originalError = new Error('Original');
      const context = { test: 'value' };
      
      const error = new MantleError(MantleErrorType.NETWORK_TIMEOUT, 'Timeout occurred', {
        originalError,
        context
      });
      
      const json = error.toJSON();
      
      expect(json.name).toBe('MantleError');
      expect(json.type).toBe(MantleErrorType.NETWORK_TIMEOUT);
      expect(json.message).toBe('Timeout occurred');
      expect(json.retryable).toBe(true);
      expect(json.fallbackToCircle).toBe(true);
      expect(json.context).toBe(context);
      expect(json.originalError).toBeDefined();
      expect(json.originalError.name).toBe('Error');
      expect(json.originalError.message).toBe('Original');
    });
  });
});

describe('MantleErrorClassifier', () => {
  describe('classify', () => {
    it('should return MantleError as-is', () => {
      const mantleError = new MantleError(MantleErrorType.NETWORK_CONGESTION, 'Test');
      const result = MantleErrorClassifier.classify(mantleError);
      
      expect(result).toBe(mantleError);
    });

    it('should classify network errors correctly', () => {
      const networkError = new Error('network error occurred');
      const result = MantleErrorClassifier.classify(networkError);
      
      expect(result.type).toBe(MantleErrorType.NETWORK_UNAVAILABLE);
      expect(result.originalError).toBe(networkError);
    });

    it('should classify timeout errors correctly', () => {
      const timeoutError = new Error('request timed out');
      const result = MantleErrorClassifier.classify(timeoutError);
      
      expect(result.type).toBe(MantleErrorType.NETWORK_TIMEOUT);
      expect(result.originalError).toBe(timeoutError);
    });

    it('should classify gas errors correctly', () => {
      const gasError = new Error('insufficient gas for transaction');
      const result = MantleErrorClassifier.classify(gasError);
      
      expect(result.type).toBe(MantleErrorType.INSUFFICIENT_GAS);
      expect(result.originalError).toBe(gasError);
    });

    it('should classify underpriced transaction errors correctly', () => {
      const underpricedError = new Error('transaction underpriced');
      const result = MantleErrorClassifier.classify(underpricedError);
      
      expect(result.type).toBe(MantleErrorType.TRANSACTION_UNDERPRICED);
      expect(result.originalError).toBe(underpricedError);
    });

    it('should classify nonce errors correctly', () => {
      const nonceTooLowError = new Error('nonce too low');
      const result1 = MantleErrorClassifier.classify(nonceTooLowError);
      expect(result1.type).toBe(MantleErrorType.NONCE_TOO_LOW);

      const nonceTooHighError = new Error('nonce too high');
      const result2 = MantleErrorClassifier.classify(nonceTooHighError);
      expect(result2.type).toBe(MantleErrorType.NONCE_TOO_HIGH);
    });

    it('should classify transaction reverted errors correctly', () => {
      const revertedError = new Error('execution reverted');
      const result = MantleErrorClassifier.classify(revertedError);
      
      expect(result.type).toBe(MantleErrorType.TRANSACTION_REVERTED);
      expect(result.originalError).toBe(revertedError);
    });

    it('should classify insufficient balance errors correctly', () => {
      const balanceError = new Error('insufficient balance for transfer');
      const result = MantleErrorClassifier.classify(balanceError);
      
      expect(result.type).toBe(MantleErrorType.INSUFFICIENT_BALANCE);
      expect(result.originalError).toBe(balanceError);
    });

    it('should classify invalid address errors correctly', () => {
      const addressError = new Error('invalid address format');
      const result = MantleErrorClassifier.classify(addressError);
      
      expect(result.type).toBe(MantleErrorType.INVALID_ADDRESS);
      expect(result.originalError).toBe(addressError);
    });

    it('should classify unknown errors as UNKNOWN_ERROR', () => {
      const unknownError = new Error('some random error');
      const result = MantleErrorClassifier.classify(unknownError);
      
      expect(result.type).toBe(MantleErrorType.UNKNOWN_ERROR);
      expect(result.originalError).toBe(unknownError);
    });

    it('should handle non-Error objects', () => {
      const stringError = 'string error';
      const result = MantleErrorClassifier.classify(stringError);
      
      expect(result.type).toBe(MantleErrorType.UNKNOWN_ERROR);
      expect(result.message).toBe('string error');
    });

    it('should include context in classified errors', () => {
      const error = new Error('test error');
      const context = { transferId: 'test-123', userId: 'user-456' };
      const result = MantleErrorClassifier.classify(error, context);
      
      expect(result.context).toBe(context);
    });

    it('should handle ethers.js specific errors', () => {
      // Simulate ethers.js error structure
      const ethersError = {
        message: 'insufficient funds for gas',
        code: 'INSUFFICIENT_FUNDS',
        reason: 'insufficient funds for intrinsic transaction cost'
      };
      
      const result = MantleErrorClassifier.classify(ethersError);
      expect(result.type).toBe(MantleErrorType.INSUFFICIENT_BALANCE);
    });
  });
});

describe('Error pattern matching', () => {
  const testCases = [
    // Network errors
    { message: 'NETWORK_ERROR', expectedType: MantleErrorType.NETWORK_UNAVAILABLE },
    { message: 'connection refused', expectedType: MantleErrorType.NETWORK_UNAVAILABLE },
    { message: 'ECONNREFUSED', expectedType: MantleErrorType.NETWORK_UNAVAILABLE },
    
    // Timeout errors
    { message: 'request timeout', expectedType: MantleErrorType.NETWORK_TIMEOUT },
    { message: 'operation timed out', expectedType: MantleErrorType.NETWORK_TIMEOUT },
    { message: 'ETIMEDOUT', expectedType: MantleErrorType.NETWORK_TIMEOUT },
    
    // Gas errors
    { message: 'out of gas', expectedType: MantleErrorType.INSUFFICIENT_GAS },
    { message: 'gas required exceeds allowance', expectedType: MantleErrorType.INSUFFICIENT_GAS },
    { message: 'intrinsic gas too low', expectedType: MantleErrorType.INSUFFICIENT_GAS },
    { message: 'gas price too low', expectedType: MantleErrorType.GAS_PRICE_TOO_LOW },
    
    // Transaction errors
    { message: 'transaction reverted without a reason', expectedType: MantleErrorType.TRANSACTION_REVERTED },
    { message: 'execution reverted', expectedType: MantleErrorType.TRANSACTION_REVERTED },
    { message: 'replacement transaction underpriced', expectedType: MantleErrorType.TRANSACTION_UNDERPRICED },
    
    // Nonce errors
    { message: 'nonce is too low', expectedType: MantleErrorType.NONCE_TOO_LOW },
    { message: 'nonce is too high', expectedType: MantleErrorType.NONCE_TOO_HIGH },
    
    // Balance errors
    { message: 'insufficient funds for transfer', expectedType: MantleErrorType.INSUFFICIENT_BALANCE },
    { message: 'balance too low', expectedType: MantleErrorType.INSUFFICIENT_BALANCE },
    
    // Address errors
    { message: 'invalid address format', expectedType: MantleErrorType.INVALID_ADDRESS },
    { message: 'malformed address', expectedType: MantleErrorType.INVALID_ADDRESS },
    { message: 'bad address checksum', expectedType: MantleErrorType.INVALID_ADDRESS }
  ];

  testCases.forEach(({ message, expectedType }) => {
    it(`should classify "${message}" as ${expectedType}`, () => {
      const error = new Error(message);
      const result = MantleErrorClassifier.classify(error);
      expect(result.type).toBe(expectedType);
    });
  });
});