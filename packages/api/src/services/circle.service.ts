import { Circle, CircleEnvironments } from '@circle-fin/circle-sdk';
import { circleConfig } from '../config/circle.config';

/**
 * Base Circle service class that provides configured Circle API client
 * and common functionality for all Circle-related operations
 */
export class CircleService {
  protected circleClient: Circle;
  protected environment: string;

  constructor() {
    const config = circleConfig.getConfig();
    this.environment = config.environment;
    
    // Initialize Circle API client
    this.circleClient = new Circle(
      config.apiKey,
      config.environment === 'sandbox' 
        ? CircleEnvironments.sandbox 
        : CircleEnvironments.production
    );
  }

  /**
   * Get the current environment (sandbox or production)
   */
  getEnvironment(): string {
    return this.environment;
  }

  /**
   * Check if running in sandbox mode
   */
  isSandbox(): boolean {
    return this.environment === 'sandbox';
  }

  /**
   * Health check method to verify Circle API connectivity
   */
  async healthCheck(): Promise<{ status: string; environment: string }> {
    try {
      // For now, just verify the client is properly initialized
      // Actual API connectivity will be tested when we implement specific methods
      if (this.circleClient && this.environment) {
        return {
          status: 'healthy',
          environment: this.environment
        };
      } else {
        return {
          status: 'unhealthy',
          environment: this.environment
        };
      }
    } catch (error) {
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
  protected generateIdempotencyKey(prefix: string = 'req'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle Circle API errors with consistent error formatting
   */
  protected handleCircleError(error: any, operation: string): never {
    console.error(`Circle API error during ${operation}:`, error);
    
    if (error.response?.data) {
      throw new Error(`Circle API ${operation} failed: ${error.response.data.message || error.message}`);
    }
    
    throw new Error(`Circle API ${operation} failed: ${error.message}`);
  }
}