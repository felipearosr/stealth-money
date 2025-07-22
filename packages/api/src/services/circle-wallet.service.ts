import { CircleService } from './circle.service';
import { CircleRetryHandler } from '../utils/circle-error-handler';

/**
 * Interface for wallet creation request
 */
export interface CreateWalletRequest {
  userId: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for wallet response
 */
export interface WalletResponse {
  walletId: string;
  entityId: string;
  type: string;
  description?: string;
  status: 'live' | 'frozen';
  accountType: string;
  blockchain: string;
  custodyType: string;
  userId?: string;
  createDate: string;
  updateDate: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for wallet balance
 */
export interface WalletBalance {
  available: Array<{
    amount: string;
    currency: string;
  }>;
  unsettled: Array<{
    amount: string;
    currency: string;
  }>;
}

/**
 * Interface for transfer request
 */
export interface CreateTransferRequest {
  sourceWalletId: string;
  destinationWalletId: string;
  amount: string;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for transfer response
 */
export interface TransferResponse {
  id: string;
  source: {
    type: string;
    id: string;
  };
  destination: {
    type: string;
    id: string;
  };
  amount: {
    amount: string;
    currency: string;
  };
  status: 'pending' | 'complete' | 'failed';
  description?: string;
  createDate: string;
  metadata?: Record<string, any>;
}

/**
 * Circle Wallet Service for programmable wallet management
 * Handles wallet creation, balance checking, and fund transfers
 */
export class CircleWalletService extends CircleService {

  /**
   * Create a new programmable wallet
   */
  async createWallet(request: CreateWalletRequest): Promise<WalletResponse> {
    return CircleRetryHandler.withRetry(
      async () => {
        try {
          const idempotencyKey = this.generateIdempotencyKey('wallet');
          
          const walletRequest = {
            idempotencyKey,
            entitySecretCiphertext: await this.generateEntitySecret(),
            description: request.description || `Wallet for user ${request.userId}`,
            metadata: {
              ...request.metadata,
              userId: request.userId
            }
          };

          // Mock API call - in real implementation this would call Circle API
          const response = await this.mockCreateWallet(walletRequest);
          
          if (!response.data) {
            throw new Error('No wallet data received from Circle API');
          }

          return this.formatWalletResponse(response.data, request.userId);
        } catch (error) {
          this.handleCircleError(error, 'wallet creation');
        }
      },
      'wallet creation',
      3,
      1000,
      10000
    );
  }

