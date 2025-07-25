import dotenv from 'dotenv';

dotenv.config();

export interface MantleConfig {
  networkId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeToken: string;
  stablecoinAddress: string;
  bridgeContractAddress: string;
  gasLimit: {
    transfer: number;
    swap: number;
  };
  confirmationBlocks: number;
  environment: 'testnet' | 'mainnet';
  enabled: boolean;
}

/**
 * Mantle L2 network configuration management
 * Centralizes all Mantle-related configuration and validation
 */
export class MantleConfigManager {
  private static instance: MantleConfigManager;
  private config: MantleConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): MantleConfigManager {
    if (!MantleConfigManager.instance) {
      MantleConfigManager.instance = new MantleConfigManager();
    }
    return MantleConfigManager.instance;
  }

  private loadConfig(): MantleConfig {
    const environment = (process.env.MANTLE_ENVIRONMENT || 'testnet') as 'testnet' | 'mainnet';
    const enabled = process.env.MANTLE_ENABLED === 'true';
    
    // Network configuration based on environment
    const networkConfig = this.getNetworkConfig(environment);
    
    return {
      ...networkConfig,
      environment,
      enabled,
      gasLimit: {
        transfer: parseInt(process.env.MANTLE_GAS_LIMIT_TRANSFER || '100000'),
        swap: parseInt(process.env.MANTLE_GAS_LIMIT_SWAP || '150000')
      },
      confirmationBlocks: parseInt(process.env.MANTLE_CONFIRMATION_BLOCKS || '1')
    };
  }

  private getNetworkConfig(environment: 'testnet' | 'mainnet') {
    if (environment === 'mainnet') {
      return {
        networkId: 5000,
        rpcUrl: process.env.MANTLE_MAINNET_RPC_URL || 'https://rpc.mantle.xyz',
        explorerUrl: 'https://explorer.mantle.xyz',
        nativeToken: 'MNT',
        stablecoinAddress: process.env.MANTLE_MAINNET_USDC_ADDRESS || '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
        bridgeContractAddress: process.env.MANTLE_MAINNET_BRIDGE_ADDRESS || ''
      };
    } else {
      // Testnet configuration
      return {
        networkId: 5003,
        rpcUrl: process.env.MANTLE_TESTNET_RPC_URL || 'https://rpc.sepolia.mantle.xyz',
        explorerUrl: 'https://explorer.testnet.mantle.xyz',
        nativeToken: 'MNT',
        stablecoinAddress: process.env.MANTLE_TESTNET_USDC_ADDRESS || '0x2c852e740B62308c46DD29B982FBb650D063Bd07',
        bridgeContractAddress: process.env.MANTLE_TESTNET_BRIDGE_ADDRESS || ''
      };
    }
  }

  private validateConfig(): void {
    if (!this.config.enabled) {
      console.log('🔒 Mantle L2 integration is disabled');
      return;
    }

    if (!this.config.rpcUrl) {
      throw new Error('Mantle RPC URL is required when Mantle is enabled');
    }

    if (!this.config.stablecoinAddress) {
      console.warn('⚠️  Mantle stablecoin address not configured - using default');
    }

    if (!this.config.bridgeContractAddress) {
      console.warn('⚠️  Mantle bridge contract address not configured');
    }

    // Log configuration (without sensitive data)
    console.log(`Mantle L2 configured for ${this.config.environment} environment`);
    console.log(`   Network ID: ${this.config.networkId}`);
    console.log(`   RPC URL: ${this.config.rpcUrl}`);
    console.log(`   Explorer: ${this.config.explorerUrl}`);
    console.log(`   Native Token: ${this.config.nativeToken}`);
    
    if (this.config.environment === 'mainnet') {
      console.warn('⚠️  Running in Mantle MAINNET environment');
    } else {
      console.log('🧪 Running in Mantle TESTNET environment');
    }
  }

  public getConfig(): MantleConfig {
    return { ...this.config };
  }

  public getRpcUrl(): string {
    return this.config.rpcUrl;
  }

  public getNetworkId(): number {
    return this.config.networkId;
  }

  public getEnvironment(): 'testnet' | 'mainnet' {
    return this.config.environment;
  }

  public getExplorerUrl(): string {
    return this.config.explorerUrl;
  }

  public getNativeToken(): string {
    return this.config.nativeToken;
  }

  public getStablecoinAddress(): string {
    return this.config.stablecoinAddress;
  }

  public getBridgeContractAddress(): string {
    return this.config.bridgeContractAddress;
  }

  public getGasLimits(): { transfer: number; swap: number } {
    return { ...this.config.gasLimit };
  }

  public getConfirmationBlocks(): number {
    return this.config.confirmationBlocks;
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public isTestnet(): boolean {
    return this.config.environment === 'testnet';
  }

  public isMainnet(): boolean {
    return this.config.environment === 'mainnet';
  }

  public getTransactionUrl(txHash: string): string {
    return `${this.config.explorerUrl}/tx/${txHash}`;
  }

  public getAddressUrl(address: string): string {
    return `${this.config.explorerUrl}/address/${address}`;
  }
}

// Export singleton instance
export const mantleConfig = MantleConfigManager.getInstance();