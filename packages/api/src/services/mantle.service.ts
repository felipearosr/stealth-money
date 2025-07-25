import { ethers } from 'ethers';
import { mantleConfig, MantleConfig } from '../config/mantle.config';

export interface MantleWallet {
  id: string;
  address: string;
  userId: string;
  createdAt: Date;
}

export interface WalletBalance {
  native: string; // MNT balance
  stablecoin: string; // USDC balance
  address: string;
}

export interface NetworkStatus {
  connected: boolean;
  blockNumber: number;
  gasPrice: string;
  networkId: number;
  latency: number;
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  totalCost: string;
  totalCostUSD: string;
}

/**
 * Mantle L2 Service
 * Handles all Mantle blockchain interactions including wallet management,
 * transfers, and network operations
 */
export class MantleService {
  private provider: ethers.JsonRpcProvider | null = null;
  private config: MantleConfig;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.config = mantleConfig.getConfig();
    
    if (!this.config.enabled) {
      console.log('🔒 MantleService initialized but disabled');
      return;
    }

    // Initialize provider asynchronously
    this.initializationPromise = this.initializeProvider().catch(error => {
      console.error('❌ Failed to initialize Mantle provider:', error);
    });
  }

  /**
   * Wait for the service to complete initialization
   */
  public async waitForInitialization(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  private async initializeProvider(): Promise<void> {
    try {
      console.log(`🔗 Initializing Mantle L2 connection to ${this.config.environment}...`);
      
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      
      // Test the connection
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      
      if (Number(network.chainId) !== this.config.networkId) {
        throw new Error(`Network ID mismatch. Expected: ${this.config.networkId}, Got: ${network.chainId}`);
      }
      
      console.log('✅ Mantle L2 service initialized');
      console.log(`   Network: ${this.config.environment} (Chain ID: ${network.chainId})`);
      console.log(`   RPC URL: ${this.config.rpcUrl}`);
      console.log(`   Current Block: ${blockNumber}`);
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Mantle L2 initialization failed:', error);
      console.log('⚠️  Mantle service will operate in disabled mode');
      this.isInitialized = false;
    }
  }

  /**
   * Check if the service is enabled and properly initialized
   */
  public isEnabled(): boolean {
    return this.config.enabled && this.isInitialized;
  }

  /**
   * Get the current configuration
   */
  public getConfig(): MantleConfig {
    return { ...this.config };
  }

  /**
   * Create a new wallet for a user
   * In a production environment, this would integrate with secure key management
   */
  public async createWallet(userId: string): Promise<MantleWallet> {
    if (!this.isEnabled()) {
      throw new Error('Mantle service is not enabled or not properly initialized');
    }

    try {
      // Generate a new wallet
      const wallet = ethers.Wallet.createRandom();
      
      // In production, you would:
      // 1. Encrypt the private key
      // 2. Store it securely (HSM, encrypted database, etc.)
      // 3. Never log the private key
      
      const mantleWallet: MantleWallet = {
        id: `mantle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        address: wallet.address,
        userId,
        createdAt: new Date()
      };

      console.log(`✅ Created Mantle wallet for user ${userId}: ${wallet.address}`);
      
      return mantleWallet;
    } catch (error) {
      console.error('❌ Failed to create Mantle wallet:', error);
      throw new Error(`Failed to create Mantle wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get wallet balance for native token and stablecoin
   */
  public async getWalletBalance(walletAddress: string): Promise<WalletBalance> {
    if (!this.isEnabled() || !this.provider) {
      throw new Error('Mantle service is not enabled or not properly initialized');
    }

    try {
      // Get native token (MNT) balance
      const nativeBalance = await this.provider.getBalance(walletAddress);
      const nativeBalanceFormatted = ethers.formatEther(nativeBalance);

      // Get stablecoin (USDC) balance
      let stablecoinBalance = '0';
      
      if (this.config.stablecoinAddress) {
        try {
          // ERC20 ABI for balance checking
          const erc20ABI = [
            'function balanceOf(address owner) view returns (uint256)',
            'function decimals() view returns (uint8)'
          ];
          
          const tokenContract = new ethers.Contract(
            this.config.stablecoinAddress,
            erc20ABI,
            this.provider
          );
          
          const balance = await tokenContract.balanceOf(walletAddress);
          const decimals = await tokenContract.decimals();
          stablecoinBalance = ethers.formatUnits(balance, decimals);
        } catch (tokenError) {
          console.warn(`⚠️  Could not fetch stablecoin balance: ${tokenError}`);
          stablecoinBalance = '0';
        }
      }

      return {
        native: nativeBalanceFormatted,
        stablecoin: stablecoinBalance,
        address: walletAddress
      };
    } catch (error) {
      console.error('❌ Failed to get wallet balance:', error);
      throw new Error(`Failed to get wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Estimate gas cost for a transfer operation
   */
  public async estimateGasCost(amount: number, currency: string): Promise<GasEstimate> {
    if (!this.isEnabled() || !this.provider) {
      throw new Error('Mantle service is not enabled or not properly initialized');
    }

    try {
      // Get current gas price
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei'); // Fallback gas price

      // Use configured gas limit for transfers
      const gasLimit = BigInt(this.config.gasLimit.transfer);
      
      // Calculate total cost in native token
      const totalCostWei = gasLimit * gasPrice;
      const totalCost = ethers.formatEther(totalCostWei);
      
      // For now, use a simple conversion rate (in production, fetch from price oracle)
      // Assuming 1 MNT = $0.50 for estimation
      const mntPriceUSD = 0.50;
      const totalCostUSD = (parseFloat(totalCost) * mntPriceUSD).toFixed(6);

      return {
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString(),
        totalCost,
        totalCostUSD
      };
    } catch (error) {
      console.error('❌ Failed to estimate gas cost:', error);
      throw new Error(`Failed to estimate gas cost: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current network status and health information
   */
  public async getCurrentNetworkStatus(): Promise<NetworkStatus> {
    if (!this.isEnabled() || !this.provider) {
      return {
        connected: false,
        blockNumber: 0,
        gasPrice: '0',
        networkId: this.config.networkId,
        latency: 0
      };
    }

    try {
      const startTime = Date.now();
      
      // Fetch network information
      const [blockNumber, feeData] = await Promise.all([
        this.provider.getBlockNumber(),
        this.provider.getFeeData()
      ]);
      
      const latency = Date.now() - startTime;
      const gasPrice = feeData.gasPrice || BigInt(0);

      return {
        connected: true,
        blockNumber,
        gasPrice: gasPrice.toString(),
        networkId: this.config.networkId,
        latency
      };
    } catch (error) {
      console.error('❌ Failed to get network status:', error);
      return {
        connected: false,
        blockNumber: 0,
        gasPrice: '0',
        networkId: this.config.networkId,
        latency: 0
      };
    }
  }

  /**
   * Comprehensive health check for the Mantle service
   */
  public async healthCheck(): Promise<{
    enabled: boolean;
    connected: boolean;
    environment: string;
    networkId: number;
    rpcUrl: string;
    blockNumber?: number;
    gasPrice?: string;
    latency?: number;
    stablecoinConfigured: boolean;
    bridgeConfigured: boolean;
    error?: string;
  }> {
    const baseStatus = {
      enabled: this.config.enabled,
      connected: false,
      environment: this.config.environment,
      networkId: this.config.networkId,
      rpcUrl: this.config.rpcUrl,
      stablecoinConfigured: !!this.config.stablecoinAddress,
      bridgeConfigured: !!this.config.bridgeContractAddress
    };

    if (!this.config.enabled) {
      return {
        ...baseStatus,
        error: 'Mantle service is disabled'
      };
    }

    if (!this.isInitialized) {
      return {
        ...baseStatus,
        error: 'Mantle service failed to initialize'
      };
    }

    try {
      const networkStatus = await this.getCurrentNetworkStatus();
      
      return {
        ...baseStatus,
        connected: networkStatus.connected,
        blockNumber: networkStatus.blockNumber,
        gasPrice: networkStatus.gasPrice,
        latency: networkStatus.latency
      };
    } catch (error) {
      return {
        ...baseStatus,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get transaction details from the Mantle network
   */
  public async getTransactionDetails(txHash: string): Promise<{
    hash: string;
    blockNumber: number;
    confirmations: number;
    status: number;
    gasUsed: string;
    gasPrice: string;
  } | null> {
    if (!this.isEnabled() || !this.provider) {
      throw new Error('Mantle service is not enabled or not properly initialized');
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) {
        return null;
      }

      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;

      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        confirmations,
        status: receipt.status || 0,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.gasPrice?.toString() || '0'
      };
    } catch (error) {
      console.error('❌ Error getting transaction details:', error);
      return null;
    }
  }

  /**
   * Wait for transaction confirmations
   */
  public async waitForConfirmations(txHash: string, requiredConfirmations?: number): Promise<boolean> {
    if (!this.isEnabled() || !this.provider) {
      throw new Error('Mantle service is not enabled or not properly initialized');
    }

    const confirmations = requiredConfirmations || this.config.confirmationBlocks;
    const maxWaitTime = 300000; // 5 minutes
    const startTime = Date.now();

    try {
      while (Date.now() - startTime < maxWaitTime) {
        const details = await this.getTransactionDetails(txHash);
        
        if (!details) {
          console.log(`Transaction ${txHash} not found, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        if (details.confirmations >= confirmations) {
          console.log(`✅ Transaction ${txHash} has ${details.confirmations} confirmations`);
          return true;
        }

        console.log(`⏳ Transaction ${txHash} has ${details.confirmations}/${confirmations} confirmations`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      throw new Error(`Timeout waiting for ${confirmations} confirmations`);
    } catch (error) {
      console.error('❌ Error waiting for confirmations:', error);
      return false;
    }
  }
}