  /**
   * Get wallet by ID
   */
  async getWallet(walletId: string): Promise<WalletResponse> {
    try {
      // Mock API call - in real implementation this would call Circle API
      const response = await this.mockGetWallet(walletId);
      
      if (!response.data) {
        throw new Error(`Wallet ${walletId} not found`);
      }

      return this.formatWalletResponse(response.data);
    } catch (error) {
      this.handleCircleError(error, 'wallet retrieval');
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(walletId: string): Promise<WalletBalance> {
    try {
      // Mock API call - in real implementation this would call Circle API
      const response = await this.mockGetWalletBalance(walletId);
      
      if (!response.data) {
        throw new Error(`Balance for wallet ${walletId} not found`);
      }

      return {
        available: response.data.available || [],
        unsettled: response.data.unsettled || []
      };
    } catch (error) {
      this.handleCircleError(error, 'wallet balance retrieval');
    }
  }

  /**
   * Create a transfer between wallets
   */
  async createTransfer(request: CreateTransferRequest): Promise<TransferResponse> {
    try {
      this.validateTransferRequest(request);
      
      const idempotencyKey = this.generateIdempotencyKey('transfer');
      
      const transferRequest = {
        idempotencyKey,
        source: {
          type: 'wallet' as const,
          id: request.sourceWalletId
        },
        destination: {
          type: 'wallet' as const, 
          id: request.destinationWalletId
        },
        amount: {
          amount: request.amount,
          currency: request.currency
        },
        description: request.description || 'Wallet to wallet transfer',
        metadata: request.metadata || {}
      };

      // Mock API call - in real implementation this would call Circle API
      const response = await this.mockCreateTransfer(transferRequest);
      
      if (!response.data) {
        throw new Error('No transfer data received from Circle API');
      }

      return this.formatTransferResponse(response.data);
    } catch (error) {
      this.handleCircleError(error, 'transfer creation');
    }
  }

  /**
   * Get transfer status by ID
   */
  async getTransfer(transferId: string): Promise<TransferResponse> {
    try {
      // Mock API call - in real implementation this would call Circle API
      const response = await this.mockGetTransfer(transferId);
      
      if (!response.data) {
        throw new Error(`Transfer ${transferId} not found`);
      }

      return this.formatTransferResponse(response.data);
    } catch (error) {
      this.handleCircleError(error, 'transfer retrieval');
    }
  }

  /**
   * Check if wallet has sufficient balance for transfer
   */
  async hasSufficientBalance(walletId: string, amount: string, currency: string): Promise<boolean> {
    try {
      const balance = await this.getWalletBalance(walletId);
      const availableBalance = balance.available.find(b => b.currency === currency);
      
      if (!availableBalance) {
        return false;
      }
      
      return parseFloat(availableBalance.amount) >= parseFloat(amount);
    } catch (error) {
      console.error('Error checking wallet balance:', error);
      return false;
    }
  }

  /**
   * Wait for transfer completion with timeout
   */
  async waitForTransferCompletion(
    transferId: string,
    timeoutMs: number = 300000, // 5 minutes default
    pollIntervalMs: number = 5000 // 5 seconds default
  ): Promise<TransferResponse> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const transfer = await this.getTransfer(transferId);
      
      if (transfer.status === 'complete') {
        return transfer;
      }
      
      if (transfer.status === 'failed') {
        throw new Error(`Transfer ${transferId} failed`);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    
    throw new Error(`Transfer ${transferId} completion timeout after ${timeoutMs}ms`);
  }

  /**
   * Validate transfer request
   */
  validateTransferRequest(request: CreateTransferRequest): void {
    if (!request.sourceWalletId) {
      throw new Error('Source wallet ID is required');
    }
    
    if (!request.destinationWalletId) {
      throw new Error('Destination wallet ID is required');
    }
    
    if (request.sourceWalletId === request.destinationWalletId) {
      throw new Error('Source and destination wallets cannot be the same');
    }
    
    const amount = parseFloat(request.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Transfer amount must be a positive number');
    }
    
    if (!request.currency) {
      throw new Error('Currency is required');
    }
  }

  /**
   * Generate entity secret for wallet creation
   * In production, this should use proper key management
   */
  private async generateEntitySecret(): Promise<string> {
    // For sandbox/development, generate a simple secret
    // In production, this should use proper cryptographic key generation
    const secret = Buffer.from(`entity-secret-${Date.now()}-${Math.random()}`).toString('base64');
    return secret;
  }

  /**
   * Mock Circle API wallet creation for testing
   */
  private async mockCreateWallet(request: any): Promise<{ data: any }> {
    return {
      data: {
        walletId: `wallet-${Date.now()}`,
        entityId: `entity-${Date.now()}`,
        type: 'end_user_wallet',
        state: 'LIVE',
        description: request.description,
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        metadata: request.metadata
      }
    };
  }

  /**
   * Mock Circle API wallet retrieval for testing
   */
  private async mockGetWallet(walletId: string): Promise<{ data: any }> {
    return {
      data: {
        walletId,
        entityId: `entity-${Date.now()}`,
        state: 'LIVE',
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString()
      }
    };
  }

  /**
   * Mock Circle API wallet balance retrieval for testing
   */
  private async mockGetWalletBalance(walletId: string): Promise<{ data: any }> {
    return {
      data: {
        available: [
          { amount: '100', currency: 'USD' }
        ],
        unsettled: []
      }
    };
  }

  /**
   * Mock Circle API transfer creation for testing
   */
  private async mockCreateTransfer(request: any): Promise<{ data: any }> {
    return {
      data: {
        id: `transfer-${Date.now()}`,
        source: request.source,
        destination: request.destination,
        amount: request.amount,
        status: 'pending',
        createDate: new Date().toISOString(),
        metadata: request.metadata
      }
    };
  }

  /**
   * Mock Circle API transfer retrieval for testing
   */
  private async mockGetTransfer(transferId: string): Promise<{ data: any }> {
    return {
      data: {
        id: transferId,
        source: { type: 'wallet', id: 'wallet-1' },
        destination: { type: 'wallet', id: 'wallet-2' },
        amount: { amount: '100', currency: 'USD' },
        status: 'complete',
        createDate: new Date().toISOString()
      }
    };
  }

  /**
   * Format Circle API wallet response to our interface
   */
  private formatWalletResponse(circleWallet: any, userId?: string): WalletResponse {
    return {
      walletId: circleWallet.walletId,
      entityId: circleWallet.entityId,
      type: circleWallet.type || 'end_user_wallet',
      description: circleWallet.description,
      status: circleWallet.state === 'LIVE' ? 'live' : 'frozen',
      accountType: circleWallet.accountType || 'SCA',
      blockchain: circleWallet.blockchain || 'ETH',
      custodyType: circleWallet.custodyType || 'ENDUSER',
      userId: userId || circleWallet.metadata?.userId,
      createDate: circleWallet.createDate,
      updateDate: circleWallet.updateDate,
      metadata: circleWallet.metadata
    };
  }

  /**
   * Format Circle API transfer response to our interface
   */
  private formatTransferResponse(circleTransfer: any): TransferResponse {
    return {
      id: circleTransfer.id,
      source: {
        type: circleTransfer.source?.type || 'wallet',
        id: circleTransfer.source?.id || ''
      },
      destination: {
        type: circleTransfer.destination?.type || 'wallet',
        id: circleTransfer.destination?.id || ''
      },
      amount: {
        amount: circleTransfer.amount?.amount || '0',
        currency: circleTransfer.amount?.currency || 'USD'
      },
      status: this.mapCircleTransferStatus(circleTransfer.status),
      description: circleTransfer.description,
      createDate: circleTransfer.createDate,
      metadata: circleTransfer.metadata
    };
  }

  /**
   * Map Circle transfer status to our standardized status
   */
  private mapCircleTransferStatus(circleStatus: string): 'pending' | 'complete' | 'failed' {
    switch (circleStatus?.toLowerCase()) {
      case 'complete':
        return 'complete';
      case 'failed':
      case 'cancelled':
        return 'failed';
      case 'pending':
      case 'running':
      default:
        return 'pending';
    }
  }
}