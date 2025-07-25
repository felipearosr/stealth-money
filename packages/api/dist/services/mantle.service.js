"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MantleService = void 0;
const ethers_1 = require("ethers");
const crypto_1 = __importDefault(require("crypto"));
const mantle_config_1 = require("../config/mantle.config");
/**
 * Mantle L2 Service
 * Handles all Mantle blockchain interactions including wallet management,
 * transfers, and network operations
 */
class MantleService {
    constructor() {
        this.provider = null;
        this.isInitialized = false;
        this.initializationPromise = null;
        this.config = mantle_config_1.mantleConfig.getConfig();
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
    async waitForInitialization() {
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
    }
    async initializeProvider() {
        try {
            console.log(`🔗 Initializing Mantle L2 connection to ${this.config.environment}...`);
            this.provider = new ethers_1.ethers.JsonRpcProvider(this.config.rpcUrl);
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
        }
        catch (error) {
            console.error('❌ Mantle L2 initialization failed:', error);
            console.log('⚠️  Mantle service will operate in disabled mode');
            this.isInitialized = false;
        }
    }
    /**
     * Check if the service is enabled and properly initialized
     */
    isEnabled() {
        return this.config.enabled && this.isInitialized;
    }
    /**
     * Get the current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    // ============================================================================
    // WALLET MANAGEMENT METHODS
    // ============================================================================
    /**
     * Create a new wallet for a user with secure private key handling
     */
    async createWallet(userId, options) {
        if (!this.isEnabled()) {
            throw new Error('Mantle service is not enabled or not properly initialized');
        }
        try {
            let wallet;
            let mnemonic;
            if (options?.generateMnemonic) {
                // Generate wallet from mnemonic for better backup/recovery
                wallet = ethers_1.ethers.Wallet.createRandom();
                if (wallet.mnemonic) {
                    mnemonic = wallet.mnemonic.phrase;
                }
            }
            else {
                // Generate simple random wallet
                wallet = ethers_1.ethers.Wallet.createRandom();
            }
            // Encrypt private key if requested (for secure storage)
            let encryptedPrivateKey;
            if (options?.encryptPrivateKey) {
                encryptedPrivateKey = await this.encryptPrivateKey(wallet.privateKey, userId);
            }
            const mantleWallet = {
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
        }
        catch (error) {
            console.error('❌ Failed to create Mantle wallet:', error);
            throw new Error(`Failed to create Mantle wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Create wallet from existing mnemonic phrase
     */
    async createWalletFromMnemonic(userId, mnemonic, derivationPath) {
        if (!this.isEnabled()) {
            throw new Error('Mantle service is not enabled or not properly initialized');
        }
        try {
            // Validate mnemonic
            if (!ethers_1.ethers.Mnemonic.isValidMnemonic(mnemonic)) {
                throw new Error('Invalid mnemonic phrase');
            }
            // Create wallet from mnemonic
            const hdNode = ethers_1.ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, derivationPath || "m/44'/60'/0'/0/0");
            const mantleWallet = {
                id: `mantle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                address: hdNode.address,
                userId,
                createdAt: new Date()
            };
            console.log(`✅ Created Mantle wallet from mnemonic for user ${userId}: ${hdNode.address}`);
            return mantleWallet;
        }
        catch (error) {
            console.error('❌ Failed to create wallet from mnemonic:', error);
            throw new Error(`Failed to create wallet from mnemonic: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Create wallet from private key
     */
    async createWalletFromPrivateKey(userId, privateKey) {
        if (!this.isEnabled()) {
            throw new Error('Mantle service is not enabled or not properly initialized');
        }
        try {
            // Validate and create wallet from private key
            const wallet = new ethers_1.ethers.Wallet(privateKey);
            const mantleWallet = {
                id: `mantle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                address: wallet.address,
                userId,
                createdAt: new Date()
            };
            console.log(`✅ Created Mantle wallet from private key for user ${userId}: ${wallet.address}`);
            return mantleWallet;
        }
        catch (error) {
            console.error('❌ Failed to create wallet from private key:', error);
            throw new Error(`Failed to create wallet from private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Derive wallet address from public key or other identifier
     */
    deriveWalletAddress(publicKey) {
        try {
            // For Ethereum-compatible addresses, derive from public key
            const address = ethers_1.ethers.computeAddress(publicKey);
            return address;
        }
        catch (error) {
            console.error('❌ Failed to derive wallet address:', error);
            throw new Error(`Failed to derive wallet address: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Validate if an address is a valid Ethereum address
     */
    isValidAddress(address) {
        try {
            return ethers_1.ethers.isAddress(address);
        }
        catch {
            return false;
        }
    }
    /**
     * Get wallet information without sensitive data
     */
    async getWalletInfo(walletAddress) {
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
        }
        catch (error) {
            console.error('❌ Failed to get wallet info:', error);
            throw new Error(`Failed to get wallet info: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Encrypt private key for secure storage
     */
    async encryptPrivateKey(privateKey, userId) {
        try {
            // In production, use a proper key derivation function and secure key management
            // This is a simplified example - use HSM or proper key management in production
            const password = `${userId}_${process.env.ENCRYPTION_KEY || 'default_key'}`;
            const algorithm = 'aes-256-cbc';
            const iv = crypto_1.default.randomBytes(16);
            // Create a key from the password (in production, use proper key derivation)
            const key = crypto_1.default.createHash('sha256').update(password).digest();
            const cipher = crypto_1.default.createCipheriv(algorithm, key, iv);
            let encrypted = cipher.update(privateKey, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return `${iv.toString('hex')}:${encrypted}`;
        }
        catch (error) {
            console.error('❌ Failed to encrypt private key:', error);
            throw new Error('Failed to encrypt private key');
        }
    }
    /**
     * Decrypt private key (for internal use only)
     */
    async decryptPrivateKey(encryptedPrivateKey, userId) {
        try {
            const password = `${userId}_${process.env.ENCRYPTION_KEY || 'default_key'}`;
            const algorithm = 'aes-256-cbc';
            const [ivHex, encrypted] = encryptedPrivateKey.split(':');
            if (!ivHex || !encrypted) {
                throw new Error('Invalid encrypted private key format');
            }
            const iv = Buffer.from(ivHex, 'hex');
            const key = crypto_1.default.createHash('sha256').update(password).digest();
            const decipher = crypto_1.default.createDecipheriv(algorithm, key, iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            console.error('❌ Failed to decrypt private key:', error);
            throw new Error('Failed to decrypt private key');
        }
    }
    /**
     * Get wallet balance for native token and stablecoin with USD values
     */
    async getWalletBalance(walletAddress, includeUSDValues = true) {
        if (!this.isEnabled() || !this.provider) {
            throw new Error('Mantle service is not enabled or not properly initialized');
        }
        try {
            // Get native token (MNT) balance
            const nativeBalance = await this.provider.getBalance(walletAddress);
            const nativeBalanceFormatted = ethers_1.ethers.formatEther(nativeBalance);
            // Get stablecoin (USDC) balance
            let stablecoinBalance = '0';
            if (this.config.stablecoinAddress) {
                try {
                    // ERC20 ABI for balance checking
                    const erc20ABI = [
                        'function balanceOf(address owner) view returns (uint256)',
                        'function decimals() view returns (uint8)'
                    ];
                    const tokenContract = new ethers_1.ethers.Contract(this.config.stablecoinAddress, erc20ABI, this.provider);
                    const balance = await tokenContract.balanceOf(walletAddress);
                    const decimals = await tokenContract.decimals();
                    stablecoinBalance = ethers_1.ethers.formatUnits(balance, decimals);
                }
                catch (tokenError) {
                    console.warn(`⚠️  Could not fetch stablecoin balance: ${tokenError}`);
                    stablecoinBalance = '0';
                }
            }
            // Calculate USD values if requested
            let nativeUSD;
            let stablecoinUSD;
            let totalUSD;
            if (includeUSDValues) {
                try {
                    // Get current prices (in production, use a proper price oracle)
                    const mntPriceUSD = await this.getMNTPriceUSD();
                    const usdcPriceUSD = 1.0; // USDC is pegged to USD
                    nativeUSD = (parseFloat(nativeBalanceFormatted) * mntPriceUSD).toFixed(6);
                    stablecoinUSD = (parseFloat(stablecoinBalance) * usdcPriceUSD).toFixed(6);
                    totalUSD = (parseFloat(nativeUSD) + parseFloat(stablecoinUSD)).toFixed(6);
                }
                catch (priceError) {
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
        }
        catch (error) {
            console.error('❌ Failed to get wallet balance:', error);
            throw new Error(`Failed to get wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get balance for a specific ERC20 token
     */
    async getTokenBalance(walletAddress, tokenAddress) {
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
            const tokenContract = new ethers_1.ethers.Contract(tokenAddress, erc20ABI, this.provider);
            const [balance, decimals, symbol, name] = await Promise.all([
                tokenContract.balanceOf(walletAddress),
                tokenContract.decimals(),
                tokenContract.symbol(),
                tokenContract.name()
            ]);
            const balanceFormatted = ethers_1.ethers.formatUnits(balance, decimals);
            return {
                address: tokenAddress,
                symbol,
                name,
                balance: balanceFormatted,
                decimals: Number(decimals)
            };
        }
        catch (error) {
            console.error('❌ Failed to get token balance:', error);
            throw new Error(`Failed to get token balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get balances for multiple tokens
     */
    async getMultipleTokenBalances(walletAddress, tokenAddresses) {
        if (!this.isEnabled() || !this.provider) {
            throw new Error('Mantle service is not enabled or not properly initialized');
        }
        try {
            const balancePromises = tokenAddresses.map(tokenAddress => this.getTokenBalance(walletAddress, tokenAddress).catch(error => {
                console.warn(`⚠️  Failed to get balance for token ${tokenAddress}: ${error}`);
                return null;
            }));
            const results = await Promise.all(balancePromises);
            return results.filter((balance) => balance !== null);
        }
        catch (error) {
            console.error('❌ Failed to get multiple token balances:', error);
            throw new Error(`Failed to get multiple token balances: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get MNT price in USD (simplified implementation)
     * In production, integrate with a proper price oracle like Chainlink or CoinGecko
     */
    async getMNTPriceUSD() {
        try {
            // This is a simplified implementation
            // In production, you would fetch from a reliable price oracle
            // For now, return a mock price
            return 0.50; // $0.50 per MNT
        }
        catch (error) {
            console.warn('⚠️  Failed to fetch MNT price, using fallback');
            return 0.50; // Fallback price
        }
    }
    /**
     * Estimate gas cost for a transfer operation
     */
    async estimateGasCost(amount, currency) {
        if (!this.isEnabled() || !this.provider) {
            throw new Error('Mantle service is not enabled or not properly initialized');
        }
        try {
            // Get current gas price
            const feeData = await this.provider.getFeeData();
            const gasPrice = feeData.gasPrice || ethers_1.ethers.parseUnits('0.001', 'gwei'); // Fallback gas price
            // Use configured gas limit for transfers
            const gasLimit = BigInt(this.config.gasLimit.transfer);
            // Calculate total cost in native token
            const totalCostWei = gasLimit * gasPrice;
            const totalCost = ethers_1.ethers.formatEther(totalCostWei);
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
        }
        catch (error) {
            console.error('❌ Failed to estimate gas cost:', error);
            throw new Error(`Failed to estimate gas cost: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get current network status and health information
     */
    async getCurrentNetworkStatus() {
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
        }
        catch (error) {
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
    async healthCheck() {
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
        }
        catch (error) {
            return {
                ...baseStatus,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get transaction details from the Mantle network
     */
    async getTransactionDetails(txHash) {
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
        }
        catch (error) {
            console.error('❌ Error getting transaction details:', error);
            return null;
        }
    }
    /**
     * Wait for transaction confirmations
     */
    async waitForConfirmations(txHash, requiredConfirmations) {
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
        }
        catch (error) {
            console.error('❌ Error waiting for confirmations:', error);
            return false;
        }
    }
    // ============================================================================
    // TRANSFER INITIATION AND MONITORING METHODS
    // ============================================================================
    /**
     * Initiate a Mantle L2 transfer
     */
    async initiateTransfer(request) {
        if (!this.isEnabled() || !this.provider) {
            throw new Error('Mantle service is not enabled or not properly initialized');
        }
        const transferId = `mantle_transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();
        try {
            console.log(`🚀 Initiating Mantle transfer ${transferId}...`);
            console.log(`   From: ${request.fromAddress}`);
            console.log(`   To: ${request.toAddress}`);
            console.log(`   Amount: ${request.amount}`);
            console.log(`   Token: ${request.tokenAddress || 'Native MNT'}`);
            // Validate addresses
            if (!this.isValidAddress(request.fromAddress)) {
                throw new Error(`Invalid sender address: ${request.fromAddress}`);
            }
            if (!this.isValidAddress(request.toAddress)) {
                throw new Error(`Invalid recipient address: ${request.toAddress}`);
            }
            // Get gas estimate for the transfer
            const gasEstimate = await this.estimateTransferGas(request);
            console.log(`💰 Gas estimate: ${gasEstimate.totalCostUSD} USD`);
            // Check if sender has sufficient balance
            await this.validateSufficientBalance(request, gasEstimate);
            // Create and sign the transaction
            const transaction = await this.createTransferTransaction(request, gasEstimate);
            // Send the transaction
            const txResponse = await this.sendTransaction(transaction, request.userId);
            console.log(`✅ Transaction sent: ${txResponse.hash}`);
            console.log(`   Block: ${txResponse.blockNumber || 'Pending'}`);
            console.log(`   Gas Price: ${txResponse.gasPrice} wei`);
            return {
                transferId,
                transactionHash: txResponse.hash,
                status: 'PENDING',
                gasEstimate,
                createdAt: now,
                updatedAt: now
            };
        }
        catch (error) {
            console.error(`❌ Failed to initiate transfer ${transferId}:`, error);
            return {
                transferId,
                status: 'FAILED',
                gasEstimate: await this.estimateTransferGas(request).catch(() => ({
                    gasLimit: '0',
                    gasPrice: '0',
                    totalCost: '0',
                    totalCostUSD: '0'
                })),
                error: error instanceof Error ? error.message : 'Unknown error',
                createdAt: now,
                updatedAt: now
            };
        }
    }
    /**
     * Get the current status of a transfer
     */
    async getTransferStatus(transferId) {
        if (!this.isEnabled() || !this.provider) {
            throw new Error('Mantle service is not enabled or not properly initialized');
        }
        try {
            // In a real implementation, you would fetch this from your database
            // For now, we'll simulate the status check
            console.log(`🔍 Checking status for transfer ${transferId}...`);
            // This is a placeholder - in production, you'd query your database
            // to get the transaction hash associated with this transferId
            const transactionHash = await this.getTransactionHashForTransfer(transferId);
            if (!transactionHash) {
                return {
                    transferId,
                    status: 'PENDING',
                    confirmations: 0,
                    updatedAt: new Date()
                };
            }
            // Get transaction details from the blockchain
            const txDetails = await this.getTransactionDetails(transactionHash);
            if (!txDetails) {
                return {
                    transferId,
                    transactionHash,
                    status: 'PENDING',
                    confirmations: 0,
                    updatedAt: new Date()
                };
            }
            // Determine status based on confirmations
            const requiredConfirmations = this.config.confirmationBlocks;
            const isConfirmed = txDetails.confirmations >= requiredConfirmations;
            const status = txDetails.status === 1
                ? (isConfirmed ? 'CONFIRMED' : 'PENDING')
                : 'FAILED';
            // Calculate gas cost in USD
            const gasCostWei = BigInt(txDetails.gasUsed) * BigInt(txDetails.gasPrice);
            const gasCost = ethers_1.ethers.formatEther(gasCostWei);
            const mntPriceUSD = await this.getMNTPriceUSD();
            const gasCostUSD = (parseFloat(gasCost) * mntPriceUSD).toFixed(6);
            return {
                transferId,
                transactionHash,
                status,
                blockNumber: txDetails.blockNumber,
                confirmations: txDetails.confirmations,
                gasUsed: txDetails.gasUsed,
                gasCost,
                gasCostUSD,
                updatedAt: new Date()
            };
        }
        catch (error) {
            console.error(`❌ Failed to get transfer status for ${transferId}:`, error);
            return {
                transferId,
                status: 'FAILED',
                confirmations: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
                updatedAt: new Date()
            };
        }
    }
    /**
     * Estimate gas cost for a specific transfer
     */
    async estimateTransferGas(request) {
        if (!this.isEnabled() || !this.provider) {
            throw new Error('Mantle service is not enabled or not properly initialized');
        }
        try {
            let gasLimit;
            let gasPrice;
            // Get current gas price or use provided one
            if (request.gasPrice) {
                gasPrice = BigInt(request.gasPrice);
            }
            else {
                const feeData = await this.provider.getFeeData();
                gasPrice = feeData.gasPrice || ethers_1.ethers.parseUnits('0.001', 'gwei');
            }
            // Estimate gas limit based on transfer type
            if (request.tokenAddress) {
                // ERC20 token transfer
                gasLimit = request.gasLimit
                    ? BigInt(request.gasLimit)
                    : BigInt(this.config.gasLimit.transfer);
                // For more accurate estimation, we could simulate the transaction
                try {
                    const erc20ABI = [
                        'function transfer(address to, uint256 amount) returns (bool)'
                    ];
                    const tokenContract = new ethers_1.ethers.Contract(request.tokenAddress, erc20ABI, this.provider);
                    // Parse amount based on token decimals
                    const tokenInfo = await this.getTokenBalance(request.fromAddress, request.tokenAddress);
                    const amountWei = ethers_1.ethers.parseUnits(request.amount, tokenInfo.decimals);
                    // Estimate gas for the actual transaction
                    const estimatedGas = await tokenContract.transfer.estimateGas(request.toAddress, amountWei);
                    gasLimit = estimatedGas + BigInt(10000); // Add buffer for safety
                }
                catch (estimationError) {
                    console.warn(`⚠️  Could not estimate gas for token transfer, using default: ${estimationError}`);
                    // Use default gas limit if estimation fails
                }
            }
            else {
                // Native token (MNT) transfer
                gasLimit = BigInt(21000); // Standard ETH transfer gas limit
                try {
                    // Estimate gas for native transfer
                    const amountWei = ethers_1.ethers.parseEther(request.amount);
                    const estimatedGas = await this.provider.estimateGas({
                        to: request.toAddress,
                        value: amountWei,
                        from: request.fromAddress
                    });
                    gasLimit = estimatedGas + BigInt(5000); // Add buffer
                }
                catch (estimationError) {
                    console.warn(`⚠️  Could not estimate gas for native transfer, using default: ${estimationError}`);
                }
            }
            // Calculate total cost
            const totalCostWei = gasLimit * gasPrice;
            const totalCost = ethers_1.ethers.formatEther(totalCostWei);
            // Convert to USD
            const mntPriceUSD = await this.getMNTPriceUSD();
            const totalCostUSD = (parseFloat(totalCost) * mntPriceUSD).toFixed(6);
            return {
                gasLimit: gasLimit.toString(),
                gasPrice: gasPrice.toString(),
                totalCost,
                totalCostUSD
            };
        }
        catch (error) {
            console.error('❌ Failed to estimate transfer gas:', error);
            throw new Error(`Failed to estimate transfer gas: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Monitor a transfer until completion or failure
     */
    async monitorTransfer(transferId, onStatusUpdate, maxWaitTime = 600000 // 10 minutes default
    ) {
        if (!this.isEnabled()) {
            throw new Error('Mantle service is not enabled or not properly initialized');
        }
        const startTime = Date.now();
        const pollInterval = 5000; // 5 seconds
        console.log(`👀 Monitoring transfer ${transferId}...`);
        try {
            while (Date.now() - startTime < maxWaitTime) {
                const status = await this.getTransferStatus(transferId);
                // Call status update callback if provided
                if (onStatusUpdate) {
                    onStatusUpdate(status);
                }
                // Check if transfer is in a final state
                if (status.status === 'CONFIRMED') {
                    console.log(`✅ Transfer ${transferId} confirmed!`);
                    return status;
                }
                if (status.status === 'FAILED') {
                    console.log(`❌ Transfer ${transferId} failed: ${status.error}`);
                    return status;
                }
                // Log progress for pending transfers
                if (status.status === 'PENDING' && status.confirmations !== undefined) {
                    const required = this.config.confirmationBlocks;
                    console.log(`⏳ Transfer ${transferId}: ${status.confirmations}/${required} confirmations`);
                }
                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
            // Timeout reached
            const finalStatus = await this.getTransferStatus(transferId);
            console.warn(`⏰ Transfer ${transferId} monitoring timed out after ${maxWaitTime}ms`);
            return {
                ...finalStatus,
                error: finalStatus.error || 'Monitoring timeout - transfer may still be processing'
            };
        }
        catch (error) {
            console.error(`❌ Error monitoring transfer ${transferId}:`, error);
            return {
                transferId,
                status: 'FAILED',
                confirmations: 0,
                error: error instanceof Error ? error.message : 'Monitoring error',
                updatedAt: new Date()
            };
        }
    }
    // ============================================================================
    // PRIVATE HELPER METHODS FOR TRANSFERS
    // ============================================================================
    /**
     * Validate that sender has sufficient balance for the transfer
     */
    async validateSufficientBalance(request, gasEstimate) {
        try {
            const balance = await this.getWalletBalance(request.fromAddress);
            if (request.tokenAddress) {
                // ERC20 token transfer - check token balance
                const tokenBalance = await this.getTokenBalance(request.fromAddress, request.tokenAddress);
                const requestedAmount = parseFloat(request.amount);
                const availableAmount = parseFloat(tokenBalance.balance);
                if (requestedAmount > availableAmount) {
                    throw new Error(`Insufficient token balance. Requested: ${request.amount} ${tokenBalance.symbol}, Available: ${tokenBalance.balance} ${tokenBalance.symbol}`);
                }
                // Also check native balance for gas
                const gasNeeded = parseFloat(gasEstimate.totalCost);
                const nativeAvailable = parseFloat(balance.native);
                if (gasNeeded > nativeAvailable) {
                    throw new Error(`Insufficient MNT for gas. Needed: ${gasEstimate.totalCost} MNT, Available: ${balance.native} MNT`);
                }
            }
            else {
                // Native token transfer - check total needed (amount + gas)
                const requestedAmount = parseFloat(request.amount);
                const gasNeeded = parseFloat(gasEstimate.totalCost);
                const totalNeeded = requestedAmount + gasNeeded;
                const available = parseFloat(balance.native);
                if (totalNeeded > available) {
                    throw new Error(`Insufficient MNT balance. Needed: ${totalNeeded.toFixed(6)} MNT (${request.amount} + ${gasEstimate.totalCost} gas), Available: ${balance.native} MNT`);
                }
            }
            console.log(`✅ Balance validation passed for ${request.fromAddress}`);
        }
        catch (error) {
            console.error('❌ Balance validation failed:', error);
            throw error;
        }
    }
    /**
     * Create a transaction object for the transfer
     */
    async createTransferTransaction(request, gasEstimate) {
        try {
            const transaction = {
                from: request.fromAddress,
                gasLimit: gasEstimate.gasLimit,
                gasPrice: gasEstimate.gasPrice
            };
            if (request.tokenAddress) {
                // ERC20 token transfer
                const erc20ABI = [
                    'function transfer(address to, uint256 amount) returns (bool)'
                ];
                // Get token decimals for proper amount formatting
                const tokenInfo = await this.getTokenBalance(request.fromAddress, request.tokenAddress);
                const amountWei = ethers_1.ethers.parseUnits(request.amount, tokenInfo.decimals);
                // Create contract interface for encoding
                const iface = new ethers_1.ethers.Interface(erc20ABI);
                const data = iface.encodeFunctionData('transfer', [request.toAddress, amountWei]);
                transaction.to = request.tokenAddress;
                transaction.data = data;
                transaction.value = '0';
            }
            else {
                // Native token (MNT) transfer
                const amountWei = ethers_1.ethers.parseEther(request.amount);
                transaction.to = request.toAddress;
                transaction.value = amountWei.toString();
            }
            return transaction;
        }
        catch (error) {
            console.error('❌ Failed to create transfer transaction:', error);
            throw new Error(`Failed to create transfer transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Send a signed transaction to the network
     */
    async sendTransaction(transaction, userId) {
        if (!this.provider) {
            throw new Error('Provider not initialized');
        }
        try {
            // In a real implementation, you would:
            // 1. Retrieve the encrypted private key from secure storage
            // 2. Decrypt it using the userId
            // 3. Create a wallet instance
            // 4. Sign and send the transaction
            // For this implementation, we'll simulate the process
            // In production, you MUST implement proper key management
            console.log('🔐 Signing transaction...');
            // This is a placeholder - in production you would:
            // const encryptedKey = await this.getEncryptedPrivateKey(userId, transaction.from);
            // const privateKey = await this.decryptPrivateKey(encryptedKey, userId);
            // const wallet = new ethers.Wallet(privateKey, this.provider);
            // const signedTx = await wallet.sendTransaction(transaction);
            // For now, we'll simulate a successful transaction
            const mockTxResponse = {
                hash: `0x${crypto_1.default.randomBytes(32).toString('hex')}`,
                blockNumber: undefined, // Will be set when mined
                gasPrice: BigInt(transaction.gasPrice)
            };
            console.log(`📡 Transaction sent: ${mockTxResponse.hash}`);
            return mockTxResponse;
        }
        catch (error) {
            console.error('❌ Failed to send transaction:', error);
            throw new Error(`Failed to send transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get transaction hash for a transfer ID (placeholder for database lookup)
     */
    async getTransactionHashForTransfer(transferId) {
        // In a real implementation, this would query your database
        // to get the transaction hash associated with the transfer ID
        // For now, we'll simulate this by extracting from the transferId
        // In production, you would do something like:
        // const transfer = await db.mantleTransfer.findUnique({ where: { id: transferId } });
        // return transfer?.transactionHash || null;
        console.log(`🔍 Looking up transaction hash for transfer ${transferId}...`);
        // Simulate database lookup delay
        await new Promise(resolve => setTimeout(resolve, 100));
        // Return null to simulate a transfer that hasn't been sent yet
        // In a real implementation, this would return the actual transaction hash
        return null;
    }
    // ============================================================================
    // CONVERSION AND EXCHANGE METHODS
    // ============================================================================
    /**
     * Convert fiat currency to stablecoin for Mantle transfers
     */
    async convertToStablecoin(amount, fromCurrency) {
        if (!this.isEnabled()) {
            throw new Error('Mantle service is not enabled or not properly initialized');
        }
        try {
            console.log(`💱 Converting ${amount} ${fromCurrency} to stablecoin...`);
            // In production, integrate with a proper DEX or exchange API
            // For now, we'll simulate the conversion
            let exchangeRate;
            let toAmount;
            if (fromCurrency === 'USD') {
                // Direct 1:1 conversion to USDC
                exchangeRate = 1.0;
                toAmount = amount;
            }
            else {
                // Simulate exchange rate lookup
                // In production, fetch from a reliable price feed
                const rates = {
                    'EUR': 1.08, // 1 EUR = 1.08 USD
                    'GBP': 1.25, // 1 GBP = 1.25 USD
                    'CLP': 0.001, // 1 CLP = 0.001 USD
                    'MXN': 0.055 // 1 MXN = 0.055 USD
                };
                exchangeRate = rates[fromCurrency] || 1.0;
                toAmount = amount * exchangeRate;
            }
            // Estimate gas for the conversion (if swapping is needed)
            const gasEstimate = await this.estimateGasCost(toAmount, 'USDC');
            // Calculate slippage (simplified)
            const slippage = '0.5'; // 0.5% slippage
            return {
                fromAmount: amount.toString(),
                toAmount: toAmount.toString(),
                exchangeRate: exchangeRate.toString(),
                slippage,
                estimatedGas: gasEstimate,
                route: fromCurrency === 'USD' ? ['USDC'] : [fromCurrency, 'USD', 'USDC']
            };
        }
        catch (error) {
            console.error('❌ Failed to convert to stablecoin:', error);
            throw new Error(`Failed to convert to stablecoin: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Convert stablecoin back to fiat currency
     */
    async convertFromStablecoin(amount, toCurrency) {
        if (!this.isEnabled()) {
            throw new Error('Mantle service is not enabled or not properly initialized');
        }
        try {
            console.log(`💱 Converting ${amount} USDC to ${toCurrency}...`);
            let exchangeRate;
            let toAmount;
            if (toCurrency === 'USD') {
                // Direct 1:1 conversion from USDC
                exchangeRate = 1.0;
                toAmount = amount;
            }
            else {
                // Simulate exchange rate lookup
                const rates = {
                    'EUR': 0.926, // 1 USD = 0.926 EUR
                    'GBP': 0.80, // 1 USD = 0.80 GBP
                    'CLP': 1000, // 1 USD = 1000 CLP
                    'MXN': 18.18 // 1 USD = 18.18 MXN
                };
                exchangeRate = rates[toCurrency] || 1.0;
                toAmount = amount * exchangeRate;
            }
            // Estimate gas for the conversion
            const gasEstimate = await this.estimateGasCost(amount, 'USDC');
            // Calculate slippage
            const slippage = '0.5'; // 0.5% slippage
            return {
                fromAmount: amount.toString(),
                toAmount: toAmount.toString(),
                exchangeRate: exchangeRate.toString(),
                slippage,
                estimatedGas: gasEstimate,
                route: toCurrency === 'USD' ? ['USDC'] : ['USDC', 'USD', toCurrency]
            };
        }
        catch (error) {
            console.error('❌ Failed to convert from stablecoin:', error);
            throw new Error(`Failed to convert from stablecoin: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.MantleService = MantleService;
