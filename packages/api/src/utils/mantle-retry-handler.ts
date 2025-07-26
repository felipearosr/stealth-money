/**
 * Retry logic utility for Mantle operations
 * Provides intelligent retry mechanisms with exponential backoff, jitter, and adaptive strategies
 */

import { MantleError, MantleErrorType, RetryConfig, FallbackStrategy } from './mantle-error-handler';

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: MantleError;
  attempts: number;
  totalDuration: number;
  fallbackTriggered: boolean;
}

/**
 * Context for retry operations
 */
export interface RetryContext {
  operation: string;
  transferId?: string;
  userId?: string;
  attempt: number;
  maxAttempts: number;
  startTime: number;
  lastError?: MantleError;
  metadata?: Record<string, any>;
}

/**
 * Retry handler for Mantle operations
 */
export class MantleRetryHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 30000,
    jitter: true
  };

  /**
   * Execute an operation with retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = MantleRetryHandler.DEFAULT_RETRY_CONFIG,
    context: Partial<RetryContext> = {}
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const fullContext: RetryContext = {
      operation: context.operation || 'unknown',
      transferId: context.transferId,
      userId: context.userId,
      attempt: 0,
      maxAttempts: config.maxAttempts,
      startTime,
      metadata: context.metadata
    };

    let lastError: MantleError | undefined;
    let fallbackTriggered = false;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      fullContext.attempt = attempt;
      
      try {
        console.log(`🔄 Attempting ${fullContext.operation} (${attempt}/${config.maxAttempts})${fullContext.transferId ? ` for transfer ${fullContext.transferId}` : ''}`);
        
        const result = await operation();
        
        const duration = Date.now() - startTime;
        console.log(`✅ ${fullContext.operation} succeeded on attempt ${attempt} after ${duration}ms`);
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalDuration: duration,
          fallbackTriggered
        };
      } catch (error) {
        const mantleError = error instanceof MantleError ? error : new MantleError(
          MantleErrorType.UNKNOWN_ERROR,
          error instanceof Error ? error.message : String(error),
          { originalError: error instanceof Error ? error : undefined }
        );

        lastError = mantleError;
        fullContext.lastError = mantleError;

        console.warn(`⚠️  ${fullContext.operation} failed on attempt ${attempt}:`, {
          type: mantleError.type,
          message: mantleError.message,
          retryable: mantleError.retryable
        });

        // Check if error is retryable and we have attempts left
        if (!mantleError.retryable || attempt >= config.maxAttempts) {
          console.error(`❌ ${fullContext.operation} failed permanently after ${attempt} attempts`);
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, config);
        console.log(`⏳ Waiting ${delay}ms before retry ${attempt + 1}/${config.maxAttempts}`);
        
        await this.sleep(delay);
      }
    }

    const totalDuration = Date.now() - startTime;
    
    return {
      success: false,
      error: lastError,
      attempts: config.maxAttempts,
      totalDuration,
      fallbackTriggered
    };
  }

  /**
   * Execute operation with adaptive retry based on error type
   */
  static async executeWithAdaptiveRetry<T>(
    operation: () => Promise<T>,
    context: Partial<RetryContext> = {}
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: MantleError | undefined;
    let totalAttempts = 0;

    try {
      // First attempt without retry
      totalAttempts = 1;
      const result = await operation();
      
      return {
        success: true,
        result,
        attempts: totalAttempts,
        totalDuration: Date.now() - startTime,
        fallbackTriggered: false
      };
    } catch (error) {
      const mantleError = error instanceof MantleError ? error : new MantleError(
        MantleErrorType.UNKNOWN_ERROR,
        error instanceof Error ? error.message : String(error),
        { originalError: error instanceof Error ? error : undefined }
      );

      lastError = mantleError;

      // If not retryable, return immediately
      if (!mantleError.retryable) {
        return {
          success: false,
          error: mantleError,
          attempts: totalAttempts,
          totalDuration: Date.now() - startTime,
          fallbackTriggered: false
        };
      }

      // Use error-specific retry configuration
      const retryConfig = mantleError.fallbackConfig.retryConfig;
      if (!retryConfig) {
        return {
          success: false,
          error: mantleError,
          attempts: totalAttempts,
          totalDuration: Date.now() - startTime,
          fallbackTriggered: false
        };
      }

      // Execute retry with error-specific configuration
      const retryResult = await this.executeWithRetry(operation, retryConfig, {
        ...context,
        operation: context.operation || 'adaptive-retry'
      });

      return {
        ...retryResult,
        attempts: totalAttempts + retryResult.attempts
      };
    }
  }

  /**
   * Execute operation with gas price adjustment retry
   */
  static async executeWithGasRetry<T>(
    operation: (gasMultiplier: number) => Promise<T>,
    context: Partial<RetryContext> = {}
  ): Promise<RetryResult<T>> {
    const gasMultipliers = [1.0, 1.2, 1.5]; // Increase gas price by 20%, then 50%
    const startTime = Date.now();
    let lastError: MantleError | undefined;

    for (let i = 0; i < gasMultipliers.length; i++) {
      const multiplier = gasMultipliers[i];
      
      try {
        console.log(`⛽ Attempting operation with gas multiplier ${multiplier}x (${i + 1}/${gasMultipliers.length})`);
        
        const result = await operation(multiplier);
        
        const duration = Date.now() - startTime;
        console.log(`✅ Operation succeeded with gas multiplier ${multiplier}x after ${duration}ms`);
        
        return {
          success: true,
          result,
          attempts: i + 1,
          totalDuration: duration,
          fallbackTriggered: false
        };
      } catch (error) {
        const mantleError = error instanceof MantleError ? error : new MantleError(
          MantleErrorType.UNKNOWN_ERROR,
          error instanceof Error ? error.message : String(error),
          { originalError: error instanceof Error ? error : undefined }
        );

        lastError = mantleError;

        console.warn(`⚠️  Operation failed with gas multiplier ${multiplier}x:`, {
          type: mantleError.type,
          message: mantleError.message
        });

        // If it's not a gas-related error, don't continue retrying
        if (!this.isGasRelatedError(mantleError.type)) {
          break;
        }

        // If this was the last attempt, break
        if (i >= gasMultipliers.length - 1) {
          break;
        }

        // Wait a bit before trying with higher gas
        await this.sleep(1000);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: gasMultipliers.length,
      totalDuration: Date.now() - startTime,
      fallbackTriggered: false
    };
  }

  /**
   * Execute operation with nonce correction retry
   */
  static async executeWithNonceRetry<T>(
    operation: (nonce?: number) => Promise<T>,
    getNonce: () => Promise<number>,
    context: Partial<RetryContext> = {}
  ): Promise<RetryResult<T>> {
    const maxAttempts = 3;
    const startTime = Date.now();
    let lastError: MantleError | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔢 Attempting operation with nonce correction (${attempt}/${maxAttempts})`);
        
        // Get fresh nonce for each attempt
        const nonce = await getNonce();
        const result = await operation(nonce);
        
        const duration = Date.now() - startTime;
        console.log(`✅ Operation succeeded with nonce ${nonce} after ${duration}ms`);
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalDuration: duration,
          fallbackTriggered: false
        };
      } catch (error) {
        const mantleError = error instanceof MantleError ? error : new MantleError(
          MantleErrorType.UNKNOWN_ERROR,
          error instanceof Error ? error.message : String(error),
          { originalError: error instanceof Error ? error : undefined }
        );

        lastError = mantleError;

        console.warn(`⚠️  Operation failed on nonce attempt ${attempt}:`, {
          type: mantleError.type,
          message: mantleError.message
        });

        // If it's not a nonce-related error, don't continue retrying
        if (!this.isNonceRelatedError(mantleError.type)) {
          break;
        }

        // Wait a bit before trying with fresh nonce
        if (attempt < maxAttempts) {
          await this.sleep(1000);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: maxAttempts,
      totalDuration: Date.now() - startTime,
      fallbackTriggered: false
    };
  }

  /**
   * Calculate delay for exponential backoff with jitter
   */
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    // Calculate exponential backoff delay
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (config.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
      delay += jitter;
    }
    
    return Math.max(delay, 0);
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error type is gas-related
   */
  private static isGasRelatedError(errorType: MantleErrorType): boolean {
    return [
      MantleErrorType.INSUFFICIENT_GAS,
      MantleErrorType.GAS_PRICE_TOO_LOW,
      MantleErrorType.TRANSACTION_UNDERPRICED
    ].includes(errorType);
  }

  /**
   * Check if error type is nonce-related
   */
  private static isNonceRelatedError(errorType: MantleErrorType): boolean {
    return [
      MantleErrorType.NONCE_TOO_LOW,
      MantleErrorType.NONCE_TOO_HIGH
    ].includes(errorType);
  }

  /**
   * Get recommended retry strategy for error type
   */
  static getRetryStrategy(errorType: MantleErrorType): FallbackStrategy {
    const strategies: Record<MantleErrorType, FallbackStrategy> = {
      [MantleErrorType.NETWORK_CONGESTION]: FallbackStrategy.RETRY_WITH_DELAY,
      [MantleErrorType.NETWORK_UNAVAILABLE]: FallbackStrategy.FALLBACK_TO_CIRCLE,
      [MantleErrorType.NETWORK_TIMEOUT]: FallbackStrategy.RETRY_WITH_DELAY,
      [MantleErrorType.RPC_CONNECTION_FAILED]: FallbackStrategy.RETRY_WITH_DELAY,
      [MantleErrorType.INSUFFICIENT_GAS]: FallbackStrategy.RETRY_WITH_HIGHER_GAS,
      [MantleErrorType.GAS_PRICE_TOO_LOW]: FallbackStrategy.RETRY_WITH_HIGHER_GAS,
      [MantleErrorType.GAS_LIMIT_EXCEEDED]: FallbackStrategy.FALLBACK_TO_CIRCLE,
      [MantleErrorType.TRANSACTION_TIMEOUT]: FallbackStrategy.QUEUE_FOR_LATER,
      [MantleErrorType.TRANSACTION_REVERTED]: FallbackStrategy.FALLBACK_TO_CIRCLE,
      [MantleErrorType.TRANSACTION_UNDERPRICED]: FallbackStrategy.RETRY_WITH_HIGHER_GAS,
      [MantleErrorType.NONCE_TOO_LOW]: FallbackStrategy.RETRY_WITH_DELAY,
      [MantleErrorType.NONCE_TOO_HIGH]: FallbackStrategy.RETRY_WITH_DELAY,
      [MantleErrorType.WALLET_CREATION_FAILED]: FallbackStrategy.FALLBACK_TO_CIRCLE,
      [MantleErrorType.INVALID_PRIVATE_KEY]: FallbackStrategy.MANUAL_INTERVENTION,
      [MantleErrorType.INSUFFICIENT_BALANCE]: FallbackStrategy.FALLBACK_TO_CIRCLE,
      [MantleErrorType.INVALID_ADDRESS]: FallbackStrategy.ABORT_TRANSACTION,
      [MantleErrorType.BRIDGE_UNAVAILABLE]: FallbackStrategy.FALLBACK_TO_CIRCLE,
      [MantleErrorType.CONTRACT_CALL_FAILED]: FallbackStrategy.FALLBACK_TO_CIRCLE,
      [MantleErrorType.SLIPPAGE_EXCEEDED]: FallbackStrategy.RETRY_WITH_DELAY,
      [MantleErrorType.SERVICE_DISABLED]: FallbackStrategy.FALLBACK_TO_CIRCLE,
      [MantleErrorType.SERVICE_NOT_INITIALIZED]: FallbackStrategy.FALLBACK_TO_CIRCLE,
      [MantleErrorType.CONFIGURATION_ERROR]: FallbackStrategy.FALLBACK_TO_CIRCLE,
      [MantleErrorType.UNKNOWN_ERROR]: FallbackStrategy.FALLBACK_TO_CIRCLE
    };

    return strategies[errorType] || FallbackStrategy.FALLBACK_TO_CIRCLE;
  }

  /**
   * Create retry configuration for specific error type
   */
  static createRetryConfig(errorType: MantleErrorType): RetryConfig {
    const configs: Partial<Record<MantleErrorType, RetryConfig>> = {
      [MantleErrorType.NETWORK_CONGESTION]: {
        maxAttempts: 3,
        baseDelay: 5000,
        backoffMultiplier: 2,
        maxDelay: 30000,
        jitter: true
      },
      [MantleErrorType.NETWORK_TIMEOUT]: {
        maxAttempts: 2,
        baseDelay: 3000,
        backoffMultiplier: 1.5,
        maxDelay: 15000,
        jitter: true
      },
      [MantleErrorType.RPC_CONNECTION_FAILED]: {
        maxAttempts: 2,
        baseDelay: 2000,
        backoffMultiplier: 2,
        maxDelay: 10000,
        jitter: true
      },
      [MantleErrorType.INSUFFICIENT_GAS]: {
        maxAttempts: 2,
        baseDelay: 1000,
        backoffMultiplier: 1,
        maxDelay: 5000,
        jitter: false
      },
      [MantleErrorType.GAS_PRICE_TOO_LOW]: {
        maxAttempts: 2,
        baseDelay: 1000,
        backoffMultiplier: 1,
        maxDelay: 5000,
        jitter: false
      },
      [MantleErrorType.TRANSACTION_UNDERPRICED]: {
        maxAttempts: 2,
        baseDelay: 1000,
        backoffMultiplier: 1,
        maxDelay: 5000,
        jitter: false
      },
      [MantleErrorType.NONCE_TOO_LOW]: {
        maxAttempts: 2,
        baseDelay: 1000,
        backoffMultiplier: 1,
        maxDelay: 3000,
        jitter: false
      },
      [MantleErrorType.NONCE_TOO_HIGH]: {
        maxAttempts: 2,
        baseDelay: 1000,
        backoffMultiplier: 1,
        maxDelay: 3000,
        jitter: false
      },
      [MantleErrorType.SLIPPAGE_EXCEEDED]: {
        maxAttempts: 2,
        baseDelay: 2000,
        backoffMultiplier: 1,
        maxDelay: 5000,
        jitter: false
      }
    };

    return configs[errorType] || MantleRetryHandler.DEFAULT_RETRY_CONFIG;
  }
}