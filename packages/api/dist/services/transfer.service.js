"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferService = exports.TransferStatus = void 0;
const circle_payment_service_1 = require("./circle-payment.service");
const circle_wallet_service_1 = require("./circle-wallet.service");
const circle_payout_service_1 = require("./circle-payout.service");
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
 * Main Transfer Service that orchestrates the complete international transfer flow
 * Coordinates Circle Payment, Wallet, and Payout services to provide seamless transfers
 */
class TransferService {
    constructor() {
        this.transfers = new Map(); // In-memory storage for demo
        this.paymentService = new circle_payment_service_1.CirclePaymentService();
        this.walletService = new circle_wallet_service_1.CircleWalletService();
        this.payoutService = new circle_payout_service_1.CirclePayoutService();
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
     * Health check for all underlying services
     */
    async healthCheck() {
        try {
            // Check all underlying services
            const [paymentHealth, walletHealth, payoutHealth] = await Promise.allSettled([
                this.paymentService.healthCheck(),
                this.walletService.healthCheck(),
                this.payoutService.healthCheck()
            ]);
            const services = {
                payment: paymentHealth.status === 'fulfilled' ? paymentHealth.value.status : 'unhealthy',
                wallet: walletHealth.status === 'fulfilled' ? walletHealth.value.status : 'unhealthy',
                payout: payoutHealth.status === 'fulfilled' ? payoutHealth.value.status : 'unhealthy'
            };
            const allHealthy = Object.values(services).every(status => status === 'healthy');
            return {
                status: allHealthy ? 'healthy' : 'degraded',
                services
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                services: {
                    payment: 'unknown',
                    wallet: 'unknown',
                    payout: 'unknown'
                }
            };
        }
    }
}
exports.TransferService = TransferService;
