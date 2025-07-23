"use strict";
/**
 * Comprehensive error handling system for Circle API operations
 * Provides standardized error types, user-friendly messages, and retry mechanisms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircleRetryHandler = exports.CircleErrorHandler = exports.CircleError = exports.CircleErrorCode = void 0;
/**
 * Standard error codes for Circle API operations
 */
var CircleErrorCode;
(function (CircleErrorCode) {
    // Payment errors
    CircleErrorCode["PAYMENT_FAILED"] = "PAYMENT_FAILED";
    CircleErrorCode["CARD_DECLINED"] = "CARD_DECLINED";
    CircleErrorCode["INSUFFICIENT_FUNDS"] = "INSUFFICIENT_FUNDS";
    CircleErrorCode["CARD_EXPIRED"] = "CARD_EXPIRED";
    CircleErrorCode["INVALID_CARD"] = "INVALID_CARD";
    CircleErrorCode["PAYMENT_TIMEOUT"] = "PAYMENT_TIMEOUT";
    CircleErrorCode["THREE_D_SECURE_FAILED"] = "THREE_D_SECURE_FAILED";
    // Wallet errors
    CircleErrorCode["WALLET_CREATION_FAILED"] = "WALLET_CREATION_FAILED";
    CircleErrorCode["WALLET_NOT_FOUND"] = "WALLET_NOT_FOUND";
    CircleErrorCode["WALLET_FROZEN"] = "WALLET_FROZEN";
    CircleErrorCode["INSUFFICIENT_WALLET_BALANCE"] = "INSUFFICIENT_WALLET_BALANCE";
    // Transfer errors
    CircleErrorCode["TRANSFER_FAILED"] = "TRANSFER_FAILED";
    CircleErrorCode["TRANSFER_TIMEOUT"] = "TRANSFER_TIMEOUT";
    CircleErrorCode["INVALID_TRANSFER_AMOUNT"] = "INVALID_TRANSFER_AMOUNT";
    // Payout errors
    CircleErrorCode["PAYOUT_FAILED"] = "PAYOUT_FAILED";
    CircleErrorCode["PAYOUT_TIMEOUT"] = "PAYOUT_TIMEOUT";
    CircleErrorCode["INVALID_BANK_DETAILS"] = "INVALID_BANK_DETAILS";
    CircleErrorCode["BANK_REJECTED"] = "BANK_REJECTED";
    CircleErrorCode["COMPLIANCE_HOLD"] = "COMPLIANCE_HOLD";
    // Network and API errors
    CircleErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    CircleErrorCode["API_RATE_LIMITED"] = "API_RATE_LIMITED";
    CircleErrorCode["API_UNAVAILABLE"] = "API_UNAVAILABLE";
    CircleErrorCode["AUTHENTICATION_FAILED"] = "AUTHENTICATION_FAILED";
    // General errors
    CircleErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    CircleErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
})(CircleErrorCode || (exports.CircleErrorCode = CircleErrorCode = {}));
/**
 * Circle API error with enhanced information
 */
class CircleError extends Error {
    constructor(code, message, userMessage, retryable = false, retryAfter, details, originalError) {
        super(message);
        this.name = 'CircleError';
        this.code = code;
        this.userMessage = userMessage;
        this.retryable = retryable;
        this.retryAfter = retryAfter;
        this.details = details;
        this.originalError = originalError;
    }
    /**
     * Convert to API response format
     */
    toApiResponse() {
        return {
            error: {
                code: this.code,
                message: this.userMessage,
                details: this.details,
                retryable: this.retryable,
                retryAfter: this.retryAfter
            }
        };
    }
}
exports.CircleError = CircleError;
/**
 * Error handler for Circle API operations
 */
