"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/verification.controller.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const user_sync_middleware_1 = require("../middleware/user-sync.middleware");
const database_service_1 = require("../services/database.service");
const logging_middleware_1 = require("../middleware/logging.middleware");
const router = (0, express_1.Router)();
const dbService = new database_service_1.DatabaseService();
// POST /api/users/me/bank-accounts/:id/verify/micro-deposits - Start micro-deposit verification
router.post('/users/me/bank-accounts/:id/verify/micro-deposits', auth_middleware_1.requireAuth, user_sync_middleware_1.syncUser, async (req, res) => {
    const authReq = req;
    const { id } = req.params;
    try {
        // Get the bank account and verify ownership
        const account = await dbService.getBankAccountById(id);
        if (!account || account.user?.id !== authReq.userId) {
            return res.status(404).json({
                error: 'Bank account not found',
                message: 'The specified bank account does not exist or you do not have permission to verify it'
            });
        }
        if (account.isVerified) {
            return res.status(400).json({
                error: 'Account already verified',
                message: 'This bank account is already verified'
            });
        }
        // Generate random micro-deposit amounts (between $0.01 and $0.99)
        const amount1 = Math.floor(Math.random() * 99) + 1; // 1-99 cents
        const amount2 = Math.floor(Math.random() * 99) + 1; // 1-99 cents
        const amounts = [amount1, amount2];
        // Store verification data
        const verificationData = {
            amounts: amounts,
            attempts: 0,
            maxAttempts: 3,
            startedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        };
        // Update account with verification method and data
        await dbService.updateBankAccount(id, {
            verificationMethod: 'micro_deposits',
            verificationData: verificationData
        });
        // In a real system, you would actually send the micro-deposits here
        // For now, we'll simulate this step
        logging_middleware_1.logger.info('Micro-deposit verification started', {
            userId: authReq.userId,
            accountId: id,
            amounts: amounts // In production, don't log actual amounts
        });
        res.json({
            message: 'Micro-deposits have been initiated',
            estimatedArrival: '1-2 business days',
            expiresAt: verificationData.expiresAt,
            attemptsRemaining: verificationData.maxAttempts
        });
    }
    catch (error) {
        logging_middleware_1.logger.error('Failed to start micro-deposit verification', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: authReq.userId,
            accountId: id
        });
        res.status(500).json({
            error: 'Verification initiation failed',
            message: 'Unable to start micro-deposit verification'
        });
    }
});
// POST /api/users/me/bank-accounts/:id/verify/micro-deposits/confirm - Confirm micro-deposit amounts
router.post('/users/me/bank-accounts/:id/verify/micro-deposits/confirm', auth_middleware_1.requireAuth, user_sync_middleware_1.syncUser, async (req, res) => {
    const authReq = req;
    const { id } = req.params;
    const { amounts } = req.body;
    try {
        if (!amounts || !Array.isArray(amounts) || amounts.length !== 2) {
            return res.status(400).json({
                error: 'Invalid amounts',
                message: 'Please provide exactly 2 deposit amounts'
            });
        }
        // Convert to cents for comparison
        const providedAmounts = amounts.map(amount => Math.round(parseFloat(amount) * 100));
        // Get the bank account and verify ownership
        const account = await dbService.getBankAccountById(id);
        if (!account || account.user?.id !== authReq.userId) {
            return res.status(404).json({
                error: 'Bank account not found',
                message: 'The specified bank account does not exist or you do not have permission to verify it'
            });
        }
        if (account.isVerified) {
            return res.status(400).json({
                error: 'Account already verified',
                message: 'This bank account is already verified'
            });
        }
        if (account.verificationMethod !== 'micro_deposits' || !account.verificationData) {
            return res.status(400).json({
                error: 'Verification not started',
                message: 'Micro-deposit verification has not been started for this account'
            });
        }
        const verificationData = typeof account.verificationData === 'string'
            ? JSON.parse(account.verificationData)
            : account.verificationData;
        // Check if verification has expired
        if (new Date() > new Date(verificationData.expiresAt)) {
            return res.status(400).json({
                error: 'Verification expired',
                message: 'The verification period has expired. Please start the process again.'
            });
        }
        // Check if max attempts reached
        if (verificationData.attempts >= verificationData.maxAttempts) {
            return res.status(400).json({
                error: 'Max attempts reached',
                message: 'Maximum verification attempts exceeded. Please contact support.'
            });
        }
        // Check if amounts match
        const correctAmounts = verificationData.amounts.sort((a, b) => a - b);
        const sortedProvidedAmounts = providedAmounts.sort((a, b) => a - b);
        const amountsMatch = correctAmounts.length === sortedProvidedAmounts.length &&
            correctAmounts.every((amount, index) => amount === sortedProvidedAmounts[index]);
        // Update attempts
        verificationData.attempts += 1;
        if (amountsMatch) {
            // Success - verify the account
            await dbService.updateBankAccount(id, {
                isVerified: true,
                verificationData: {
                    ...verificationData,
                    verifiedAt: new Date().toISOString(),
                    status: 'verified'
                }
            });
            // Update user's hasVerifiedAccount flag
            const user = await dbService.getUserById(authReq.userId);
            if (user) {
                const hasVerifiedAccount = user.bankAccounts?.some((acc) => acc.isVerified && acc.isActive) || false;
                await dbService.updateUser(authReq.userId, { isVerified: hasVerifiedAccount });
            }
            logging_middleware_1.logger.info('Bank account verified successfully', {
                userId: authReq.userId,
                accountId: id,
                method: 'micro_deposits'
            });
            res.json({
                message: 'Account verified successfully',
                verifiedAt: new Date().toISOString()
            });
        }
        else {
            // Failed attempt
            await dbService.updateBankAccount(id, {
                verificationData: verificationData
            });
            const attemptsRemaining = verificationData.maxAttempts - verificationData.attempts;
            logging_middleware_1.logger.warn('Micro-deposit verification failed', {
                userId: authReq.userId,
                accountId: id,
                attemptsRemaining,
                totalFailures: verificationData.attempts
            });
            res.status(400).json({
                error: 'Verification failed',
                message: 'The amounts you entered do not match our records',
                attemptsRemaining,
                maxAttempts: verificationData.maxAttempts
            });
        }
    }
    catch (error) {
        logging_middleware_1.logger.error('Failed to confirm micro-deposit verification', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: authReq.userId,
            accountId: id
        });
        res.status(500).json({
            error: 'Verification confirmation failed',
            message: 'Unable to process verification'
        });
    }
});
// POST /api/users/me/bank-accounts/:id/verify/instant - Start instant verification (Plaid integration)
router.post('/users/me/bank-accounts/:id/verify/instant', auth_middleware_1.requireAuth, user_sync_middleware_1.syncUser, async (req, res) => {
    const authReq = req;
    const { id } = req.params;
    try {
        // Get the bank account and verify ownership
        const account = await dbService.getBankAccountById(id);
        if (!account || account.user?.id !== authReq.userId) {
            return res.status(404).json({
                error: 'Bank account not found',
                message: 'The specified bank account does not exist or you do not have permission to verify it'
            });
        }
        if (account.isVerified) {
            return res.status(400).json({
                error: 'Account already verified',
                message: 'This bank account is already verified'
            });
        }
        // In a real system, this would integrate with Plaid Link
        // For now, we'll return a mock response
        logging_middleware_1.logger.info('Instant verification requested', {
            userId: authReq.userId,
            accountId: id
        });
        res.json({
            message: 'Instant verification is coming soon',
            method: 'plaid_link',
            status: 'not_implemented',
            fallbackMessage: 'Please use micro-deposit verification for now'
        });
    }
    catch (error) {
        logging_middleware_1.logger.error('Failed to start instant verification', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: authReq.userId,
            accountId: id
        });
        res.status(500).json({
            error: 'Instant verification failed',
            message: 'Unable to start instant verification'
        });
    }
});
// GET /api/users/me/bank-accounts/:id/verification-status - Get verification status
router.get('/users/me/bank-accounts/:id/verification-status', auth_middleware_1.requireAuth, user_sync_middleware_1.syncUser, async (req, res) => {
    const authReq = req;
    const { id } = req.params;
    try {
        const account = await dbService.getBankAccountById(id);
        if (!account || account.user.id !== authReq.userId) {
            return res.status(404).json({
                error: 'Bank account not found',
                message: 'The specified bank account does not exist or you do not have permission to access it'
            });
        }
        const verificationData = account.verificationData
            ? (typeof account.verificationData === 'string'
                ? JSON.parse(account.verificationData)
                : account.verificationData)
            : null;
        res.json({
            accountId: id,
            isVerified: account.isVerified,
            verificationMethod: account.verificationMethod,
            verificationStartedAt: verificationData?.startedAt || null,
            verifiedAt: verificationData?.verifiedAt || null,
            verificationFailures: verificationData?.attempts || 0,
            status: account.isVerified ? 'verified' :
                account.verificationMethod ? 'pending' : 'not_started',
            attemptsRemaining: verificationData ?
                Math.max(0, verificationData.maxAttempts - verificationData.attempts) : null,
            expiresAt: verificationData?.expiresAt || null
        });
    }
    catch (error) {
        logging_middleware_1.logger.error('Failed to get verification status', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: authReq.userId,
            accountId: id
        });
        res.status(500).json({
            error: 'Failed to get verification status',
            message: 'Unable to retrieve verification status'
        });
    }
});
exports.default = router;
