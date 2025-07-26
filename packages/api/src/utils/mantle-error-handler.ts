/**
 * Mantle-specific error types and handling utilities
 * Provides comprehensive error classification, fallback strategies, and user-friendly messages
 */

/**
 * Enum for different types of Mantle-specific errors
 */
export enum MantleErrorType {
  // Network-related errors
  NETWORK_CONGESTION = 'NETWORK_CONGESTION',
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',
  RPC_CONNECTION_FAILED = 'RPC_CONNECTION_FAILED',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  
  // Gas-related errors
  INSUFFICIENT_GAS = 'INSUFFICIENT_GAS',
  GAS_PRICE_TOO_LOW = 'GAS_PRICE_TOO_LOW',
  GAS_LIMIT_EXCEEDED = 'GAS_LIMIT_EXCEEDED',
  
  // Transaction-related errors
  TRANSACTION_TIMEOUT = 'TRANSACTION_TIMEOUT',
  TRANSACTION_REVERTED = 'TRANSACTION_REVERTED',
  TRANSACTION_UNDERPRICED = 'TRANSACTION_UNDERPRICED',
  NONCE_TOO_LOW = 'NONCE_TOO_LOW',
  NONCE_TOO_HIGH = 'NONCE_TOO_HIGH',
  
  // Wallet-related errors
  WALLET_CREATION_FAILED = 'WALLET_CREATION_FAILED',
  INVALID_PRIVATE_KEY = 'INVALID_PRIVATE_KEY',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  
  // Bridge and contract errors
  BRIDGE_UNAVAILABLE = 'BRIDGE_UNAVAILABLE',
  CONTRACT_CALL_FAILED = 'CONTRACT_CALL_FAILED',
  SLIPPAGE_EXCEEDED = 'SLIPPAGE_EXCEEDED',
  
  // Service-related errors
  SERVICE_DISABLED = 'SERVICE_DISABLED',
  SERVICE_NOT_INITIALIZED = 'SERVICE_NOT_INITIALIZED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Unknown/generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Fallback strategy options for different error types
 */
export enum FallbackStrategy {
  RETRY_WITH_HIGHER_GAS = 'RETRY_WITH_HIGHER_GAS',
  RETRY_WITH_DELAY = 'RETRY_WITH_DELAY',
  FALLBACK_TO_CIRCLE = 'FALLBACK_TO_CIRCLE',
  QUEUE_FOR_LATER = 'QUEUE_FOR_LATER',
  MANUAL_INTERVENTION = 'MANUAL_INTERVENTION',
  ABORT_TRANSACTION = 'ABORT_TRANSACTION'
}

/**
 * Retry configuration for different error types
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // in milliseconds
  backoffMultiplier: number;
  maxDelay: number; // in milliseconds
  jitter: boolean; // add random jitter to prevent thundering herd
}

/**
 * Fallback configuration for error handling
 */
export interface FallbackConfig {
  strategy: FallbackStrategy;
  retryConfig?: RetryConfig;
  fallbackToCircle: boolean;
  userNotification: boolean;
  logLevel: 'error' | 'warn' | 'info';
}

/**
 * Custom error class for Mantle-specific errors
 */
export class MantleError extends Error {
  public readonly type: MantleErrorType;
  public readonly retryable: boolean;
  public readonly fallbackToCircle: boolean;
  public readonly userMessage: string;
  public readonly technicalDetails: string;
  public readonly suggestedAction: string;
  public readonly fallbackConfig: FallbackConfig;
  public readonly originalError?: Error;
  public readonly context?: Record<string, any>;

