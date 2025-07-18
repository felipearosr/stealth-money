// src/services/orchestrator.service.ts
import { SimpleDatabaseService } from './database-simple.service';
import { BlockchainService } from './blockchain.service';
import { PaymentService } from './payment.service';

interface PaymentSuccessData {
    paymentIntentId: string;
    amount: number;
    currency: string;
    paymentMethod: string | null;
    created: number;
    status: string;
}

interface PaymentFailureData {
    paymentIntentId: string;
    failureReason: string;
    failureCode: string;
}

interface PaymentCanceledData {
    paymentIntentId: string;
    canceledAt: string;
}

interface PaymentActionRequiredData {
    paymentIntentId: string;
    nextActionType: string;
    clientSecret: string | null;
}

/**
 * OrchestratorService - The Brain of the Transfer System
 * 
 * This service orchestrates the entire money transfer workflow after payment events.
 * It coordinates between database updates, blockchain operations, and notifications.
 * 
 * Critical Responsibilities:
 * 1. Update transaction status in database
 * 2. Trigger blockchain fund release
 * 3. Handle error scenarios and rollbacks
 * 4. Log all operations for audit trail
 */
export class OrchestratorService {
    private dbService: SimpleDatabaseService;
    private blockchainService: BlockchainService;
    private paymentService: PaymentService;

    constructor() {
        this.dbService = new SimpleDatabaseService();
        this.blockchainService = new BlockchainService();
        this.paymentService = new PaymentService();
    }

    /**
     * Main orchestration method - handles the complete workflow after successful payment
     * This is the primary entry point called by the webhook handler
     */
    async handleSuccessfulPayment(transactionId: string): Promise<void> {
        console.log(`🎯 Starting orchestration workflow for transaction: ${transactionId}`);
        
        try {
            // Step 1: Fetch the transaction by its ID
            console.log('📋 Step 1: Fetching transaction details from database');
            const transaction = await this.dbService.getTransaction(transactionId);
            
            if (!transaction) {
                throw new Error(`Transaction not found: ${transactionId}`);
            }
            
            console.log(`💰 Transaction found: ${transaction.amount} ${transaction.sourceCurrency} → ${transaction.recipientAmount} ${transaction.destCurrency}`);
            console.log(`📊 Current status: ${transaction.status}`);
            
            // Step 2: Check if transaction is already being processed or completed
            if (transaction.status === 'PROCESSING' || transaction.status === 'COMPLETED' || transaction.status === 'FUNDS_SENT_TO_PARTNER') {
                console.log(`⚠️  Transaction ${transactionId} is already ${transaction.status} - skipping duplicate processing`);
                return;
            }
            
            // Step 3: Update transaction status to PROCESSING
            console.log('📝 Step 3: Updating transaction status to PROCESSING');
            await this.dbService.updateTransactionStatus(transactionId, 'PROCESSING', {
                paymentId: transaction.stripePaymentIntentId,
                processingStartedAt: new Date().toISOString()
            });
            
            // Step 4: Call BlockchainService.releaseFunds()
            console.log('⛓️  Step 4: Initiating blockchain fund release');
            const blockchainResult = await this.executeBlockchainRelease(transaction);
            
            if (blockchainResult.success) {
                // Step 5: On Success - Update to FUNDS_SENT_TO_PARTNER
                console.log('✅ Step 5: Blockchain release successful - updating status');
                await this.dbService.updateTransactionStatus(transactionId, 'FUNDS_SENT_TO_PARTNER', {
                    txHash: blockchainResult.transactionHash,
                    blockchainCompletedAt: new Date().toISOString(),
                    recipientAddress: blockchainResult.recipientAddress
                });
                
                console.log(`🎉 Transaction ${transactionId} completed successfully!`);
                console.log(`🔗 Blockchain TX: ${blockchainResult.transactionHash}`);
                
                // Step 7: Future - Trigger notifications
                await this.triggerNotifications(transaction, blockchainResult);
                
            } else {
                // Step 6: On Failure - Update to FAILED and log for manual intervention
                console.error('❌ Step 6: Blockchain release failed');
                await this.dbService.updateTransactionStatus(transactionId, 'FAILED', {
                    paymentId: transaction.stripePaymentIntentId,
                    failureReason: blockchainResult.error,
                    failedAt: new Date().toISOString(),
                    requiresManualIntervention: true
                });
                
                console.error(`🚨 MANUAL INTERVENTION REQUIRED for transaction ${transactionId}`);
                console.error(`🚨 Failure reason: ${blockchainResult.error}`);
                
                throw new Error(`Blockchain release failed: ${blockchainResult.error}`);
            }
            
        } catch (error) {
            console.error('❌ Orchestration workflow failed:', error);
            
            // Ensure transaction is marked as failed for manual review
            try {
                await this.dbService.updateTransactionStatus(transactionId, 'FAILED', {
                    failureReason: error instanceof Error ? error.message : 'Unknown orchestration error',
                    failedAt: new Date().toISOString(),
                    requiresManualIntervention: true
                });
            } catch (dbError) {
                console.error('❌ Failed to update failure status:', dbError);
            }
            
            throw error; // Re-throw to trigger webhook retry
        }
    }

