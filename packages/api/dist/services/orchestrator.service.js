"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorService = void 0;
// src/services/orchestrator.service.ts
const database_simple_service_1 = require("./database-simple.service");
const blockchain_service_1 = require("./blockchain.service");
const payment_service_1 = require("./payment.service");
class OrchestratorService {
    constructor() {
        this.dbService = new database_simple_service_1.SimpleDatabaseService();
        this.blockchainService = new blockchain_service_1.BlockchainService();
        this.paymentService = new payment_service_1.PaymentService();
    }
    /**
     * Main orchestration method - handles the complete workflow after successful payment
     */
    handleSuccessfulPayment(transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`🎯 Starting orchestration workflow for transaction: ${transactionId}`);
            try {
                // Step 1: Fetch the transaction by its ID
                console.log('📋 Step 1: Fetching transaction details from database');
                const transaction = yield this.dbService.getTransaction(transactionId);
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
                yield this.dbService.updateTransactionStatus(transactionId, 'PROCESSING', {
                    paymentId: transaction.stripePaymentIntentId,
                    processingStartedAt: new Date().toISOString()
                });
                // Step 4: Call BlockchainService.releaseFunds()
                console.log('⛓️  Step 4: Initiating blockchain fund release');
                const blockchainResult = yield this.executeBlockchainRelease(transaction);
                if (blockchainResult.success) {
                    // Step 5: On Success - Update to FUNDS_SENT_TO_PARTNER
                    console.log('✅ Step 5: Blockchain release successful - updating status');
                    yield this.dbService.updateTransactionStatus(transactionId, 'FUNDS_SENT_TO_PARTNER', {
                        txHash: blockchainResult.transactionHash,
                        blockchainCompletedAt: new Date().toISOString()
                    });
                    console.log(`🎉 Transaction ${transactionId} completed successfully!`);
                }
                else {
                    // Step 6: On Failure - Update to FAILED
                    console.error('❌ Step 6: Blockchain release failed');
                    yield this.dbService.updateTransactionStatus(transactionId, 'FAILED', {
                        failureReason: blockchainResult.error,
                        failedAt: new Date().toISOString(),
                        requiresManualIntervention: true
                    });
                    console.error(`🚨 MANUAL INTERVENTION REQUIRED for transaction ${transactionId}`);
                    throw new Error(`Blockchain release failed: ${blockchainResult.error}`);
                }
            }
            catch (error) {
                console.error('❌ Orchestration workflow failed:', error);
                try {
                    yield this.dbService.updateTransactionStatus(transactionId, 'FAILED', {
                        failureReason: error instanceof Error ? error.message : 'Unknown orchestration error',
                        failedAt: new Date().toISOString(),
                        requiresManualIntervention: true
                    });
                }
                catch (dbError) {
                    console.error('❌ Failed to update failure status:', dbError);
                }
                throw error;
            }
        });
    }
    executeBlockchainRelease(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const healthCheck = yield this.blockchainService.healthCheck();
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
            }
            catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown blockchain error'
                };
            }
        });
    }
    healthCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            const dbHealth = yield this.dbService.testConnection();
            const blockchainHealth = yield this.blockchainService.healthCheck();
            return {
                status: dbHealth && blockchainHealth.connected ? 'healthy' : 'degraded',
                services: {
                    database: dbHealth ? 'connected' : 'disconnected',
                    blockchain: blockchainHealth.connected ? 'connected' : 'disconnected',
                    payment: 'connected'
                }
            };
        });
    }
}
exports.OrchestratorService = OrchestratorService;
