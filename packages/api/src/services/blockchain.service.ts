// src/services/blockchain.service.ts
import { ethers } from 'ethers';

// Conditional imports for blockchain types - only used in real mode
let TransferManager__factory: any;
let TransferManager: any;

try {
  if (process.env.BLOCKCHAIN_MODE === 'real') {
    const contractTypes = require('../../../contracts/typechain-types');
    TransferManager__factory = contractTypes.TransferManager__factory;
    TransferManager = contractTypes.TransferManager;
  }
} catch (error) {
  // Contract types not available - will use mock mode
  console.log('Contract types not available, using mock mode');
}

interface BlockchainConfig {
  mode: 'real' | 'mock';
  nodeProviderUrl?: string;
  privateKey?: string;
  contractAddress?: string;
  networkName?: string;
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private transferManagerContract: any | null = null;
  private config: BlockchainConfig;
  private isConfigured: boolean = false;

  constructor() {
    this.config = this.loadConfig();
    
    if (this.config.mode === 'mock') {
      console.log('🧪 Blockchain service initialized in MOCK mode');
      this.isConfigured = false;
      return;
    }

    this.initializeRealBlockchain();
  }

  private loadConfig(): BlockchainConfig {
    const mode = process.env.BLOCKCHAIN_MODE as 'real' | 'mock' || 'mock';
    const nodeProviderUrl = process.env.NODE_PROVIDER_URL;
    const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
    const contractAddress = process.env.TRANSFER_MANAGER_CONTRACT_ADDRESS;
    const networkName = process.env.BLOCKCHAIN_NETWORK || 'sepolia';

    // Force mock mode if any required config is missing or has placeholder values
    if (mode === 'real' && (
      !nodeProviderUrl || 
      !privateKey || 
      !contractAddress ||
      nodeProviderUrl.includes('YOUR_PROJECT_ID') ||
      privateKey === 'your_server_wallet_private_key' ||
      contractAddress === 'your_deployed_contract_address'
    )) {
      console.log('⚠️  Real blockchain config incomplete - forcing mock mode');
      return { mode: 'mock' };
    }

    return {
      mode,
      nodeProviderUrl,
      privateKey,
      contractAddress,
      networkName
    };
  }

  private async initializeRealBlockchain() {
    try {
      console.log(`🔗 Initializing real blockchain connection to ${this.config.networkName}...`);
      
      this.provider = new ethers.JsonRpcProvider(this.config.nodeProviderUrl!);
      this.wallet = new ethers.Wallet(this.config.privateKey!, this.provider);
      
      // Initialize the TransferManager contract with proper typing
      this.transferManagerContract = TransferManager__factory.connect(
        this.config.contractAddress!,
        this.wallet
      );
      
      // Test the connection
      await this.provider.getBlockNumber();
      const balance = await this.provider.getBalance(this.wallet.address);
      
      console.log('✅ Real blockchain service initialized');
      console.log(`   Network: ${this.config.networkName}`);
      console.log(`   Wallet: ${this.wallet.address}`);
      console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
      console.log(`   Contract: ${this.config.contractAddress}`);
      
      this.isConfigured = true;
    } catch (error) {
      console.error('❌ Real blockchain initialization failed:', error);
      console.log('⚠️  Falling back to mock mode');
      this.config.mode = 'mock';
      this.isConfigured = false;
    }
  }

  /**
   * Calls the 'release' function on the smart contract to send funds.
   * Includes proper error handling, gas estimation, and transaction confirmation waiting.
   */
  async releaseFunds(
    recipient: string,
    amountInStablecoin: ethers.BigNumberish,
    transactionId: string
  ): Promise<{
    txHash: string;
    blockNumber: number;
    gasUsed: string;
    effectiveGasPrice: string;
  }> {
    if (this.config.mode === 'mock') {
      console.log(`🧪 Mock blockchain: Simulating fund release to ${recipient}`);
      console.log(`   Amount: ${amountInStablecoin.toString()}`);
      console.log(`   Transaction ID: ${transactionId}`);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        txHash: `0x${'mock_tx_hash_' + Date.now().toString(16)}`,
        blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
        gasUsed: '21000',
        effectiveGasPrice: '20000000000'
      };
    }

    if (!this.isConfigured || !this.transferManagerContract || !this.provider || !this.wallet) {
      throw new Error('Blockchain service not properly initialized');
    }

