"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferService = exports.TransferMethod = exports.TransferStatus = void 0;
const circle_payment_service_1 = require("./circle-payment.service");
const circle_wallet_service_1 = require("./circle-wallet.service");
const circle_payout_service_1 = require("./circle-payout.service");
const mantle_service_1 = require("./mantle.service");
/**
 * Transfer status enum matching the database model
 */
var TransferStatus;
(function (TransferStatus) {
    TransferStatus["INITIATED"] = "INITIATED";
    TransferStatus["PAYMENT_PROCESSING"] = "PAYMENT_PROCESSING";
    TransferStatus["TRANSFERRING"] = "TRANSFERRING";
    TransferStatus["PAYING_OUT"] = "PAYING_OUT";
    TransferStatus["COMPLETED"] = "COMPLETED";
    TransferStatus["FAILED"] = "FAILED";
})(TransferStatus || (exports.TransferStatus = TransferStatus = {}));
/**
 * Transfer method enum
 */
var TransferMethod;
(function (TransferMethod) {
    TransferMethod["CIRCLE"] = "circle";
    TransferMethod["MANTLE"] = "mantle";
})(TransferMethod || (exports.TransferMethod = TransferMethod = {}));
/**
 * Main Transfer Service that orchestrates the complete international transfer flow
 * Coordinates Circle Payment, Wallet, and Payout services to provide seamless transfers
 * Now supports both Circle and Mantle L2 transfer methods
 */
