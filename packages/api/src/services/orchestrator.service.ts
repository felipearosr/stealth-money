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
     * Process successful payment - The main workflow!
     * This is called when Stripe confirms a payment has succeeded
     */
    async processSuccessfulPayment(internalTransactionId: string, paymentData: PaymentSuccessData): Promise<void> {
        console.log(`🎯 Starting payment success workflow for transaction: ${internalTransactionId}`);
        
        try {
            // Step 1: Update transaction status to PAID
            console.log('📝 Step 1: Updating transaction status to PAID');
            await this.dbService.updateTransactionStatus(internalTransactionId, 'PAID', {
                paymentId: paymentData.paymentIntentId,
                paidAt: new Date().toISOString(),
                paymentMethod: paymentData.paymentMethod,
                stripeAmount: paymentData.amount,
                stripeCurrency: paymentData.currency
            });
            
            // Step 2: Get transaction details for blockchain release
            console.log('📋 Step 2: Fetching transaction details');
            const transaction = await this.dbService.getTransaction(internalTransactionId);
            
            if (!transaction) {
                throw new Error(`Transaction not found: ${internalTransactionId}`);
            }
            
            console.log(`💰 Transaction details: ${transaction.amount} ${transaction.sourceCurrency} → ${transaction.recipientAmount} ${transaction.destCurrency}`);
            
            // Step 3: Trigger blockchain fund release
            console.log('⛓️  Step 3: Initiating blockchain fund release');
            await this.initiateBlockchainRelease(transaction);
            
            // Step 4: Update status to BLOCKCHAIN_PENDING
            console.log('📝 Step 4: Updating status to BLOCKCHAIN_PENDING');
            await this.dbService.updateTransactionStatus(internalTransactionId, 'BLOCKCHAIN_PENDING', {
                blockchainInitiatedAt: new Date().toISOString()
            });
            
            console.log('✅ Payment success workflow completed successfully');
            
        } catch (error) {
            console.error('❌ Payment success workflow failed:', error);
            
            // Update status to indicate processing error
            try {
                await this.dbService.updateTransactionStatus(internalTransactionId, 'PROCESSING_ERROR', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    errorAt: new Date().toISOString()
                });
            } catch (dbError) {
                console.error('❌ Failed to update error status:', dbError);
            }
            
            throw error; // Re-throw to trigger webhook retry
        }
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
     * Initiate blockchain fund release
     * This is where the actual money transfer happens on the blockchain
     */
    private async initiateBlockchainRelease(transaction: any): Promise<void> {
        console.log(`⛓️  Initiating blockchain release for transaction: ${transaction.id}`);
        
        try {
            // Check if blockchain service is available
            const healthCheck = await this.blockchainService.healthCheck();
            
            if (!healthCheck.connected) {
                console.warn('⚠️  Blockchain service not available - marking for manual processing');
                
                // Update status to indicate manual processing needed
                await this.dbService.updateTransactionStatus(transaction.id, 'MANUAL_PROCESSING_REQUIRED', {
                    reason: 'Blockchain service unavailable',
                    requiresManualIntervention: true,
                    flaggedAt: new Date().toISOString()
                });
                
                return;
            }
            
            // For now, we'll simulate the blockchain release
            // In production, this would call the actual smart contract
            console.log('🔗 Simulating blockchain fund release...');
            console.log(`💰 Amount: ${transaction.recipientAmount} ${transaction.destCurrency}`);
            console.log(`🎯 Recipient: [recipient address would be here]`);
            
            // Simulate blockchain transaction
            const blockchainTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
            
            console.log(`📝 Blockchain transaction hash: ${blockchainTxHash}`);
            
            // Update transaction with blockchain details
            await this.dbService.updateTransactionStatus(transaction.id, 'BLOCKCHAIN_CONFIRMED', {
                blockchainTxHash,
                blockchainConfirmedAt: new Date().toISOString(),
                finalStatus: 'COMPLETED'
            });
            
            console.log('✅ Blockchain release completed successfully');
            
        } catch (error) {
            console.error('❌ Blockchain release failed:', error);
            
            // Mark transaction for manual review
            await this.dbService.updateTransactionStatus(transaction.id, 'BLOCKCHAIN_ERROR', {
                blockchainError: error instanceof Error ? error.message : 'Unknown blockchain error',
                requiresManualReview: true,
                errorAt: new Date().toISOString()
            });
            
            throw error;
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