  constructor(
    type: MantleErrorType,
    message: string,
    options: {
      retryable?: boolean;
      fallbackToCircle?: boolean;
      userMessage?: string;
      technicalDetails?: string;
      suggestedAction?: string;
      originalError?: Error;
      context?: Record<string, any>;
    } = {}
  ) {
    super(message);
    this.name = 'MantleError';
    this.type = type;
    this.retryable = options.retryable ?? this.getDefaultRetryable(type);
    this.fallbackToCircle = options.fallbackToCircle ?? this.getDefaultFallbackToCircle(type);
    this.userMessage = options.userMessage ?? this.generateUserMessage(type);
    this.technicalDetails = options.technicalDetails ?? message;
    this.suggestedAction = options.suggestedAction ?? this.generateSuggestedAction(type);
    this.fallbackConfig = this.getFallbackConfig(type);
    this.originalError = options.originalError;
    this.context = options.context;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MantleError);
    }
  }

  /**
   * Get default retry behavior for error type
   */
  private getDefaultRetryable(type: MantleErrorType): boolean {
    const retryableErrors = [
      MantleErrorType.NETWORK_CONGESTION,
      MantleErrorType.NETWORK_TIMEOUT,
      MantleErrorType.RPC_CONNECTION_FAILED,
      MantleErrorType.GAS_PRICE_TOO_LOW,
      MantleErrorType.TRANSACTION_UNDERPRICED,
      MantleErrorType.NONCE_TOO_LOW,
      MantleErrorType.TRANSACTION_TIMEOUT
    ];
    return retryableErrors.includes(type);
  }

  /**
   * Get default fallback to Circle behavior for error type
   */
  private getDefaultFallbackToCircle(type: MantleErrorType): boolean {
    const fallbackErrors = [
      MantleErrorType.NETWORK_UNAVAILABLE,
      MantleErrorType.SERVICE_DISABLED,
      MantleErrorType.SERVICE_NOT_INITIALIZED,
      MantleErrorType.BRIDGE_UNAVAILABLE,
      MantleErrorType.CONFIGURATION_ERROR
    ];
    return fallbackErrors.includes(type);
  }

  /**
   * Generate user-friendly error message
   */
  private generateUserMessage(type: MantleErrorType): string {
    const messages: Record<MantleErrorType, string> = {
      [MantleErrorType.NETWORK_CONGESTION]: 'The blockchain network is currently busy. We\'ll try again shortly or you can use our traditional transfer method.',
      [MantleErrorType.NETWORK_UNAVAILABLE]: 'The blockchain network is temporarily unavailable. We\'ve automatically switched to our traditional transfer method.',
      [MantleErrorType.RPC_CONNECTION_FAILED]: 'Unable to connect to the blockchain network. We\'ll retry automatically or switch to traditional transfer.',
      [MantleErrorType.NETWORK_TIMEOUT]: 'The blockchain network is responding slowly. We\'ll try again with optimized settings.',
      
      [MantleErrorType.INSUFFICIENT_GAS]: 'Transaction fees are higher than expected. We\'ll adjust the fee and try again.',
      [MantleErrorType.GAS_PRICE_TOO_LOW]: 'Network fees were set too low. We\'re retrying with updated fees.',
      [MantleErrorType.GAS_LIMIT_EXCEEDED]: 'This transaction requires more processing power than available. Switching to traditional transfer.',
      
      [MantleErrorType.TRANSACTION_TIMEOUT]: 'Your transaction is taking longer than expected. We\'ll monitor it and update you shortly.',
      [MantleErrorType.TRANSACTION_REVERTED]: 'The blockchain transaction was rejected. We\'re switching to our traditional transfer method.',
      [MantleErrorType.TRANSACTION_UNDERPRICED]: 'Transaction fees were too low for current network conditions. Retrying with higher fees.',
      [MantleErrorType.NONCE_TOO_LOW]: 'Transaction ordering issue detected. We\'ll retry with corrected parameters.',
      [MantleErrorType.NONCE_TOO_HIGH]: 'Transaction sequencing error. We\'ll retry with corrected parameters.',
      
      [MantleErrorType.WALLET_CREATION_FAILED]: 'Unable to create blockchain wallet. We\'ll use our traditional transfer method instead.',
      [MantleErrorType.INVALID_PRIVATE_KEY]: 'Wallet authentication failed. Please contact support if this persists.',
      [MantleErrorType.INSUFFICIENT_BALANCE]: 'Insufficient funds for blockchain fees. We\'ll switch to traditional transfer.',
      [MantleErrorType.INVALID_ADDRESS]: 'Invalid wallet address provided. Please check the recipient details.',
      
      [MantleErrorType.BRIDGE_UNAVAILABLE]: 'Blockchain bridge is temporarily unavailable. Using traditional transfer method.',
      [MantleErrorType.CONTRACT_CALL_FAILED]: 'Smart contract interaction failed. Switching to traditional transfer.',
      [MantleErrorType.SLIPPAGE_EXCEEDED]: 'Exchange rate changed during transaction. We\'ll retry with updated rates.',
      
      [MantleErrorType.SERVICE_DISABLED]: 'Blockchain transfers are temporarily disabled. Using traditional transfer method.',
      [MantleErrorType.SERVICE_NOT_INITIALIZED]: 'Blockchain service is starting up. We\'ll use traditional transfer for now.',
      [MantleErrorType.CONFIGURATION_ERROR]: 'System configuration issue detected. Using traditional transfer method.',
      
      [MantleErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred. We\'ll try again or use our traditional transfer method.'
    };

    return messages[type] || 'An error occurred with the blockchain transfer. We\'ll handle this automatically.';
  }

  /**
   * Generate suggested action for error type
   */
  private generateSuggestedAction(type: MantleErrorType): string {
    const actions: Record<MantleErrorType, string> = {
      [MantleErrorType.NETWORK_CONGESTION]: 'Wait for network congestion to clear or use Circle transfer',
      [MantleErrorType.NETWORK_UNAVAILABLE]: 'Automatically fallback to Circle transfer',
      [MantleErrorType.RPC_CONNECTION_FAILED]: 'Retry connection or fallback to Circle',
      [MantleErrorType.NETWORK_TIMEOUT]: 'Retry with increased timeout',
      
      [MantleErrorType.INSUFFICIENT_GAS]: 'Retry with higher gas price',
      [MantleErrorType.GAS_PRICE_TOO_LOW]: 'Retry with current network gas price',
      [MantleErrorType.GAS_LIMIT_EXCEEDED]: 'Fallback to Circle transfer',
      
      [MantleErrorType.TRANSACTION_TIMEOUT]: 'Monitor transaction status and retry if needed',
      [MantleErrorType.TRANSACTION_REVERTED]: 'Fallback to Circle transfer',
      [MantleErrorType.TRANSACTION_UNDERPRICED]: 'Retry with higher gas price',
      [MantleErrorType.NONCE_TOO_LOW]: 'Retry with corrected nonce',
      [MantleErrorType.NONCE_TOO_HIGH]: 'Retry with corrected nonce',
      
      [MantleErrorType.WALLET_CREATION_FAILED]: 'Fallback to Circle transfer',
      [MantleErrorType.INVALID_PRIVATE_KEY]: 'Contact support',
      [MantleErrorType.INSUFFICIENT_BALANCE]: 'Fallback to Circle transfer',
      [MantleErrorType.INVALID_ADDRESS]: 'Validate recipient address',
      
      [MantleErrorType.BRIDGE_UNAVAILABLE]: 'Fallback to Circle transfer',
      [MantleErrorType.CONTRACT_CALL_FAILED]: 'Fallback to Circle transfer',
      [MantleErrorType.SLIPPAGE_EXCEEDED]: 'Retry with updated exchange rates',
      
      [MantleErrorType.SERVICE_DISABLED]: 'Use Circle transfer',
      [MantleErrorType.SERVICE_NOT_INITIALIZED]: 'Wait for initialization or use Circle',
      [MantleErrorType.CONFIGURATION_ERROR]: 'Contact support',
      
      [MantleErrorType.UNKNOWN_ERROR]: 'Retry or fallback to Circle transfer'
    };

    return actions[type] || 'Contact support if the issue persists';
  }

  /**
   * Get fallback configuration for error type
   */
  private getFallbackConfig(type: MantleErrorType): FallbackConfig {
    const configs: Record<MantleErrorType, FallbackConfig> = {
      [MantleErrorType.NETWORK_CONGESTION]: {
        strategy: FallbackStrategy.RETRY_WITH_DELAY,
        retryConfig: { maxAttempts: 3, baseDelay: 5000, backoffMultiplier: 2, maxDelay: 30000, jitter: true },
        fallbackToCircle: true,
        userNotification: true,
        logLevel: 'warn'
      },
      [MantleErrorType.NETWORK_UNAVAILABLE]: {
        strategy: FallbackStrategy.FALLBACK_TO_CIRCLE,
        fallbackToCircle: true,
        userNotification: true,
        logLevel: 'error'
      },
      [MantleErrorType.RPC_CONNECTION_FAILED]: {
        strategy: FallbackStrategy.RETRY_WITH_DELAY,
        retryConfig: { maxAttempts: 2, baseDelay: 2000, backoffMultiplier: 2, maxDelay: 10000, jitter: true },
        fallbackToCircle: true,
        userNotification: false,
        logLevel: 'warn'
      },
      [MantleErrorType.NETWORK_TIMEOUT]: {
        strategy: FallbackStrategy.RETRY_WITH_DELAY,
        retryConfig: { maxAttempts: 2, baseDelay: 3000, backoffMultiplier: 1.5, maxDelay: 15000, jitter: true },
        fallbackToCircle: true,
        userNotification: false,
        logLevel: 'warn'
      },
      
      [MantleErrorType.INSUFFICIENT_GAS]: {
        strategy: FallbackStrategy.RETRY_WITH_HIGHER_GAS,
        retryConfig: { maxAttempts: 2, baseDelay: 1000, backoffMultiplier: 1, maxDelay: 5000, jitter: false },
        fallbackToCircle: true,
        userNotification: true,
        logLevel: 'warn'
      },
      [MantleErrorType.GAS_PRICE_TOO_LOW]: {
        strategy: FallbackStrategy.RETRY_WITH_HIGHER_GAS,
        retryConfig: { maxAttempts: 2, baseDelay: 1000, backoffMultiplier: 1, maxDelay: 5000, jitter: false },
        fallbackToCircle: true,
        userNotification: false,
        logLevel: 'info'
      },
      [MantleErrorType.GAS_LIMIT_EXCEEDED]: {
        strategy: FallbackStrategy.FALLBACK_TO_CIRCLE,
        fallbackToCircle: true,
        userNotification: true,
        logLevel: 'warn'
      },
      
      [MantleErrorType.TRANSACTION_TIMEOUT]: {
        strategy: FallbackStrategy.QUEUE_FOR_LATER,
        retryConfig: { maxAttempts: 1, baseDelay: 60000, backoffMultiplier: 1, maxDelay: 60000, jitter: false },
        fallbackToCircle: true,
        userNotification: true,
        logLevel: 'warn'
      },
      [MantleErrorType.TRANSACTION_REVERTED]: {
        strategy: FallbackStrategy.FALLBACK_TO_CIRCLE,
        fallbackToCircle: true,
        userNotification: true,
        logLevel: 'error'
      },
      [MantleErrorType.TRANSACTION_UNDERPRICED]: {
        strategy: FallbackStrategy.RETRY_WITH_HIGHER_GAS,
        retryConfig: { maxAttempts: 2, baseDelay: 1000, backoffMultiplier: 1, maxDelay: 5000, jitter: false },
        fallbackToCircle: true,
        userNotification: false,
        logLevel: 'info'
      },
      [MantleErrorType.NONCE_TOO_LOW]: {
        strategy: FallbackStrategy.RETRY_WITH_DELAY,
        retryConfig: { maxAttempts: 2, baseDelay: 1000, backoffMultiplier: 1, maxDelay: 3000, jitter: false },
        fallbackToCircle: false,
        userNotification: false,
        logLevel: 'info'
      },
      [MantleErrorType.NONCE_TOO_HIGH]: {
        strategy: FallbackStrategy.RETRY_WITH_DELAY,
        retryConfig: { maxAttempts: 2, baseDelay: 1000, backoffMultiplier: 1, maxDelay: 3000, jitter: false },
        fallbackToCircle: false,
        userNotification: false,
        logLevel: 'info'
      },
      
      [MantleErrorType.WALLET_CREATION_FAILED]: {
        strategy: FallbackStrategy.FALLBACK_TO_CIRCLE,
        fallbackToCircle: true,
        userNotification: true,
        logLevel: 'error'
      },
      [MantleErrorType.INVALID_PRIVATE_KEY]: {
        strategy: FallbackStrategy.MANUAL_INTERVENTION,
        fallbackToCircle: false,
        userNotification: true,
        logLevel: 'error'
      },
      [MantleErrorType.INSUFFICIENT_BALANCE]: {
        strategy: FallbackStrategy.FALLBACK_TO_CIRCLE,
        fallbackToCircle: true,
        userNotification: true,
        logLevel: 'warn'
      },
      [MantleErrorType.INVALID_ADDRESS]: {
        strategy: FallbackStrategy.ABORT_TRANSACTION,
        fallbackToCircle: false,
        userNotification: true,
        logLevel: 'error'
      },
      
      [MantleErrorType.BRIDGE_UNAVAILABLE]: {
        strategy: FallbackStrategy.FALLBACK_TO_CIRCLE,
        fallbackToCircle: true,
        userNotification: true,
        logLevel: 'warn'
      },
      [MantleErrorType.CONTRACT_CALL_FAILED]: {
        strategy: FallbackStrategy.FALLBACK_TO_CIRCLE,
        fallbackToCircle: true,
        userNotification: true,
        logLevel: 'error'
      },
      [MantleErrorType.SLIPPAGE_EXCEEDED]: {
        strategy: FallbackStrategy.RETRY_WITH_DELAY,
        retryConfig: { maxAttempts: 2, baseDelay: 2000, backoffMultiplier: 1, maxDelay: 5000, jitter: false },
        fallbackToCircle: true,
        userNotification: true,
        logLevel: 'warn'
      },
      
      [MantleErrorType.SERVICE_DISABLED]: {
        strategy: FallbackStrategy.FALLBACK_TO_CIRCLE,
        fallbackToCircle: true,
        userNotification: true,
        logLevel: 'info'
      },
      [MantleErrorType.SERVICE_NOT_INITIALIZED]: {
        strategy: FallbackStrategy.FALLBACK_TO_CIRCLE,
        fallbackToCircle: true,
        userNotification: false,
        logLevel: 'warn'
      },
      [MantleErrorType.CONFIGURATION_ERROR]: {
        strategy: FallbackStrategy.FALLBACK_TO_CIRCLE,
        fallbackToCircle: true,
        userNotification: true,
        logLevel: 'error'
      },
      
      [MantleErrorType.UNKNOWN_ERROR]: {
        strategy: FallbackStrategy.FALLBACK_TO_CIRCLE,
        fallbackToCircle: true,
        userNotification: true,
        logLevel: 'error'
      }
    };

    return configs[type] || configs[MantleErrorType.UNKNOWN_ERROR];
  }

  /**
   * Convert to JSON for logging and debugging
   */
  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      userMessage: this.userMessage,
      technicalDetails: this.technicalDetails,
      suggestedAction: this.suggestedAction,
      retryable: this.retryable,
      fallbackToCircle: this.fallbackToCircle,
      fallbackConfig: this.fallbackConfig,
      context: this.context,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }
}

