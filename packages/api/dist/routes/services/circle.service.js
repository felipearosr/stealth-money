"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircleService = void 0;
const circle_sdk_1 = require("@circle-fin/circle-sdk");
const circle_config_1 = require("../config/circle.config");
const circle_error_handler_1 = require("../utils/circle-error-handler");
/**
 * Base Circle service class that provides configured Circle API client
 * and common functionality for all Circle-related operations
 */
class CircleService {
    constructor() {
        const config = circle_config_1.circleConfig.getConfig();
        this.environment = config.environment;
        // Initialize Circle API client
        this.circleClient = new circle_sdk_1.Circle(config.apiKey, config.environment === 'sandbox'
            ? circle_sdk_1.CircleEnvironments.sandbox
            : circle_sdk_1.CircleEnvironments.production);
    }
    /**
     * Get the current environment (sandbox or production)
     */
    getEnvironment() {
        return this.environment;
    }
    /**
     * Check if running in sandbox mode
     */
    isSandbox() {
        return this.environment === 'sandbox';
    }
    /**
     * Health check method to verify Circle API connectivity
     */
    async healthCheck() {
        try {
            // For now, just verify the client is properly initialized
            // Actual API connectivity will be tested when we implement specific methods
            if (this.circleClient && this.environment) {
                return {
                    status: 'healthy',
                    environment: this.environment
                };
            }
            else {
                return {
                    status: 'unhealthy',
                    environment: this.environment
                };
            }
        }
        catch (error) {
            console.error('Circle API health check failed:', error);
            return {
                status: 'unhealthy',
                environment: this.environment
            };
        }
    }
    /**
     * Generate idempotency key for Circle API requests
     */
    generateIdempotencyKey(prefix = 'req') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Handle Circle API errors with comprehensive error handling
     */
    handleCircleError(error, operation) {
        return circle_error_handler_1.CircleErrorHandler.handleError(error, operation);
    }
}
exports.CircleService = CircleService;