    try {
      console.log(`🔗 Releasing funds on blockchain...`);
      console.log(`   Recipient: ${recipient}`);
      console.log(`   Amount: ${amountInStablecoin.toString()}`);
      console.log(`   Transaction ID: ${transactionId}`);

      // Validate recipient address
      if (!ethers.isAddress(recipient)) {
        throw new Error(`Invalid recipient address: ${recipient}`);
      }

      // Convert transactionId to bytes32 format
      const transactionIdBytes32 = ethers.id(transactionId);
      
      // Check contract balance before attempting release
      const contractBalance = await this.getContractTokenBalance();
      const amountFormatted = ethers.formatUnits(amountInStablecoin, 6); // Assuming USDC with 6 decimals
      
      if (parseFloat(contractBalance) < parseFloat(amountFormatted)) {
        throw new Error(`Insufficient contract balance. Available: ${contractBalance}, Required: ${amountFormatted}`);
      }

      // Estimate gas for the transaction
      console.log('⛽ Estimating gas...');
      let gasEstimate: bigint;
      try {
        gasEstimate = await this.transferManagerContract.release.estimateGas(
          recipient,
          amountInStablecoin,
          transactionIdBytes32
        );
        console.log(`   Estimated gas: ${gasEstimate.toString()}`);
      } catch (gasError) {
        console.error('Gas estimation failed:', gasError);
        throw new Error('Transaction would fail - gas estimation failed');
      }

      // Add 20% buffer to gas estimate
      const gasLimit = (gasEstimate * 120n) / 100n;
      
      // Get current gas price
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice;
      
      if (!gasPrice) {
        throw new Error('Could not determine gas price');
      }

      console.log(`   Gas limit: ${gasLimit.toString()}`);
      console.log(`   Gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

      // Check wallet balance for gas
      const walletBalance = await this.provider.getBalance(this.wallet.address);
      const estimatedGasCost = gasLimit * gasPrice;
      
      if (walletBalance < estimatedGasCost) {
        throw new Error(`Insufficient ETH for gas. Required: ${ethers.formatEther(estimatedGasCost)} ETH, Available: ${ethers.formatEther(walletBalance)} ETH`);
      }

      // Execute the transaction
      console.log('📤 Sending transaction...');
      const tx = await this.transferManagerContract.release(
        recipient,
        amountInStablecoin,
        transactionIdBytes32,
        {
          gasLimit,
          gasPrice
        }
      );

      console.log(`   Transaction sent: ${tx.hash}`);
      console.log('⏳ Waiting for confirmation...');

      // Wait for transaction confirmation with timeout
      const receipt = await Promise.race([
        tx.wait(1), // Wait for 1 confirmation
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Transaction confirmation timeout')), 300000) // 5 minute timeout
        )
      ]);

      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }

      if (receipt.status !== 1) {
        throw new Error('Transaction failed on blockchain');
      }

      console.log('✅ Transaction confirmed!');
      console.log(`   Block number: ${receipt.blockNumber}`);
      console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
      console.log(`   Effective gas price: ${receipt.gasPrice?.toString() || 'N/A'}`);

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.gasPrice?.toString() || '0'
      };

    } catch (error) {
      console.error('❌ Blockchain transaction failed:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          throw new Error('Insufficient funds in wallet for gas fees');
        } else if (error.message.includes('nonce')) {
          throw new Error('Transaction nonce error - please retry');
        } else if (error.message.includes('gas')) {
          throw new Error('Gas estimation or execution failed');
        } else if (error.message.includes('revert')) {
          throw new Error('Smart contract execution reverted - check contract state');
        }
      }
      
      throw new Error(`Blockchain transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the balance of the server wallet in ETH
   */
  async getWalletBalance(): Promise<string> {
    if (!this.isConfigured) {
      return '0.05'; // Mock balance
    }

    if (!this.provider || !this.wallet) {
      throw new Error('Blockchain not properly initialized');
    }

    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }

  /**
   * Get the server wallet address
   */
  getWalletAddress(): string {
    if (!this.isConfigured) {
      return '0x0000000000000000000000000000000000000000'; // Mock address
    }

    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    return this.wallet.address;
  }

  /**
   * Get the contract address
   */
  getContractAddress(): string {
    if (!this.isConfigured) {
      return '0x0000000000000000000000000000000000000000'; // Mock address
    }

    if (!this.transferManagerContract) {
      throw new Error('Contract not initialized');
    }

    return this.transferManagerContract.target as string;
  }

  /**
   * Get the token balance of the contract (for stablecoins)
   */
  async getContractTokenBalance(): Promise<string> {
    if (!this.isConfigured) {
      return '1000.0'; // Mock balance
    }

    try {
      if (!this.transferManagerContract || !this.provider) {
        throw new Error('Contract or provider not initialized');
      }

      // Get the token contract address from the TransferManager
      const tokenAddress = await this.transferManagerContract.token();
      
      // Create a simple ERC20 interface to check balance
      const erc20ABI = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)'
      ];
      
      const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, this.provider);
      const balance = await tokenContract.balanceOf(this.transferManagerContract.target);
      const decimals = await tokenContract.decimals();
      
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Error getting contract token balance:', error);
      throw new Error('Failed to get contract token balance');
    }
  }

  /**
   * Check if the blockchain connection is working
   */
  async healthCheck(): Promise<{
    connected: boolean;
    mode: string;
    network: string;
    walletAddress: string;
    contractAddress: string;
    blockNumber?: number;
    walletBalance?: string;
    contractBalance?: string;
  }> {
    if (this.config.mode === 'mock') {
      return {
        connected: true,
        mode: 'mock',
        network: 'mock',
        walletAddress: '0x0000000000000000000000000000000000000000',
        contractAddress: '0x0000000000000000000000000000000000000000',
        blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
        walletBalance: '0.05',
        contractBalance: '1000.0'
      };
    }

    try {
      if (!this.provider || !this.wallet) {
        throw new Error('Provider or wallet not initialized');
      }

      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const walletBalance = await this.getWalletBalance();
      const contractBalance = await this.getContractTokenBalance();
      
      return {
        connected: true,
        mode: 'real',
        network: network.name,
        walletAddress: this.wallet.address,
        contractAddress: this.getContractAddress(),
        blockNumber,
        walletBalance,
        contractBalance
      };
    } catch (error) {
      console.error('Blockchain health check failed:', error);
      return {
        connected: false,
        mode: 'real',
        network: 'unknown',
        walletAddress: this.getWalletAddress(),
        contractAddress: this.getContractAddress()
      };
    }
  }

  /**
   * Get the current blockchain mode
   */
  getMode(): 'real' | 'mock' {
    return this.config.mode;
  }

  /**
   * Check if blockchain is in real mode and properly configured
   */
  isRealMode(): boolean {
    return this.config.mode === 'real' && this.isConfigured;
  }

  /**
   * Get transaction details from the blockchain
   */
  async getTransactionDetails(txHash: string): Promise<{
    hash: string;
    blockNumber: number;
    confirmations: number;
    status: number;
    gasUsed: string;
  } | null> {
    if (this.config.mode === 'mock') {
      console.log(`🧪 Mock blockchain: Getting transaction details for ${txHash}`);
      return {
        hash: txHash,
        blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
        confirmations: Math.floor(Math.random() * 10) + 1,
        status: 1,
        gasUsed: '21000'
      };
    }

    if (!this.isConfigured || !this.provider) {
      throw new Error('Blockchain service not properly initialized');
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
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Error getting transaction details:', error);
      return null;
    }
  }

  /**
   * Wait for a specific number of confirmations
   */
  async waitForConfirmations(txHash: string, requiredConfirmations: number = 1): Promise<boolean> {
    if (this.config.mode === 'mock') {
      console.log(`🧪 Mock blockchain: Waiting for ${requiredConfirmations} confirmations for ${txHash}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * requiredConfirmations));
      return true;
    }

    if (!this.isConfigured || !this.provider) {
      throw new Error('Blockchain service not properly initialized');
    }

    try {
      const maxWaitTime = 600000; // 10 minutes
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const details = await this.getTransactionDetails(txHash);
        
        if (!details) {
          console.log(`Transaction ${txHash} not found, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        if (details.confirmations >= requiredConfirmations) {
          console.log(`✅ Transaction ${txHash} has ${details.confirmations} confirmations`);
          return true;
        }

        console.log(`⏳ Transaction ${txHash} has ${details.confirmations}/${requiredConfirmations} confirmations`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      }

      throw new Error(`Timeout waiting for ${requiredConfirmations} confirmations`);
    } catch (error) {
      console.error('Error waiting for confirmations:', error);
      return false;
    }
  }
}