class CircleErrorHandler {
    /**
     * Parse and handle Circle API errors
     */
    static handleError(error, operation) {
        console.error(`Circle API error during ${operation}:`, error);
        // Handle network errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
            throw new CircleError(CircleErrorCode.NETWORK_ERROR, `Network error during ${operation}: ${error.message}`, 'Unable to connect to payment service. Please check your internet connection and try again.', true, 30);
        }
        // Handle Circle API response errors
        if (error.response?.data) {
            return this.handleCircleApiError(error.response.data, operation, error);
        }
        // Handle HTTP status errors
        if (error.response?.status) {
            return this.handleHttpStatusError(error.response.status, operation, error);
        }
        // Handle timeout errors
        if (error.message?.includes('timeout')) {
            const errorCode = operation.includes('payment') ? CircleErrorCode.PAYMENT_TIMEOUT :
                operation.includes('transfer') ? CircleErrorCode.TRANSFER_TIMEOUT :
                    operation.includes('payout') ? CircleErrorCode.PAYOUT_TIMEOUT :
                        CircleErrorCode.NETWORK_ERROR;
            throw new CircleError(errorCode, `Timeout during ${operation}: ${error.message}`, 'The operation is taking longer than expected. Please try again.', true, 60);
        }
        // Handle validation errors
        if (error.message?.includes('Invalid') || error.message?.includes('required')) {
            throw new CircleError(CircleErrorCode.VALIDATION_ERROR, `Validation error during ${operation}: ${error.message}`, error.message, false, undefined, undefined, error);
        }
        // Default unknown error
        throw new CircleError(CircleErrorCode.UNKNOWN_ERROR, `Unknown error during ${operation}: ${error.message}`, 'An unexpected error occurred. Please try again or contact support if the problem persists.', true, 30, undefined, error);
    }
    /**
     * Handle specific Circle API error responses
     */
    static handleCircleApiError(errorData, operation, originalError) {
        const errorCode = errorData.code || errorData.error?.code;
        const errorMessage = errorData.message || errorData.error?.message || 'Unknown Circle API error';
        // Payment-specific errors
        if (operation.includes('payment')) {
            switch (errorCode) {
                case 'payment_failed':
                case 'payment_declined':
                    throw new CircleError(CircleErrorCode.CARD_DECLINED, `Payment declined: ${errorMessage}`, 'Your payment was declined. Please check your card details and try again, or use a different payment method.', false, undefined, { errorCode, originalMessage: errorMessage }, originalError);
                case 'insufficient_funds':
                    throw new CircleError(CircleErrorCode.INSUFFICIENT_FUNDS, `Insufficient funds: ${errorMessage}`, 'Your card has insufficient funds for this transaction. Please use a different payment method.', false, undefined, { errorCode, originalMessage: errorMessage }, originalError);
                case 'card_expired':
                    throw new CircleError(CircleErrorCode.CARD_EXPIRED, `Card expired: ${errorMessage}`, 'Your card has expired. Please use a different payment method.', false, undefined, { errorCode, originalMessage: errorMessage }, originalError);
                case 'three_d_secure_failed':
                    throw new CircleError(CircleErrorCode.THREE_D_SECURE_FAILED, `3D Secure authentication failed: ${errorMessage}`, 'Card authentication failed. Please try again or use a different payment method.', true, 60, { errorCode, originalMessage: errorMessage }, originalError);
            }
        }
        // Wallet-specific errors
        if (operation.includes('wallet')) {
            switch (errorCode) {
                case 'wallet_not_found':
                    throw new CircleError(CircleErrorCode.WALLET_NOT_FOUND, `Wallet not found: ${errorMessage}`, 'Wallet not found. Please contact support.', false, undefined, { errorCode, originalMessage: errorMessage }, originalError);
                case 'wallet_frozen':
                    throw new CircleError(CircleErrorCode.WALLET_FROZEN, `Wallet frozen: ${errorMessage}`, 'Your wallet is temporarily frozen. Please contact support.', false, undefined, { errorCode, originalMessage: errorMessage }, originalError);
                case 'insufficient_balance':
                    throw new CircleError(CircleErrorCode.INSUFFICIENT_WALLET_BALANCE, `Insufficient wallet balance: ${errorMessage}`, 'Insufficient balance in wallet. Please add funds and try again.', false, undefined, { errorCode, originalMessage: errorMessage }, originalError);
            }
        }
        // Payout-specific errors
        if (operation.includes('payout')) {
            switch (errorCode) {
                case 'invalid_bank_details':
                case 'invalid_iban':
                case 'invalid_bic':
                    throw new CircleError(CircleErrorCode.INVALID_BANK_DETAILS, `Invalid bank details: ${errorMessage}`, 'The bank account details are invalid. Please check and correct the information.', false, undefined, { errorCode, originalMessage: errorMessage }, originalError);
                case 'bank_rejected':
                    throw new CircleError(CircleErrorCode.BANK_REJECTED, `Bank rejected transfer: ${errorMessage}`, 'The receiving bank rejected the transfer. Please verify the account details and try again.', true, 300, // 5 minutes
                    { errorCode, originalMessage: errorMessage }, originalError);
                case 'compliance_hold':
                    throw new CircleError(CircleErrorCode.COMPLIANCE_HOLD, `Transfer under compliance review: ${errorMessage}`, 'Your transfer is under review for compliance. You will be notified once the review is complete.', false, undefined, { errorCode, originalMessage: errorMessage }, originalError);
            }
        }
        // Rate limiting
        if (errorCode === 'rate_limited' || errorCode === 'too_many_requests') {
            throw new CircleError(CircleErrorCode.API_RATE_LIMITED, `Rate limited: ${errorMessage}`, 'Too many requests. Please wait a moment and try again.', true, 60, { errorCode, originalMessage: errorMessage }, originalError);
        }
        // Authentication errors
        if (errorCode === 'unauthorized' || errorCode === 'authentication_failed') {
            throw new CircleError(CircleErrorCode.AUTHENTICATION_FAILED, `Authentication failed: ${errorMessage}`, 'Authentication failed. Please contact support.', false, undefined, { errorCode, originalMessage: errorMessage }, originalError);
        }
        // Default Circle API error
        throw new CircleError(CircleErrorCode.UNKNOWN_ERROR, `Circle API error during ${operation}: ${errorMessage}`, 'A payment service error occurred. Please try again or contact support if the problem persists.', true, 30, { errorCode, originalMessage: errorMessage }, originalError);
    }
    /**
     * Handle HTTP status errors
     */
    static handleHttpStatusError(status, operation, originalError) {
        switch (status) {
            case 400:
                throw new CircleError(CircleErrorCode.VALIDATION_ERROR, `Bad request during ${operation}`, 'Invalid request. Please check your input and try again.', false, undefined, { httpStatus: status }, originalError);
            case 401:
                throw new CircleError(CircleErrorCode.AUTHENTICATION_FAILED, `Unauthorized during ${operation}`, 'Authentication failed. Please contact support.', false, undefined, { httpStatus: status }, originalError);
            case 403:
                throw new CircleError(CircleErrorCode.AUTHENTICATION_FAILED, `Forbidden during ${operation}`, 'Access denied. Please contact support.', false, undefined, { httpStatus: status }, originalError);
            case 404:
                throw new CircleError(CircleErrorCode.UNKNOWN_ERROR, `Not found during ${operation}`, 'Resource not found. Please try again or contact support.', false, undefined, { httpStatus: status }, originalError);
            case 429:
                throw new CircleError(CircleErrorCode.API_RATE_LIMITED, `Rate limited during ${operation}`, 'Too many requests. Please wait a moment and try again.', true, 60, { httpStatus: status }, originalError);
            case 500:
            case 502:
            case 503:
            case 504:
                throw new CircleError(CircleErrorCode.API_UNAVAILABLE, `Service unavailable during ${operation}`, 'Payment service is temporarily unavailable. Please try again in a few minutes.', true, 120, { httpStatus: status }, originalError);
            default:
                throw new CircleError(CircleErrorCode.UNKNOWN_ERROR, `HTTP ${status} error during ${operation}`, 'An unexpected error occurred. Please try again or contact support if the problem persists.', true, 30, { httpStatus: status }, originalError);
        }
    }
}
exports.CircleErrorHandler = CircleErrorHandler;
/**
 * Retry mechanism for Circle API operations
 */
class CircleRetryHandler {
    /**
     * Execute operation with retry logic
     */
    static async withRetry(operation, operationName, maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 30000) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                // Don't retry if error is not retryable
                if (error instanceof CircleError && !error.retryable) {
                    throw error;
                }
                // Don't retry on last attempt
                if (attempt === maxRetries) {
                    break;
                }
                // Calculate delay with exponential backoff
                const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
                // Add jitter to prevent thundering herd
                const jitteredDelay = delay + Math.random() * 1000;
                console.warn(`${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(jitteredDelay)}ms:`, error instanceof Error ? error.message : String(error));
                await new Promise(resolve => setTimeout(resolve, jitteredDelay));
            }
        }
        // If we get here, all retries failed
        if (lastError instanceof CircleError) {
            throw lastError;
        }
        throw CircleErrorHandler.handleError(lastError, operationName);
    }
}
exports.CircleRetryHandler = CircleRetryHandler;
