import { ethers } from 'ethers';
import crypto from 'crypto';
import { mantleConfig, MantleConfig } from '../config/mantle.config';

export interface MantleWallet {
  id: string;
  address: string;
  userId: string;
  createdAt: Date;
  encryptedPrivateKey?: string; // Only for internal use, never exposed
}

export interface WalletBalance {
  native: string; // MNT balance
  stablecoin: string; // USDC balance
  address: string;
  nativeUSD?: string; // USD value of native balance
  stablecoinUSD?: string; // USD value of stablecoin balance
  totalUSD?: string; // Total USD value
}

export interface WalletCreationResult {
  wallet: MantleWallet;
  mnemonic?: string; // Only returned during creation for backup
}

export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  balanceUSD?: string;
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

  // ============================================================================
  // WALLET MANAGEMENT METHODS
  // ============================================================================

  /**
   * Create a new wallet for a user with secure private key handling
   */
  public async createWallet(userId: string, options?: { 
    generateMnemonic?: boolean;
    encryptPrivateKey?: boolean;
  }): Promise<WalletCreationResult> {
    if (!this.isEnabled()) {
      throw new Error('Mantle service is not enabled or not properly initialized');
    }

    try {
      let wallet: ethers.HDNodeWallet | ethers.Wallet;
      let mnemonic: string | undefined;

      if (options?.generateMnemonic) {
        // Generate wallet from mnemonic for better backup/recovery
        wallet = ethers.Wallet.createRandom();
        if (wallet.mnemonic) {
          mnemonic = wallet.mnemonic.phrase;
        }
      } else {
        // Generate simple random wallet
        wallet = ethers.Wallet.createRandom();
      }

      // Encrypt private key if requested (for secure storage)
      let encryptedPrivateKey: string | undefined;
      if (options?.encryptPrivateKey) {
        encryptedPrivateKey = await this.encryptPrivateKey(wallet.privateKey, userId);
      }

      const mantleWallet: MantleWallet = {
        id: `mantle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        address: wallet.address,
        userId,
        createdAt: new Date(),
        encryptedPrivateKey
      };

      console.log(`✅ Created Mantle wallet for user ${userId}: ${wallet.address}`);
      
      return {
        wallet: mantleWallet,
        mnemonic: options?.generateMnemonic ? mnemonic : undefined
      };
    } catch (error) {
      console.error('❌ Failed to create Mantle wallet:', error);
      throw new Error(`Failed to create Mantle wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create wallet from existing mnemonic phrase
   */
  public async createWalletFromMnemonic(userId: string, mnemonic: string, derivationPath?: string): Promise<MantleWallet> {
    if (!this.isEnabled()) {
      throw new Error('Mantle service is not enabled or not properly initialized');
    }

    try {
      // Validate mnemonic
      if (!ethers.Mnemonic.isValidMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      // Create wallet from mnemonic
      const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, derivationPath || "m/44'/60'/0'/0/0");
      
      const mantleWallet: MantleWallet = {
        id: `mantle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        address: hdNode.address,
        userId,
        createdAt: new Date()
      };

      console.log(`✅ Created Mantle wallet from mnemonic for user ${userId}: ${hdNode.address}`);
      
      return mantleWallet;
    } catch (error) {
      console.error('❌ Failed to create wallet from mnemonic:', error);
      throw new Error(`Failed to create wallet from mnemonic: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create wallet from private key
   */
  public async createWalletFromPrivateKey(userId: string, privateKey: string): Promise<MantleWallet> {
    if (!this.isEnabled()) {
      throw new Error('Mantle service is not enabled or not properly initialized');
    }

    try {
      // Validate and create wallet from private key
      const wallet = new ethers.Wallet(privateKey);
      
      const mantleWallet: MantleWallet = {
        id: `mantle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        address: wallet.address,
        userId,
        createdAt: new Date()
      };

      console.log(`✅ Created Mantle wallet from private key for user ${userId}: ${wallet.address}`);
      
      return mantleWallet;
    } catch (error) {
      console.error('❌ Failed to create wallet from private key:', error);
      throw new Error(`Failed to create wallet from private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Derive wallet address from public key or other identifier
   */
  public deriveWalletAddress(publicKey: string): string {
    try {
      // For Ethereum-compatible addresses, derive from public key
      const address = ethers.computeAddress(publicKey);
      return address;
    } catch (error) {
      console.error('❌ Failed to derive wallet address:', error);
      throw new Error(`Failed to derive wallet address: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate if an address is a valid Ethereum address
   */
  public isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Get wallet information without sensitive data
   */
  public async getWalletInfo(walletAddress: string): Promise<{
    address: string;
    isContract: boolean;
    balance: WalletBalance;
    transactionCount: number;
  }> {
    if (!this.isEnabled() || !this.provider) {
      throw new Error('Mantle service is not enabled or not properly initialized');
    }

    try {
      const [balance, transactionCount, code] = await Promise.all([
        this.getWalletBalance(walletAddress),
        this.provider.getTransactionCount(walletAddress),
        this.provider.getCode(walletAddress)
      ]);

      return {
        address: walletAddress,
        isContract: code !== '0x',
        balance,
        transactionCount
      };
    } catch (error) {
      console.error('❌ Failed to get wallet info:', error);
      throw new Error(`Failed to get wallet info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt private key for secure storage
   */
  private async encryptPrivateKey(privateKey: string, userId: string): Promise<string> {
    try {
      // In production, use a proper key derivation function and secure key management
      // This is a simplified example - use HSM or proper key management in production
      const password = `${userId}_${process.env.ENCRYPTION_KEY || 'default_key'}`;
      const algorithm = 'aes-256-cbc';
      const iv = crypto.randomBytes(16);
      
      // Create a key from the password (in production, use proper key derivation)
      const key = crypto.createHash('sha256').update(password).digest();
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      let encrypted = cipher.update(privateKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('❌ Failed to encrypt private key:', error);
      throw new Error('Failed to encrypt private key');
    }
  }

  /**
   * Decrypt private key (for internal use only)
   */
  private async decryptPrivateKey(encryptedPrivateKey: string, userId: string): Promise<string> {
    try {
      const password = `${userId}_${process.env.ENCRYPTION_KEY || 'default_key'}`;
      const algorithm = 'aes-256-cbc';
      const [ivHex, encrypted] = encryptedPrivateKey.split(':');
      
      if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted private key format');
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.createHash('sha256').update(password).digest();
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('❌ Failed to decrypt private key:', error);
      throw new Error('Failed to decrypt private key');
    }
  }

  /**
   * Get wallet balance for native token and stablecoin with USD values
   */
  public async getWalletBalance(walletAddress: string, includeUSDValues: boolean = true): Promise<WalletBalance> {
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

      // Calculate USD values if requested
      let nativeUSD: string | undefined;
      let stablecoinUSD: string | undefined;
      let totalUSD: string | undefined;

      if (includeUSDValues) {
        try {
          // Get current prices (in production, use a proper price oracle)
          const mntPriceUSD = await this.getMNTPriceUSD();
          const usdcPriceUSD = 1.0; // USDC is pegged to USD
          
          nativeUSD = (parseFloat(nativeBalanceFormatted) * mntPriceUSD).toFixed(6);
          stablecoinUSD = (parseFloat(stablecoinBalance) * usdcPriceUSD).toFixed(6);
          totalUSD = (parseFloat(nativeUSD) + parseFloat(stablecoinUSD)).toFixed(6);
        } catch (priceError) {
          console.warn(`⚠️  Could not fetch USD prices: ${priceError}`);
        }
      }

      return {
        native: nativeBalanceFormatted,
        stablecoin: stablecoinBalance,
        address: walletAddress,
        nativeUSD,
        stablecoinUSD,
        totalUSD
      };
    } catch (error) {
      console.error('❌ Failed to get wallet balance:', error);
      throw new Error(`Failed to get wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get balance for a specific ERC20 token
   */
  public async getTokenBalance(walletAddress: string, tokenAddress: string): Promise<TokenBalance> {
    if (!this.isEnabled() || !this.provider) {
      throw new Error('Mantle service is not enabled or not properly initialized');
    }

    try {
      // ERC20 ABI for token information
      const erc20ABI = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
        'function name() view returns (string)'
      ];
      
      const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, this.provider);
      
      const [balance, decimals, symbol, name] = await Promise.all([
        tokenContract.balanceOf(walletAddress),
        tokenContract.decimals(),
        tokenContract.symbol(),
        tokenContract.name()
      ]);
      
      const balanceFormatted = ethers.formatUnits(balance, decimals);

      return {
        address: tokenAddress,
        symbol,
        name,
        balance: balanceFormatted,
        decimals: Number(decimals)
      };
    } catch (error) {
      console.error('❌ Failed to get token balance:', error);
      throw new Error(`Failed to get token balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get balances for multiple tokens
   */
  public async getMultipleTokenBalances(walletAddress: string, tokenAddresses: string[]): Promise<TokenBalance[]> {
    if (!this.isEnabled() || !this.provider) {
      throw new Error('Mantle service is not enabled or not properly initialized');
    }

    try {
      const balancePromises = tokenAddresses.map(tokenAddress => 
        this.getTokenBalance(walletAddress, tokenAddress).catch(error => {
          console.warn(`⚠️  Failed to get balance for token ${tokenAddress}: ${error}`);
          return null;
        })
      );

      const results = await Promise.all(balancePromises);
      return results.filter((balance): balance is TokenBalance => balance !== null);
    } catch (error) {
      console.error('❌ Failed to get multiple token balances:', error);
      throw new Error(`Failed to get multiple token balances: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get MNT price in USD (simplified implementation)
   * In production, integrate with a proper price oracle like Chainlink or CoinGecko
   */
  private async getMNTPriceUSD(): Promise<number> {
    try {
      // This is a simplified implementation
      // In production, you would fetch from a reliable price oracle
      // For now, return a mock price
      return 0.50; // $0.50 per MNT
    } catch (error) {
      console.warn('⚠️  Failed to fetch MNT price, using fallback');
      return 0.50; // Fallback price
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