    /**
     * Legacy method for backward compatibility
     * This wraps the new handleSuccessfulPayment method
     */
    async processSuccessfulPayment(internalTransactionId: string, paymentData: PaymentSuccessData): Promise<void> {
        console.log(`🔄 Legacy method called - delegating to handleSuccessfulPayment`);
        await this.handleSuccessfulPayment(internalTransactionId);
    }

    /**
     * Process failed payment
     */
    async processFailedPayment(internalTransactionId: string, failureData: PaymentFailureData): Promise<void> {
        console.log(`💔 Processing payment failure for transaction: ${internalTransactionId}`);
        
        try {
            await this.dbService.updateTransactionStatus(internalTransactionId, 'PAYMENT_FAILED', {
                paymentId: failureData.paymentIntentId,
                failureReason: failureData.failureReason,
                failureCode: failureData.failureCode,
                failedAt: new Date().toISOString()
            });
            
            console.log('✅ Payment failure processed successfully');
            
        } catch (error) {
            console.error('❌ Failed to process payment failure:', error);
            throw error;
        }
    }

    /**
     * Process canceled payment
     */
    async processCanceledPayment(internalTransactionId: string, cancelData: PaymentCanceledData): Promise<void> {
        console.log(`🚫 Processing payment cancellation for transaction: ${internalTransactionId}`);
        
        try {
            await this.dbService.updateTransactionStatus(internalTransactionId, 'CANCELED', {
                paymentId: cancelData.paymentIntentId,
                canceledAt: cancelData.canceledAt
            });
            
            console.log('✅ Payment cancellation processed successfully');
            
        } catch (error) {
            console.error('❌ Failed to process payment cancellation:', error);
            throw error;
        }
    }

    /**
     * Process payment requiring additional action
     */
    async processPaymentRequiringAction(internalTransactionId: string, actionData: PaymentActionRequiredData): Promise<void> {
        console.log(`⚠️  Processing payment requiring action for transaction: ${internalTransactionId}`);
        
        try {
            await this.dbService.updateTransactionStatus(internalTransactionId, 'REQUIRES_ACTION', {
                paymentId: actionData.paymentIntentId,
                nextActionType: actionData.nextActionType,
                clientSecret: actionData.clientSecret,
                actionRequiredAt: new Date().toISOString()
            });
            
            console.log('✅ Payment requiring action processed successfully');
            
        } catch (error) {
            console.error('❌ Failed to process payment requiring action:', error);
            throw error;
        }
    }

