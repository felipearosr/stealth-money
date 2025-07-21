"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.circleConfig = exports.CircleConfigManager = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Circle API configuration management
 * Centralizes all Circle-related configuration and validation
 */
class CircleConfigManager {
    constructor() {
        this.config = this.loadConfig();
        this.validateConfig();
    }
    static getInstance() {
        if (!CircleConfigManager.instance) {
            CircleConfigManager.instance = new CircleConfigManager();
        }
        return CircleConfigManager.instance;
    }
    loadConfig() {
        const apiKey = process.env.CIRCLE_API_KEY;
        const environment = (process.env.CIRCLE_ENVIRONMENT || 'sandbox');
        const webhookSecret = process.env.CIRCLE_WEBHOOK_SECRET;
        // Determine base URL based on environment
        const baseUrl = environment === 'sandbox'
            ? 'https://api-sandbox.circle.com'
            : 'https://api.circle.com';
        return {
            apiKey: apiKey || '',
            environment,
            baseUrl,
            webhookSecret
        };
    }
    validateConfig() {
        if (!this.config.apiKey) {
            throw new Error('CIRCLE_API_KEY environment variable is required');
        }
        if (!['sandbox', 'production'].includes(this.config.environment)) {
            throw new Error('CIRCLE_ENVIRONMENT must be either "sandbox" or "production"');
        }
        // Log configuration (without sensitive data)
        console.log(`Circle API configured for ${this.config.environment} environment`);
        if (this.config.environment === 'production') {
            console.warn('⚠️  Running in Circle PRODUCTION environment');
        }
        else {
            console.log('🧪 Running in Circle SANDBOX environment');
        }
    }
    getConfig() {
        return { ...this.config };
    }
    getApiKey() {
        return this.config.apiKey;
    }
    getEnvironment() {
        return this.config.environment;
    }
    getBaseUrl() {
        return this.config.baseUrl;
    }
    isSandbox() {
        return this.config.environment === 'sandbox';
    }
    isProduction() {
        return this.config.environment === 'production';
    }
    getWebhookSecret() {
        return this.config.webhookSecret;
    }
}
exports.CircleConfigManager = CircleConfigManager;
// Export singleton instance
exports.circleConfig = CircleConfigManager.getInstance();
