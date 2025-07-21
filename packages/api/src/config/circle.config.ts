import dotenv from 'dotenv';

dotenv.config();

export interface CircleConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
  webhookSecret?: string;
}

/**
 * Circle API configuration management
 * Centralizes all Circle-related configuration and validation
 */
export class CircleConfigManager {
  private static instance: CircleConfigManager;
  private config: CircleConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): CircleConfigManager {
    if (!CircleConfigManager.instance) {
      CircleConfigManager.instance = new CircleConfigManager();
    }
    return CircleConfigManager.instance;
  }

  private loadConfig(): CircleConfig {
    const apiKey = process.env.CIRCLE_API_KEY;
    const environment = (process.env.CIRCLE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';
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

  private validateConfig(): void {
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
    } else {
      console.log('🧪 Running in Circle SANDBOX environment');
    }
  }

  public getConfig(): CircleConfig {
    return { ...this.config };
  }

  public getApiKey(): string {
    return this.config.apiKey;
  }

  public getEnvironment(): 'sandbox' | 'production' {
    return this.config.environment;
  }

  public getBaseUrl(): string {
    return this.config.baseUrl;
  }

  public isSandbox(): boolean {
    return this.config.environment === 'sandbox';
  }

  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  public getWebhookSecret(): string | undefined {
    return this.config.webhookSecret;
  }
}

// Export singleton instance
export const circleConfig = CircleConfigManager.getInstance();