    /**
     * Execute blockchain fund release - The core business logic
     * This method handles the actual blockchain interaction
     */
    private async executeBlockchainRelease(transaction: any): Promise<{
        success: boolean;
        transactionHash?: string;
        recipientAddress?: string;
        error?: string;
    }> {
        console.log(`⛓️  Executing blockchain release for transaction: ${transaction.id}`);
        
        try {
            // Check if blockchain service is available
            const healthCheck = await this.blockchainService.healthCheck();
            
            if (!healthCheck.connected) {
                console.warn('⚠️  Blockchain service not available');
                return {
                    success: false,
                    error: 'Blockchain service unavailable - requires manual processing'
                };
            }
            
            // Determine recipient address based on destination currency/region
            const recipientAddress = this.getRecipientAddress(transaction.destCurrency);
            
            // Convert amount to proper decimal format for stablecoin
            const amountInWei = this.convertToBlockchainAmount(transaction.recipientAmount, transaction.destCurrency);
            
            console.log(`💰 Releasing ${transaction.recipientAmount} ${transaction.destCurrency}`);
            console.log(`🎯 Recipient address: ${recipientAddress}`);
            console.log(`🔢 Amount in wei: ${amountInWei}`);
            
            // Call BlockchainService.releaseFunds()
            const blockchainTxHash = await this.blockchainService.releaseFunds(
                recipientAddress,
                amountInWei,
                transaction.id
            );
            
            console.log(`✅ Blockchain transaction successful: ${blockchainTxHash}`);
            
            return {
                success: true,
                transactionHash: blockchainTxHash,
                recipientAddress: recipientAddress
            };
            
        } catch (error) {
            console.error('❌ Blockchain release execution failed:', error);
            
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown blockchain error'
            };
        }
    }

    /**
     * Get recipient address based on destination currency/region
     * This would typically be the address of your payout partner for that region
     */
    private getRecipientAddress(destCurrency: string): string {
        // In production, this would be a lookup table or database query
        // For now, we'll use mock addresses based on currency
        const recipientAddresses: { [key: string]: string } = {
            'USD': '0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e', // US payout partner
            'EUR': '0x8ba1f109551bD432803012645Hac136c5c8b4321', // EU payout partner
            'BRL': '0x9cb2f210662bE543804023756Hac136c5c8b5432', // Brazil payout partner
            'GBP': '0xacb3f321773cF654915034867Hac136c5c8b6543', // UK payout partner
        };
        
        const address = recipientAddresses[destCurrency];
        
        if (!address) {
            throw new Error(`No payout partner address configured for currency: ${destCurrency}`);
        }
        
        return address;
    }

    /**
     * Convert amount to proper decimal format for blockchain (wei for ETH-based tokens)
     * Most stablecoins use 6 or 18 decimal places
     */
    private convertToBlockchainAmount(amount: number, currency: string): string {
        // USDC and USDT typically use 6 decimal places
        // DAI and other tokens use 18 decimal places
        const decimals = this.getTokenDecimals(currency);
        
        // Convert to wei (multiply by 10^decimals)
        const amountInWei = Math.floor(amount * Math.pow(10, decimals)).toString();
        
        console.log(`🔢 Converting ${amount} ${currency} to ${amountInWei} (${decimals} decimals)`);
        
        return amountInWei;
    }

    /**
     * Get token decimal places for different currencies
     */
    private getTokenDecimals(currency: string): number {
        const tokenDecimals: { [key: string]: number } = {
            'USD': 6,  // USDC has 6 decimals
            'EUR': 6,  // EURS has 6 decimals
            'BRL': 18, // Custom BRL token with 18 decimals
            'GBP': 6,  // GBPT has 6 decimals
        };
        
        return tokenDecimals[currency] || 18; // Default to 18 decimals
    }

    /**
     * Trigger notifications to user and payout partner
     * Step 7 from the requirements - Future implementation
     */
    private async triggerNotifications(transaction: any, blockchainResult: any): Promise<void> {
        console.log(`📧 Triggering notifications for transaction: ${transaction.id}`);
        
        try {
            // Future implementation:
            // 1. Send email to user confirming transfer completion
            // 2. Send notification to payout partner about incoming funds
            // 3. Send SMS notification if configured
            // 4. Update external systems (accounting, compliance, etc.)
            
            console.log(`📱 User notification: Transfer of ${transaction.amount} ${transaction.sourceCurrency} completed`);
            console.log(`🏦 Partner notification: Receive ${transaction.recipientAmount} ${transaction.destCurrency}`);
            console.log(`🔗 Blockchain TX: ${blockchainResult.transactionHash}`);
            
            // Placeholder for actual notification implementation
            // await this.emailService.sendTransferCompleteEmail(transaction);
            // await this.smsService.sendTransferNotification(transaction);
            // await this.partnerService.notifyPayoutPartner(transaction, blockchainResult);
            
            console.log('✅ Notifications triggered successfully');
            
        } catch (error) {
            console.error('⚠️  Notification sending failed (non-critical):', error);
            // Don't throw error - notifications are non-critical
        }
    }

    /**
     * Legacy method for backward compatibility
     * This is the old blockchain release method
     */
    private async initiateBlockchainRelease(transaction: any): Promise<void> {
        console.log(`🔄 Legacy blockchain method called - using new executeBlockchainRelease`);
        const result = await this.executeBlockchainRelease(transaction);
        
        if (!result.success) {
            throw new Error(result.error || 'Blockchain release failed');
        }
    }

    /**
     * Health check for the orchestrator service
     */
    async healthCheck(): Promise<{ status: string; services: any }> {
        const dbHealth = await this.dbService.testConnection();
        const blockchainHealth = await this.blockchainService.healthCheck();
        
        return {
            status: dbHealth && blockchainHealth.connected ? 'healthy' : 'degraded',
            services: {
                database: dbHealth ? 'connected' : 'disconnected',
                blockchain: blockchainHealth.connected ? 'connected' : 'disconnected',
                payment: 'connected' // PaymentService doesn't have health check
            }
        };
    }
}