/**
 * Error classification utility to convert generic errors to MantleError
 */
export class MantleErrorClassifier {
  /**
   * Classify a generic error into a specific MantleError
   */
  static classify(error: Error | any, context?: Record<string, any>): MantleError {
    if (error instanceof MantleError) {
      return error;
    }

    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;
    const errorReason = error?.reason;

    // Network-related errors
    if (this.isNetworkError(errorMessage, errorCode)) {
      return new MantleError(MantleErrorType.NETWORK_UNAVAILABLE, errorMessage, {
        originalError: error,
        context,
        technicalDetails: `Network error: ${errorMessage}`
      });
    }

    if (this.isTimeoutError(errorMessage, errorCode)) {
      return new MantleError(MantleErrorType.NETWORK_TIMEOUT, errorMessage, {
        originalError: error,
        context,
        technicalDetails: `Timeout error: ${errorMessage}`
      });
    }

    if (this.isConnectionError(errorMessage, errorCode)) {
      return new MantleError(MantleErrorType.RPC_CONNECTION_FAILED, errorMessage, {
        originalError: error,
        context,
        technicalDetails: `Connection error: ${errorMessage}`
      });
    }

    // Gas-related errors
    if (this.isInsufficientGasError(errorMessage, errorCode, errorReason)) {
      return new MantleError(MantleErrorType.INSUFFICIENT_GAS, errorMessage, {
        originalError: error,
        context,
        technicalDetails: `Gas error: ${errorMessage}`
      });
    }

    if (this.isGasPriceTooLowError(errorMessage, errorCode, errorReason)) {
      return new MantleError(MantleErrorType.GAS_PRICE_TOO_LOW, errorMessage, {
        originalError: error,
        context,
        technicalDetails: `Gas price error: ${errorMessage}`
      });
    }

    if (this.isUnderpricedError(errorMessage, errorCode, errorReason)) {
      return new MantleError(MantleErrorType.TRANSACTION_UNDERPRICED, errorMessage, {
        originalError: error,
        context,
        technicalDetails: `Underpriced transaction: ${errorMessage}`
      });
    }

    // Transaction-related errors
    if (this.isTransactionRevertedError(errorMessage, errorCode, errorReason)) {
      return new MantleError(MantleErrorType.TRANSACTION_REVERTED, errorMessage, {
        originalError: error,
        context,
        technicalDetails: `Transaction reverted: ${errorMessage}`
      });
    }

    if (this.isNonceError(errorMessage, errorCode, errorReason)) {
      const isNonceTooLow = errorMessage.toLowerCase().includes('nonce too low') || 
                           errorMessage.toLowerCase().includes('nonce is too low');
      
      return new MantleError(
        isNonceTooLow ? MantleErrorType.NONCE_TOO_LOW : MantleErrorType.NONCE_TOO_HIGH,
        errorMessage,
        {
          originalError: error,
          context,
          technicalDetails: `Nonce error: ${errorMessage}`
        }
      );
    }

    // Balance-related errors
    if (this.isInsufficientBalanceError(errorMessage, errorCode, errorReason)) {
      return new MantleError(MantleErrorType.INSUFFICIENT_BALANCE, errorMessage, {
        originalError: error,
        context,
        technicalDetails: `Insufficient balance: ${errorMessage}`
      });
    }

    // Address-related errors
    if (this.isInvalidAddressError(errorMessage, errorCode)) {
      return new MantleError(MantleErrorType.INVALID_ADDRESS, errorMessage, {
        originalError: error,
        context,
        technicalDetails: `Invalid address: ${errorMessage}`
      });
    }

    // Default to unknown error
    return new MantleError(MantleErrorType.UNKNOWN_ERROR, errorMessage, {
      originalError: error,
      context,
      technicalDetails: `Unknown error: ${errorMessage}`
    });
  }