class TransferService {
    constructor() {
        this.transfers = new Map(); // In-memory storage for demo
        this.paymentService = new circle_payment_service_1.CirclePaymentService();
        this.walletService = new circle_wallet_service_1.CircleWalletService();
        this.payoutService = new circle_payout_service_1.CirclePayoutService();
        this.mantleService = new mantle_service_1.MantleService();
    }
    /**
     * Create and process a complete international transfer
     * This is the main orchestration method that coordinates all services
     */
    async createTransfer(request) {
        const transferId = this.generateTransferId();
        const timeline = [];
        try {
            // Calculate receive amount if not provided
            const receiveAmount = request.sendAmount * (request.exchangeRate || 0.85); // Default rate for demo
            const fees = this.calculateFees(request.sendAmount);
            // Initialize transfer record
            const transfer = {
                id: transferId,
                status: TransferStatus.INITIATED,
                sendAmount: request.sendAmount,
                sendCurrency: request.sendCurrency,
                receiveAmount,
                receiveCurrency: request.receiveCurrency,
                exchangeRate: request.exchangeRate || 0.85,
                fees,
                recipientInfo: request.recipientInfo,
                estimatedCompletion: this.calculateEstimatedCompletion(),
                createdAt: new Date(),
                updatedAt: new Date(),
                timeline,
                metadata: { ...request.metadata, userId: request.userId }
            };
            this.transfers.set(transferId, transfer);
            this.addTimelineEvent(transfer, 'payment_created', 'pending', 'Transfer initiated');
            // Step 1: Process card payment to USDC
            await this.processPayment(transfer, request.cardDetails);
            // Step 2: Create wallets for sender and recipient
            await this.createWallets(transfer, request.userId);
            // Step 3: Transfer USDC between wallets
            await this.transferFunds(transfer);
            // Step 4: Payout EUR to recipient bank account
            await this.processPayoutAsync(transfer);
            return transfer;
        }
        catch (error) {
            console.error(`Transfer ${transferId} failed:`, error);
            const transfer = this.transfers.get(transferId);
            if (transfer) {
                transfer.status = TransferStatus.FAILED;
                transfer.updatedAt = new Date();
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.addTimelineEvent(transfer, 'transfer_failed', 'failed', `Transfer failed: ${errorMessage}`);
            }
            throw error;
        }
    }
    /**
     * Get transfer status by ID
     */
    async getTransferStatus(transferId) {
        const transfer = this.transfers.get(transferId);
        if (!transfer) {
            throw new Error(`Transfer ${transferId} not found`);
        }
        // Update status if needed by checking external services
        await this.updateTransferStatus(transfer);
        return {
            id: transfer.id,
            status: transfer.status,
            sendAmount: transfer.sendAmount,
            receiveAmount: transfer.receiveAmount,
            sendCurrency: transfer.sendCurrency,
            receiveCurrency: transfer.receiveCurrency,
            exchangeRate: transfer.exchangeRate,
            fees: transfer.fees,
            timeline: transfer.timeline,
            estimatedCompletion: transfer.estimatedCompletion,
            completedAt: transfer.status === TransferStatus.COMPLETED ? transfer.updatedAt : undefined,
            errorMessage: transfer.timeline.find(e => e.status === 'failed')?.message
        };
    }
    /**
     * Get all transfers for a user
     */
    async getUserTransfers(userId) {
        return Array.from(this.transfers.values())
            .filter(transfer => transfer.metadata?.userId === userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    /**
     * Cancel a transfer if possible
     */
    async cancelTransfer(transferId) {
        const transfer = this.transfers.get(transferId);
        if (!transfer) {
            throw new Error(`Transfer ${transferId} not found`);
        }
        // Can only cancel if still in early stages
        if (transfer.status === TransferStatus.INITIATED || transfer.status === TransferStatus.PAYMENT_PROCESSING) {
            transfer.status = TransferStatus.FAILED;
            transfer.updatedAt = new Date();
            this.addTimelineEvent(transfer, 'transfer_failed', 'failed', 'Transfer cancelled by user');
            return true;
        }
        return false;
    }
    /**
     * Process card payment to USDC
     */
    async processPayment(transfer, cardDetails) {
        try {
            transfer.status = TransferStatus.PAYMENT_PROCESSING;
            transfer.updatedAt = new Date();
            this.addTimelineEvent(transfer, 'payment_created', 'pending', 'Processing card payment');
            const payment = await this.paymentService.createPayment({
                amount: transfer.sendAmount,
                currency: 'USD',
                cardDetails,
                description: `International transfer ${transfer.id}`,
                metadata: { transferId: transfer.id }
            });
            transfer.paymentId = payment.id;
            this.addTimelineEvent(transfer, 'payment_created', 'success', 'Card payment created successfully');
            // Wait for payment confirmation
            const confirmedPayment = await this.paymentService.waitForPaymentConfirmation(payment.id);
            transfer.fees += confirmedPayment.fees || 0;
            this.addTimelineEvent(transfer, 'payment_confirmed', 'success', 'Payment confirmed and USDC received');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.addTimelineEvent(transfer, 'payment_created', 'failed', `Payment failed: ${errorMessage}`);
            throw error;
        }
    }
    /**
     * Create wallets for sender and recipient
     */
    async createWallets(transfer, userId) {
        try {
            this.addTimelineEvent(transfer, 'wallets_created', 'pending', 'Creating secure wallets');
            // Create sender wallet
            const senderWallet = await this.walletService.createWallet({
                userId: userId || `sender-${transfer.id}`,
                description: `Sender wallet for transfer ${transfer.id}`,
                metadata: { transferId: transfer.id, role: 'sender' }
            });
            // Create recipient wallet
            const recipientWallet = await this.walletService.createWallet({
                userId: `recipient-${transfer.id}`,
                description: `Recipient wallet for transfer ${transfer.id}`,
                metadata: { transferId: transfer.id, role: 'recipient' }
            });
            transfer.senderWalletId = senderWallet.walletId;
            transfer.recipientWalletId = recipientWallet.walletId;
            this.addTimelineEvent(transfer, 'wallets_created', 'success', 'Secure wallets created successfully');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.addTimelineEvent(transfer, 'wallets_created', 'failed', `Wallet creation failed: ${errorMessage}`);
            throw error;
        }
    }
    /**
     * Transfer USDC between wallets
     */
    async transferFunds(transfer) {
        try {
            transfer.status = TransferStatus.TRANSFERRING;
            transfer.updatedAt = new Date();
            this.addTimelineEvent(transfer, 'transfer_initiated', 'pending', 'Transferring funds to recipient wallet');
            if (!transfer.senderWalletId || !transfer.recipientWalletId) {
                throw new Error('Wallet IDs not found');
            }
            const walletTransfer = await this.walletService.createTransfer({
                sourceWalletId: transfer.senderWalletId,
                destinationWalletId: transfer.recipientWalletId,
                amount: transfer.sendAmount.toString(),
                currency: 'USD',
                description: `Transfer for ${transfer.id}`,
                metadata: { transferId: transfer.id }
            });
            transfer.transferId = walletTransfer.id;
            // Wait for transfer completion
            await this.walletService.waitForTransferCompletion(walletTransfer.id);
            this.addTimelineEvent(transfer, 'transfer_completed', 'success', 'Funds transferred to recipient wallet');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.addTimelineEvent(transfer, 'transfer_initiated', 'failed', `Fund transfer failed: ${errorMessage}`);
            throw error;
        }
    }
    /**
     * Process payout to EUR bank account (async)
     */
    async processPayoutAsync(transfer) {
        try {
            transfer.status = TransferStatus.PAYING_OUT;
            transfer.updatedAt = new Date();
            this.addTimelineEvent(transfer, 'payout_created', 'pending', 'Initiating EUR bank transfer');
            if (!transfer.recipientWalletId) {
                throw new Error('Recipient wallet ID not found');
            }
            // Convert EnhancedBankAccount to BankAccount for Circle API
            const bankAccount = {
                iban: transfer.recipientInfo.bankAccount.iban || '',
                bic: transfer.recipientInfo.bankAccount.bic || '',
                bankName: transfer.recipientInfo.bankAccount.bankName,
                accountHolderName: transfer.recipientInfo.bankAccount.accountHolderName,
                country: transfer.recipientInfo.bankAccount.country,
                city: transfer.recipientInfo.bankAccount.city,
                address: transfer.recipientInfo.bankAccount.address
            };
            const payout = await this.payoutService.createPayout({
                amount: transfer.receiveAmount.toString(),
                currency: 'EUR',
                sourceWalletId: transfer.recipientWalletId,
                bankAccount,
                description: `Payout for transfer ${transfer.id}`,
                metadata: { transferId: transfer.id }
            });
            transfer.payoutId = payout.id;
            this.addTimelineEvent(transfer, 'payout_created', 'success', 'EUR bank transfer initiated');
            // Start async monitoring of payout completion
            this.monitorPayoutCompletion(transfer);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.addTimelineEvent(transfer, 'payout_created', 'failed', `Payout initiation failed: ${errorMessage}`);
            throw error;
        }
    }
    /**
     * Monitor payout completion in background
     */
    async monitorPayoutCompletion(transfer) {
        if (!transfer.payoutId)
            return;
        try {
            // This runs in background - don't await in main flow
            setTimeout(async () => {
                try {
                    await this.payoutService.waitForPayoutCompletion(transfer.payoutId);
                    transfer.status = TransferStatus.COMPLETED;
                    transfer.updatedAt = new Date();
                    this.addTimelineEvent(transfer, 'payout_completed', 'success', 'EUR received in recipient bank account');
                }
                catch (error) {
                    transfer.status = TransferStatus.FAILED;
                    transfer.updatedAt = new Date();
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    this.addTimelineEvent(transfer, 'payout_completed', 'failed', `Payout failed: ${errorMessage}`);
                }
            }, 1000); // Start monitoring after 1 second
        }
        catch (error) {
            console.error('Error setting up payout monitoring:', error);
        }
    }
    /**
     * Update transfer status by checking external services
     */
    async updateTransferStatus(transfer) {
        try {
            // Check payment status if still processing
            if (transfer.status === TransferStatus.PAYMENT_PROCESSING && transfer.paymentId) {
                const payment = await this.paymentService.getPaymentStatus(transfer.paymentId);
                if (payment.status === 'confirmed') {
                    transfer.status = TransferStatus.TRANSFERRING;
                    transfer.updatedAt = new Date();
                }
                else if (payment.status === 'failed') {
                    transfer.status = TransferStatus.FAILED;
                    transfer.updatedAt = new Date();
                }
            }
            // Check payout status if paying out
            if (transfer.status === TransferStatus.PAYING_OUT && transfer.payoutId) {
                const payout = await this.payoutService.getPayoutStatus(transfer.payoutId);
                if (payout.status === 'complete') {
                    transfer.status = TransferStatus.COMPLETED;
                    transfer.updatedAt = new Date();
                }
                else if (payout.status === 'failed') {
                    transfer.status = TransferStatus.FAILED;
                    transfer.updatedAt = new Date();
                }
            }
        }
        catch (error) {
            console.error('Error updating transfer status:', error);
        }
    }
    /**
     * Add event to transfer timeline
     */
    addTimelineEvent(transfer, type, status, message, metadata) {
        const event = {
            id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            transferId: transfer.id,
            type,
            status,
            message,
            timestamp: new Date(),
            metadata
        };
        transfer.timeline.push(event);
        transfer.updatedAt = new Date();
    }
    /**
     * Generate unique transfer ID
     */
    generateTransferId() {
        return `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Calculate transfer fees (simplified)
     */
    calculateFees(amount) {
        // Simplified fee calculation: 2.9% + $0.30 for card processing
        return Math.round((amount * 0.029 + 0.30) * 100) / 100;
    }
    /**
     * Calculate estimated completion time
     */
    calculateEstimatedCompletion() {
        // Estimate 5 minutes for complete transfer
        const completion = new Date();
        completion.setMinutes(completion.getMinutes() + 5);
        return completion;
    }
    /**
     * Calculate transfer options for both Circle and Mantle methods
     */
    async calculateTransfer(request) {
        try {
            console.log(`🧮 Calculating transfer options for ${request.sendAmount} ${request.sendCurrency} -> ${request.receiveCurrency}`);
            // Get exchange rate (simplified for demo)
            const exchangeRate = this.getExchangeRate(request.sendCurrency, request.receiveCurrency);
            // Calculate options for both methods
            const [circleOption, mantleOption] = await Promise.allSettled([
                this.calculateCircleOption(request, exchangeRate),
                this.calculateMantleOption(request, exchangeRate)
            ]);
            const options = [];
            // Add Circle option if available
            if (circleOption.status === 'fulfilled') {
                options.push(circleOption.value);
            }
            // Add Mantle option if available
            if (mantleOption.status === 'fulfilled') {
                options.push(mantleOption.value);
            }
            // Get recommendation
            const recommendation = await this.getTransferMethodRecommendation(request.sendAmount, { send: request.sendCurrency, receive: request.receiveCurrency }, request.preferredMethod);
            return {
                sendAmount: request.sendAmount,
                sendCurrency: request.sendCurrency,
                receiveCurrency: request.receiveCurrency,
                exchangeRate,
                options,
                recommendedMethod: recommendation.recommendedMethod
            };
        }
        catch (error) {
            console.error('❌ Failed to calculate transfer options:', error);
            throw new Error(`Failed to calculate transfer options: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get transfer method recommendation based on amount and preferences
     */
    /**
     * Create a Mantle transfer
     */
    async createMantleTransfer(request) {
        const transferId = this.generateTransferId();
        const timeline = [];
        try {
            console.log(`🚀 Creating Mantle transfer ${transferId}...`);
            // Calculate receive amount
            const exchangeRate = this.getExchangeRate(request.sendCurrency, request.receiveCurrency);
            const receiveAmount = request.sendAmount * exchangeRate;
            // Get gas estimate
            const gasEstimate = await this.mantleService.estimateGasCost(request.sendAmount, request.sendCurrency);
            const fees = parseFloat(gasEstimate.totalCostUSD);
            // Initialize transfer record
            const transfer = {
                id: transferId,
                status: TransferStatus.INITIATED,
                sendAmount: request.sendAmount,
                sendCurrency: request.sendCurrency,
                receiveAmount,
                receiveCurrency: request.receiveCurrency,
                exchangeRate,
                fees,
                recipientInfo: request.recipientInfo,
                estimatedCompletion: this.calculateMantleEstimatedCompletion(),
                createdAt: new Date(),
                updatedAt: new Date(),
                timeline,
                metadata: {
                    ...request.metadata,
                    userId: request.userId,
                    transferMethod: TransferMethod.MANTLE,
                    gasEstimate
                }
            };
            this.transfers.set(transferId, transfer);
            this.addTimelineEvent(transfer, 'payment_created', 'pending', 'Mantle transfer initiated');
            // Create Mantle wallets if needed
            await this.createMantleWallets(transfer, request.userId);
            // Initiate Mantle transfer
            await this.processMantleTransfer(transfer, request);
            return transfer;
        }
        catch (error) {
            console.error(`❌ Mantle transfer ${transferId} failed:`, error);
            const transfer = this.transfers.get(transferId);
            if (transfer) {
                transfer.status = TransferStatus.FAILED;
                transfer.updatedAt = new Date();
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.addTimelineEvent(transfer, 'transfer_failed', 'failed', `Mantle transfer failed: ${errorMessage}`);
            }
            throw error;
        }
    }
    /**
     * Calculate Circle transfer option
     */
    async calculateCircleOption(request, exchangeRate) {
        const processingFee = this.calculateFees(request.sendAmount);
        const networkFee = 0; // Circle handles network fees internally
        const exchangeFee = request.sendAmount * 0.005; // 0.5% exchange fee
        const totalCost = processingFee + networkFee + exchangeFee;
        return {
            method: TransferMethod.CIRCLE,
            estimatedTime: '3-5 business days',
            totalCost,
            fees: {
                processing: processingFee,
                network: networkFee,
                exchange: exchangeFee
            },
            benefits: [
                'Regulated and compliant',
                'Established banking network',
                'Customer support available',
                'Fraud protection included'
            ],
            limitations: [
                'Longer settlement time',
                'Higher fees for small amounts',
                'Business hours restrictions'
            ],
            recommended: request.sendAmount > 1000,
            availableForAmount: true
        };
    }
    /**
     * Calculate Mantle transfer option
     */
    async calculateMantleOption(request, exchangeRate) {
        try {
            // Check if Mantle service is available
            if (!this.mantleService.isEnabled()) {
                throw new Error('Mantle service not available');
            }
            const gasEstimate = await this.mantleService.estimateGasCost(request.sendAmount, request.sendCurrency);
            const networkFee = parseFloat(gasEstimate.totalCostUSD);
            const processingFee = request.sendAmount * 0.001; // 0.1% processing fee
            const exchangeFee = request.sendAmount * 0.003; // 0.3% exchange fee
            const totalCost = processingFee + networkFee + exchangeFee;
            return {
                method: TransferMethod.MANTLE,
                estimatedTime: '2-5 minutes',
                totalCost,
                fees: {
                    processing: processingFee,
                    network: networkFee,
                    exchange: exchangeFee
                },
                benefits: [
                    'Ultra-fast settlement',
                    '90% lower network fees',
                    'Transparent blockchain tracking',
                    '24/7 availability'
                ],
                limitations: [
                    'Newer technology',
                    'Requires blockchain knowledge',
                    'Network congestion may affect speed'
                ],
                recommended: request.sendAmount < 100,
                availableForAmount: request.sendAmount >= 1 && request.sendAmount <= 10000 // Example limits
            };
        }
        catch (error) {
            console.warn('⚠️ Mantle option not available:', error);
            throw error;
        }
    }
    /**
     * Compare transfer costs between methods
     */
    async compareTransferCosts(amount, currencies) {
        try {
            const request = {
                sendAmount: amount,
                sendCurrency: currencies.from,
                receiveCurrency: currencies.to
            };
            const exchangeRate = this.getExchangeRate(currencies.from, currencies.to);
            const [circleOption, mantleOption] = await Promise.allSettled([
                this.calculateCircleOption(request, exchangeRate),
                this.calculateMantleOption(request, exchangeRate)
            ]);
            const circleCost = circleOption.status === 'fulfilled' ? circleOption.value.totalCost : 0;
            const mantleCost = mantleOption.status === 'fulfilled' ? mantleOption.value.totalCost : 0;
            const mantleSavings = circleCost > mantleCost ? circleCost - mantleCost : undefined;
            return {
                circleCost,
                mantleCost,
                mantleSavings
            };
        }
        catch (error) {
            console.error('❌ Failed to compare transfer costs:', error);
            return {
                circleCost: 0,
                mantleCost: 0
            };
        }
    }
    /**
     * Check if a transfer method is available for the given amount
     */
    async isMethodAvailable(method, amount) {
        try {
            if (method === TransferMethod.CIRCLE) {
                return true; // Circle is always available
            }
            else if (method === TransferMethod.MANTLE) {
                return this.mantleService.isEnabled() && amount >= 1 && amount <= 10000;
            }
            return false;
        }
        catch (error) {
            console.error(`❌ Failed to check availability for ${method}:`, error);
            return false;
        }
    }
    /**
     * Create Mantle wallets for transfer
     */
    async createMantleWallets(transfer, userId) {
        try {
            this.addTimelineEvent(transfer, 'wallets_created', 'pending', 'Creating Mantle wallets');
            // Create sender wallet
            const senderWallet = await this.mantleService.createWallet(userId || `sender-${transfer.id}`, { encryptPrivateKey: true });
            // Create recipient wallet
            const recipientWallet = await this.mantleService.createWallet(`recipient-${transfer.id}`, { encryptPrivateKey: true });
            transfer.senderWalletId = senderWallet.wallet.id;
            transfer.recipientWalletId = recipientWallet.wallet.id;
            // Store wallet addresses in metadata
            transfer.metadata = {
                ...transfer.metadata,
                senderWalletAddress: senderWallet.wallet.address,
                recipientWalletAddress: recipientWallet.wallet.address
            };
            this.addTimelineEvent(transfer, 'wallets_created', 'success', 'Mantle wallets created successfully');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.addTimelineEvent(transfer, 'wallets_created', 'failed', `Mantle wallet creation failed: ${errorMessage}`);
            throw error;
        }
    }
    /**
     * Process Mantle transfer
     */
    async processMantleTransfer(transfer, request) {
        try {
            transfer.status = TransferStatus.TRANSFERRING;
            transfer.updatedAt = new Date();
            this.addTimelineEvent(transfer, 'transfer_initiated', 'pending', 'Initiating Mantle blockchain transfer');
            const senderAddress = transfer.metadata?.senderWalletAddress;
            const recipientAddress = transfer.metadata?.recipientWalletAddress;
            if (!senderAddress || !recipientAddress) {
                throw new Error('Wallet addresses not found');
            }
            const mantleRequest = {
                fromAddress: senderAddress,
                toAddress: recipientAddress,
                amount: transfer.sendAmount.toString(),
                tokenAddress: undefined, // Use native token for now
                userId: request.userId || transfer.id
            };
            const mantleResult = await this.mantleService.initiateTransfer(mantleRequest);
            transfer.metadata = {
                ...transfer.metadata,
                mantleTransferId: mantleResult.transferId,
                transactionHash: mantleResult.transactionHash
            };
            if (mantleResult.status === 'PENDING') {
                this.addTimelineEvent(transfer, 'transfer_initiated', 'success', 'Mantle transfer initiated successfully');
                // Start monitoring the transfer
                this.monitorMantleTransfer(transfer, mantleResult.transferId);
            }
            else if (mantleResult.status === 'FAILED') {
                throw new Error(mantleResult.error || 'Mantle transfer failed');
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.addTimelineEvent(transfer, 'transfer_initiated', 'failed', `Mantle transfer failed: ${errorMessage}`);
            throw error;
        }
    }
    /**
     * Monitor Mantle transfer completion
     */
    async monitorMantleTransfer(transfer, mantleTransferId) {
        try {
            // Monitor in background
            setTimeout(async () => {
                try {
                    const status = await this.mantleService.getTransferStatus(mantleTransferId);
                    if (status.status === 'CONFIRMED') {
                        transfer.status = TransferStatus.COMPLETED;
                        transfer.updatedAt = new Date();
                        // Update actual gas cost
                        if (status.gasCostUSD) {
                            transfer.fees = parseFloat(status.gasCostUSD);
                        }
                        this.addTimelineEvent(transfer, 'transfer_completed', 'success', 'Mantle transfer completed successfully');
                    }
                    else if (status.status === 'FAILED') {
                        transfer.status = TransferStatus.FAILED;
                        transfer.updatedAt = new Date();
                        this.addTimelineEvent(transfer, 'transfer_completed', 'failed', `Mantle transfer failed: ${status.error || 'Unknown error'}`);
                    }
                    else {
                        // Still pending, continue monitoring
                        setTimeout(() => this.monitorMantleTransfer(transfer, mantleTransferId), 5000);
                    }
                }
                catch (error) {
                    console.error('❌ Error monitoring Mantle transfer:', error);
                    transfer.status = TransferStatus.FAILED;
                    transfer.updatedAt = new Date();
                    this.addTimelineEvent(transfer, 'transfer_completed', 'failed', 'Failed to monitor transfer status');
                }
            }, 2000); // Check after 2 seconds
        }
        catch (error) {
            console.error('❌ Error setting up Mantle transfer monitoring:', error);
        }
    }
    /**
     * Get exchange rate (simplified implementation)
     */
    getExchangeRate(fromCurrency, toCurrency) {
        // Simplified exchange rates for demo
        const rates = {
            'USD': { 'EUR': 0.85, 'GBP': 0.73, 'CAD': 1.25, 'USD': 1.0 },
            'EUR': { 'USD': 1.18, 'GBP': 0.86, 'CAD': 1.47, 'EUR': 1.0 },
            'GBP': { 'USD': 1.37, 'EUR': 1.16, 'CAD': 1.71, 'GBP': 1.0 },
            'CAD': { 'USD': 0.80, 'EUR': 0.68, 'GBP': 0.58, 'CAD': 1.0 }
        };
        return rates[fromCurrency]?.[toCurrency] || 1.0;
    }
    /**
     * Calculate estimated completion time for Mantle transfers
     */
    calculateMantleEstimatedCompletion() {
        // Estimate 2-5 minutes for Mantle transfer
        const completion = new Date();
        completion.setMinutes(completion.getMinutes() + 3); // Average 3 minutes
        return completion;
    }
    /**
     * Calculate Mantle transfer costs and details
     */
    async calculateMantleTransfer(request) {
        try {
            // Wait for Mantle service initialization
            await this.mantleService.waitForInitialization();
            if (!this.mantleService.isEnabled()) {
                throw new Error('Mantle service is not enabled');
            }
            // Import FX service for currency conversion
            const { FXService } = await Promise.resolve().then(() => __importStar(require('./fx.service')));
            const fxService = new FXService();
            // For Mantle transfers, we need to convert to USD first (for Circle integration)
            // then handle the final conversion on the recipient side
            let calculation;
            if (request.sendCurrency !== 'USD') {
                // Convert send currency to USD
                calculation = await fxService.calculateTransfer({
                    sendAmount: request.sendAmount,
                    sendCurrency: request.sendCurrency,
                    receiveCurrency: 'USD'
                });
            }
            else {
                calculation = {
                    sendAmount: request.sendAmount,
                    receiveAmount: request.sendAmount,
                    exchangeRate: 1,
                    fees: { total: 0, cardProcessing: 0, transfer: 0, payout: 0 },
                    rateValidUntil: new Date(Date.now() + 300000), // 5 minutes
                    breakdown: {
                        sendAmountUSD: request.sendAmount,
                        netAmountUSD: request.sendAmount,
                        finalAmountReceive: request.sendAmount
                    }
                };
            }
            // Get gas estimate for the Mantle transfer
            const gasEstimate = await this.mantleService.estimateGasCost(calculation.receiveAmount, // USD amount
            'USD');
            // If final currency is not USD, calculate the final conversion
            let finalCalculation = calculation;
            if (request.receiveCurrency !== 'USD') {
                finalCalculation = await fxService.calculateTransfer({
                    sendAmount: calculation.receiveAmount,
                    sendCurrency: 'USD',
                    receiveCurrency: request.receiveCurrency
                });
            }
            // Calculate total fees including gas costs
            const gasCostUSD = parseFloat(gasEstimate.totalCostUSD);
            const totalFees = calculation.fees.total + gasCostUSD;
            // Adjust receive amount for gas costs
            const adjustedReceiveAmount = finalCalculation.receiveAmount - (gasCostUSD * finalCalculation.exchangeRate);
            return {
                sendAmount: request.sendAmount,
                receiveAmount: Math.max(0, adjustedReceiveAmount), // Ensure non-negative
                sendCurrency: request.sendCurrency,
                receiveCurrency: request.receiveCurrency,
                exchangeRate: finalCalculation.exchangeRate,
                fees: {
                    total: totalFees,
                    cardProcessing: calculation.fees.cardProcessing || 0,
                    transfer: calculation.fees.transfer || 0,
                    payout: calculation.fees.payout || 0,
                    gas: gasCostUSD
                },
                gasEstimate,
                rateValidUntil: calculation.rateValidUntil,
                rateId: calculation.rateId,
                breakdown: {
                    ...finalCalculation.breakdown,
                    gasEstimate,
                    adjustedForGas: true
                },
                estimatedArrival: '2-5 minutes',
                method: 'mantle'
            };
        }
        catch (error) {
            console.error('Failed to calculate Mantle transfer:', error);
            throw new Error(`Mantle calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get transfer method recommendation based on amount and preferences
     */
    async getTransferMethodRecommendation(amount, currencies, userId) {
        try {
            // Calculate both methods if available
            const [circleCalc, mantleCalc] = await Promise.allSettled([
                // Circle calculation
                (async () => {
                    const { FXService } = await Promise.resolve().then(() => __importStar(require('./fx.service')));
                    const fxService = new FXService();
                    return await fxService.calculateTransfer({
                        sendAmount: amount,
                        sendCurrency: currencies.send,
                        receiveCurrency: currencies.receive
                    });
                })(),
                // Mantle calculation
                this.mantleService.isEnabled()
                    ? this.calculateMantleTransfer({
                        sendAmount: amount,
                        sendCurrency: currencies.send,
                        receiveCurrency: currencies.receive,
                        userId
                    })
                    : Promise.reject(new Error('Mantle not available'))
            ]);
            // Default to Circle
            let recommendedMethod = TransferMethod.CIRCLE;
            let reason = 'Reliable traditional banking option';
            let costSavings = 0;
            let timeSavings;
            // Compare if both are available
            if (circleCalc.status === 'fulfilled' && mantleCalc.status === 'fulfilled') {
                const circleCost = circleCalc.value.fees.total;
                const mantleCost = mantleCalc.value.fees.total;
                costSavings = circleCost - mantleCost;
                // Recommend Mantle for smaller amounts if it's cheaper
                if (amount < 1000 && costSavings > 0) {
                    recommendedMethod = TransferMethod.MANTLE;
                    reason = 'Lower fees and faster processing for this amount';
                    timeSavings = 'Save 3-5 business days';
                }
                // Recommend Circle for larger amounts
                else if (amount >= 1000) {
                    recommendedMethod = TransferMethod.CIRCLE;
                    reason = 'Recommended for larger amounts due to regulatory compliance';
                }
            }
            return {
                recommendedMethod,
                reason,
                costSavings: Math.max(0, costSavings),
                timeSavings,
                alternatives: [
                    {
                        method: recommendedMethod === TransferMethod.CIRCLE ? TransferMethod.MANTLE : TransferMethod.CIRCLE,
                        reason: recommendedMethod === TransferMethod.CIRCLE
                            ? 'Faster but newer technology'
                            : 'More established but slower'
                    }
                ]
            };
        }
        catch (error) {
            console.error('Failed to get transfer method recommendation:', error);
            // Fallback to Circle
            return {
                recommendedMethod: TransferMethod.CIRCLE,
                reason: 'Default reliable option',
                alternatives: []
            };
        }
    }
    /**
     * Enhanced health check including Mantle service
     */
    async healthCheck() {
        try {
            // Check all underlying services including Mantle
            const [paymentHealth, walletHealth, payoutHealth, mantleHealth] = await Promise.allSettled([
                this.paymentService.healthCheck(),
                this.walletService.healthCheck(),
                this.payoutService.healthCheck(),
                this.mantleService.healthCheck()
            ]);
            const services = {
                payment: paymentHealth.status === 'fulfilled' ? paymentHealth.value.status : 'unhealthy',
                wallet: walletHealth.status === 'fulfilled' ? walletHealth.value.status : 'unhealthy',
                payout: payoutHealth.status === 'fulfilled' ? payoutHealth.value.status : 'unhealthy',
                mantle: mantleHealth.status === 'fulfilled' ? (mantleHealth.value.connected ? 'healthy' : 'unhealthy') : 'unhealthy'
            };
            const coreServicesHealthy = [services.payment, services.wallet, services.payout].every(status => status === 'healthy');
            const mantleHealthy = services.mantle === 'healthy';
            // System is healthy if core services are healthy, Mantle is optional
            const overallStatus = coreServicesHealthy ? (mantleHealthy ? 'healthy' : 'degraded') : 'unhealthy';
            return {
                status: overallStatus,
                services
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                services: {
                    payment: 'unknown',
                    wallet: 'unknown',
                    payout: 'unknown',
                    mantle: 'unknown'
                }
            };
        }
    }
}
exports.TransferService = TransferService;
