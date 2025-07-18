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
        blockNumber?: number;
        gasUsed?: string;
        confirmations?: number;
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

            console.log(`🔗 Blockchain mode: ${healthCheck.mode}`);
            
            // For now, we'll use a placeholder recipient address
            // In a real implementation, this would come from the recipient information
            const recipientAddress = transaction.recipientWalletAddress || '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'; // Placeholder
            
            // Convert amount to proper units (assuming USDC with 6 decimals)
            const amountInTokenUnits = Math.floor(transaction.recipientAmount * 1000000); // Convert to 6 decimal places
            
            console.log(`💸 Releasing ${transaction.recipientAmount} tokens to ${recipientAddress}`);
            
            // Call the blockchain service to release funds
            const releaseResult = await this.blockchainService.releaseFunds(
                recipientAddress,
                amountInTokenUnits.toString(),
                transaction.id
            );
            
            console.log(`✅ Blockchain release initiated: ${releaseResult.txHash}`);
            
            // Wait for blockchain confirmation
            console.log('⏳ Waiting for blockchain confirmation...');
            const requiredConfirmations = this.blockchainService.isRealMode() ? 1 : 0;
            
            if (requiredConfirmations > 0) {
                const confirmed = await this.blockchainService.waitForConfirmations(
                    releaseResult.txHash, 
                    requiredConfirmations
                );
                
                if (!confirmed) {
                    return {
                        success: false,
                        transactionHash: releaseResult.txHash,
                        error: 'Transaction failed to get required confirmations'
                    };
                }
            }
            
            // Get final transaction details
            const txDetails = await this.blockchainService.getTransactionDetails(releaseResult.txHash);
            
            console.log(`🎉 Blockchain transaction confirmed!`);
            console.log(`   Hash: ${releaseResult.txHash}`);
            console.log(`   Block: ${releaseResult.blockNumber}`);
            console.log(`   Gas Used: ${releaseResult.gasUsed}`);
            console.log(`   Confirmations: ${txDetails?.confirmations || 0}`);
            
            return {
                success: true,
                transactionHash: releaseResult.txHash,
                blockNumber: releaseResult.blockNumber,
                gasUsed: releaseResult.gasUsed,
                confirmations: txDetails?.confirmations || 0
            };
            
        } catch (error) {
            console.error('❌ Blockchain release failed:', error);
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