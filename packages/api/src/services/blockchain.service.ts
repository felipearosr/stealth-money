// src/services/blockchain.service.ts
import { ethers } from 'ethers';
import TransferManagerABI from '../config/abis/TransferManager.json';

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private transferManagerContract: ethers.Contract;

  constructor() {
    // Initialize provider and wallet
    const nodeProviderUrl = process.env.NODE_PROVIDER_URL;
    const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
    const contractAddress = process.env.TRANSFER_MANAGER_CONTRACT_ADDRESS;

    if (!nodeProviderUrl || !privateKey || !contractAddress) {
      throw new Error('Missing required blockchain environment variables');
    }

    this.provider = new ethers.JsonRpcProvider(nodeProviderUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.transferManagerContract = new ethers.Contract(
      contractAddress,
      TransferManagerABI.abi,
      this.wallet
    );
  }

  /**
   * Calls the 'release' function on the smart contract to send funds.
   * NOTE: This is a placeholder. In a real app, this is called *after* a user's payment is confirmed.
   */
  async releaseFunds(
    recipient: string,
    amountInStablecoin: ethers.BigNumberish,
    transactionId: string
  ): Promise<string> {
    try {
      // Convert transactionId to bytes32 format
      const transactionIdBytes32 = ethers.id(transactionId);
      
      // The 'release' function on the contract needs to be defined to accept these parameters
      const tx = await this.transferManagerContract.release(
        recipient,
        amountInStablecoin,
        transactionIdBytes32
      );
      
      await tx.wait(); // Wait for the transaction to be mined
      console.log(`Funds released. Transaction hash: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      console.error('Error releasing funds on-chain:', error);
      throw new Error('Blockchain transaction failed.');
    }
  }

  /**
   * Get the balance of the server wallet in ETH
   */
  async getWalletBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }

  /**
   * Get the server wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get the contract address
   */
  getContractAddress(): string {
    return this.transferManagerContract.target as string;
  }

  /**
   * Get the token balance of the contract (for stablecoins)
   */
  async getContractTokenBalance(): Promise<string> {
    try {
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
    network: string;
    walletAddress: string;
    contractAddress: string;
    blockNumber?: number;
  }> {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      
      return {
        connected: true,
        network: network.name,
        walletAddress: this.wallet.address,
        contractAddress: this.transferManagerContract.target as string,
        blockNumber
      };
    } catch (error) {
      console.error('Blockchain health check failed:', error);
      return {
        connected: false,
        network: 'unknown',
        walletAddress: this.wallet.address,
        contractAddress: this.transferManagerContract.target as string
      };
    }
  }
}