  private static isNetworkError(message: string, code?: string | number): boolean {
    const networkPatterns = [
      'network error',
      'network is down',
      'network unavailable',
      'connection refused',
      'econnrefused',
      'network timeout'
    ];
    
    const networkCodes = ['NETWORK_ERROR', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'];
    
    const messageMatch = networkPatterns.some(pattern => message.toLowerCase().includes(pattern));
    const codeMatch = code ? networkCodes.includes(String(code).toUpperCase()) : false;
    
    return messageMatch || codeMatch;
  }

  private static isTimeoutError(message: string, code?: string | number): boolean {
    const timeoutPatterns = [
      'timeout',
      'timed out',
      'request timeout',
      'connection timeout'
    ];
    
    const timeoutCodes = ['TIMEOUT', 'ETIMEDOUT', 'REQUEST_TIMEOUT'];
    
    const messageMatch = timeoutPatterns.some(pattern => message.toLowerCase().includes(pattern));
    const codeMatch = code ? timeoutCodes.includes(String(code).toUpperCase()) : false;
    
    return messageMatch || codeMatch;
  }

  private static isConnectionError(message: string, code?: string | number): boolean {
    const connectionPatterns = [
      'connection failed',
      'connection error',
      'could not connect',
      'unable to connect',
      'connection refused'
    ];
    
    return connectionPatterns.some(pattern => message.toLowerCase().includes(pattern));
  }

  private static isInsufficientGasError(message: string, code?: string | number, reason?: string): boolean {
    const gasPatterns = [
      'insufficient gas',
      'out of gas',
      'gas required exceeds allowance',
      'intrinsic gas too low'
    ];
    
    return gasPatterns.some(pattern => 
      message.toLowerCase().includes(pattern) || 
      (reason && reason.toLowerCase().includes(pattern))
    );
  }

  private static isGasPriceTooLowError(message: string, code?: string | number, reason?: string): boolean {
    const gasPricePatterns = [
      'gas price too low',
      'gas price below minimum',
      'transaction underpriced'
    ];
    
    return gasPricePatterns.some(pattern => 
      message.toLowerCase().includes(pattern) || 
      (reason && reason.toLowerCase().includes(pattern))
    );
  }

  private static isUnderpricedError(message: string, code?: string | number, reason?: string): boolean {
    const underpricedPatterns = [
      'underpriced',
      'transaction underpriced',
      'replacement transaction underpriced'
    ];
    
    return underpricedPatterns.some(pattern => 
      message.toLowerCase().includes(pattern) || 
      (reason && reason.toLowerCase().includes(pattern))
    );
  }

  private static isTransactionRevertedError(message: string, code?: string | number, reason?: string): boolean {
    const revertPatterns = [
      'transaction reverted',
      'execution reverted',
      'revert',
      'transaction failed'
    ];
    
    return revertPatterns.some(pattern => 
      message.toLowerCase().includes(pattern) || 
      (reason && reason.toLowerCase().includes(pattern))
    );
  }

  private static isNonceError(message: string, code?: string | number, reason?: string): boolean {
    const noncePatterns = [
      'nonce too low',
      'nonce too high',
      'invalid nonce',
      'nonce is too low',
      'nonce is too high'
    ];
    
    return noncePatterns.some(pattern => 
      message.toLowerCase().includes(pattern) || 
      (reason && reason.toLowerCase().includes(pattern))
    );
  }

  private static isInsufficientBalanceError(message: string, code?: string | number, reason?: string): boolean {
    const balancePatterns = [
      'insufficient balance',
      'insufficient funds',
      'balance too low',
      'not enough balance'
    ];
    
    return balancePatterns.some(pattern => 
      message.toLowerCase().includes(pattern) || 
      (reason && reason.toLowerCase().includes(pattern))
    );
  }

  private static isInvalidAddressError(message: string, code?: string | number): boolean {
    const addressPatterns = [
      'invalid address',
      'bad address',
      'malformed address',
      'invalid recipient',
      'invalid sender'
    ];
    
    return addressPatterns.some(pattern => message.toLowerCase().includes(pattern));
  }
}