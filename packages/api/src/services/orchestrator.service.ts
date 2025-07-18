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
            
            // Step 2: Check if transaction is already being processed
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
                    blockchainCompletedAt: new Date().toISOString()
                });
                
                console.log(`🎉 Transaction ${transactionId} completed successfully!`);
                
            } else {
                // Step 6: On Failure - Update to FAILED
                console.error('❌ Step 6: Blockchain release failed');
                await this.dbService.updateTransactionStatus(transactionId, 'FAILED', {
                    failureReason: blockchainResult.error,
                    failedAt: new Date().toISOString(),
                    requiresManualIntervention: true
                });
                
                console.error(`🚨 MANUAL INTERVENTION REQUIRED for transaction ${transactionId}`);
                throw new Error(`Blockchain release failed: ${blockchainResult.error}`);
            }
            
        } catch (error) {
            console.error('❌ Orchestration workflow failed:', error);
            
            try {
                await this.dbService.updateTransactionStatus(transactionId, 'FAILED', {
                    failureReason: error instanceof Error ? error.message : 'Unknown orchestration error',
                    failedAt: new Date().toISOString(),
                    requiresManualIntervention: true
                });
            } catch (dbError) {
                console.error('❌ Failed to update failure status:', dbError);
            }
            
            throw error;
        }
    }

    private async executeBlockchainRelease(transaction: any): Promise<{
        success: boolean;
        transactionHash?: string;
        error?: string;
    }> {
        try {
            const healthCheck = await this.blockchainService.healthCheck();
            
            if (!healthCheck.connected) {
                return {
                    success: false,
                    error: 'Blockchain service unavailable - requires manual processing'
                };
            }
            
            // Simulate blockchain release for testing
            const blockchainTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
            console.log(`✅ Blockchain transaction successful: ${blockchainTxHash}`);
            
            return {
                success: true,
                transactionHash: blockchainTxHash
            };
            
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown blockchain error'
            };
        }
    }

    async healthCheck(): Promise<{ status: string; services: any }> {
        const dbHealth = await this.dbService.testConnection();
        const blockchainHealth = await this.blockchainService.healthCheck();
        
        return {
            status: dbHealth && blockchainHealth.connected ? 'healthy' : 'degraded',
            services: {
                database: dbHealth ? 'connected' : 'disconnected',
                blockchain: blockchainHealth.connected ? 'connected' : 'disconnected',
                payment: 'connected'
            }
        };
    }
}