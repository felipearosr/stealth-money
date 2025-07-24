// src/routes/verification.controller.ts
import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { syncUser } from '../middleware/user-sync.middleware';
import { DatabaseService } from '../services/database.service';
import { CircleVerificationService, VerificationBankAccount, CreateMicroDepositRequest } from '../services/circle-verification.service';
import { HybridVerificationService, VerificationRequest } from '../services/hybrid-verification.service';
import { logger } from '../middleware/logging.middleware';

const router = Router();
const dbService = new DatabaseService();
const circleVerificationService = new CircleVerificationService();
const hybridVerificationService = new HybridVerificationService();

// POST /api/users/me/bank-accounts/:id/verify/micro-deposits - Start micro-deposit verification
router.post('/users/me/bank-accounts/:id/verify/micro-deposits', requireAuth, syncUser, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    // Get the bank account and verify ownership
    const account = await dbService.getBankAccountById(id);
    if (!account || (account as any).user?.id !== authReq.userId) {
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

    // Build verification request for hybrid service
    const verificationRequest: VerificationRequest = {
      bankAccount: {
        id: account.id,
        accountNumber: account.accountNumber || '',
        routingNumber: account.routingNumber || undefined,
        country: account.country,
        currency: account.currency,
        accountHolderName: account.accountHolderName,
        bankName: account.bankName,
        iban: account.iban || undefined,
        bic: account.bic || undefined,
        rut: account.rut || undefined,
        bankCode: account.bankCode || undefined,
        chileanAccountNumber: account.chileanAccountNumber || undefined,
        clabe: account.clabe || undefined,
        sortCode: account.sortCode || undefined
      },
      userId: authReq.userId,
      metadata: {
        accountId: id,
        accountName: account.accountName,
        initiatedAt: new Date().toISOString()
      }
    };

    try {
      // Use hybrid verification service (smart routing by country)
      const verificationResponse = await hybridVerificationService.startVerification(verificationRequest);
      
      // Store verification data
      const verificationData = {
        hybridVerificationId: verificationResponse.id,
        method: verificationResponse.method,
        provider: verificationResponse.provider,
        cost: verificationResponse.cost,
        attempts: 0,
        maxAttempts: 3,
        startedAt: new Date().toISOString(),
        expiresAt: verificationResponse.expiresAt,
        status: verificationResponse.status,
        metadata: verificationResponse.metadata
      };

      // Update account with verification method and data
      await dbService.updateBankAccount(id, {
        verificationMethod: verificationResponse.method,
        verificationData: verificationData
      });

      logger.info('Smart verification initiated', {
        userId: authReq.userId,
        accountId: id,
        country: account.country,
        provider: verificationResponse.provider,
        method: verificationResponse.method,
        cost: verificationResponse.cost,
        estimatedTime: verificationResponse.estimatedTime
      });

      // Build response based on verification method
      const response: any = {
        message: `Bank account verification started with ${verificationResponse.provider}`,
        verificationId: verificationResponse.id,
        method: verificationResponse.method,
        provider: verificationResponse.provider,
        cost: verificationResponse.cost,
        estimatedTime: `${verificationResponse.estimatedTime.min}-${verificationResponse.estimatedTime.max} ${verificationResponse.estimatedTime.unit}`,
        instructions: verificationResponse.instructions,
        expiresAt: verificationResponse.expiresAt,
        attemptsRemaining: verificationData.maxAttempts
      };

      // Add OAuth redirect URL if needed
      if (verificationResponse.redirectUrl) {
        response.redirectUrl = verificationResponse.redirectUrl;
        response.oauthFlow = true;
      }

      res.json(response);

    } catch (error) {
      logger.error('Hybrid verification failed', {
        userId: authReq.userId,
        accountId: id,
        country: account.country,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Verification initiation failed',
        message: 'Unable to start bank account verification. Please try again.'
      });
    }
  } catch (error) {
    logger.error('Failed to start micro-deposit verification', {
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
router.post('/users/me/bank-accounts/:id/verify/micro-deposits/confirm', requireAuth, syncUser, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
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
    if (!account || (account as any).user?.id !== authReq.userId) {
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
    const correctAmounts = verificationData.amounts.sort((a: number, b: number) => a - b);  
    const sortedProvidedAmounts = providedAmounts.sort((a, b) => a - b);
    
    const amountsMatch = correctAmounts.length === sortedProvidedAmounts.length &&
      correctAmounts.every((amount: number, index: number) => amount === sortedProvidedAmounts[index]);

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
        const hasVerifiedAccount = (user as any).bankAccounts?.some((acc: any) => acc.isVerified && acc.isActive) || false;
        await dbService.updateUser(authReq.userId, { isVerified: hasVerifiedAccount });
      }

      logger.info('Bank account verified successfully', {
        userId: authReq.userId,
        accountId: id,
        method: 'micro_deposits'
      });

      res.json({
        message: 'Account verified successfully',
        verifiedAt: new Date().toISOString()
      });
    } else {
      // Failed attempt
      await dbService.updateBankAccount(id, {
        verificationData: verificationData
      });

      const attemptsRemaining = verificationData.maxAttempts - verificationData.attempts;

      logger.warn('Micro-deposit verification failed', {
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
  } catch (error) {
    logger.error('Failed to confirm micro-deposit verification', {
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
router.post('/users/me/bank-accounts/:id/verify/instant', requireAuth, syncUser, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    // Get the bank account and verify ownership
    const account = await dbService.getBankAccountById(id);
    if (!account || (account as any).user?.id !== authReq.userId) {
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
    logger.info('Instant verification requested', {
      userId: authReq.userId,
      accountId: id
    });

    res.json({
      message: 'Instant verification is coming soon',
      method: 'plaid_link',
      status: 'not_implemented',
      fallbackMessage: 'Please use micro-deposit verification for now'
    });
  } catch (error) {
    logger.error('Failed to start instant verification', {
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
router.get('/users/me/bank-accounts/:id/verification-status', requireAuth, syncUser, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    const account = await dbService.getBankAccountById(id);
    if (!account || (account as any).user?.id !== authReq.userId) {
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
  } catch (error) {
    logger.error('Failed to get verification status', {
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

// GET /api/verification/wallet-status - Get verification wallet status (admin/debug endpoint)
router.get('/verification/wallet-status', requireAuth, syncUser, async (req: Request, res: Response) => {
  try {
    const wallet = await circleVerificationService.getVerificationWalletBalance();
    
    res.json({
      walletId: wallet.walletId,
      balance: wallet.balance,
      minimumBalance: wallet.minimumBalance,
      status: parseFloat(wallet.balance.amount) >= parseFloat(wallet.minimumBalance) 
        ? 'sufficient' : 'low_balance',
      canSendVerifications: parseFloat(wallet.balance.amount) >= parseFloat(wallet.minimumBalance),
      environment: circleVerificationService.getEnvironment()
    });
  } catch (error) {
    logger.error('Failed to get verification wallet status', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to get wallet status',
      message: 'Unable to retrieve verification wallet status'
    });
  }
});

// GET /api/verification/cost-estimate/:country - Get verification cost estimate by country
router.get('/verification/cost-estimate/:country', async (req: Request, res: Response) => {
  try {
    const { country } = req.params;
    
    if (!country || country.length !== 2) {
      return res.status(400).json({
        error: 'Invalid country code',
        message: 'Please provide a valid 2-letter country code (e.g., US, CL, DE)'
      });
    }

    const estimate = await hybridVerificationService.getCostEstimate(country.toUpperCase());
    
    res.json({
      country: country.toUpperCase(),
      provider: estimate.provider,
      cost: estimate.cost,
      method: estimate.method,
      estimatedTime: estimate.estimatedTime,
      currency: 'USD'
    });
  } catch (error) {
    logger.error('Failed to get verification cost estimate', {
      error: error instanceof Error ? error.message : 'Unknown error',
      country: req.params.country
    });

    res.status(500).json({
      error: 'Failed to get cost estimate',
      message: 'Unable to retrieve verification cost estimate'
    });
  }
});

// GET /api/verification/supported-countries - Get all supported countries and their verification methods
router.get('/verification/supported-countries', async (req: Request, res: Response) => {
  try {
    const supportedCountries = hybridVerificationService.getSupportedCountries();
    
    res.json({
      supportedCountries,
      totalCountries: Object.keys(supportedCountries).length,
      averageCost: Object.values(supportedCountries).reduce((sum, country) => sum + country.cost, 0) / Object.keys(supportedCountries).length,
      providers: [...new Set(Object.values(supportedCountries).map(c => c.provider))]
    });
  } catch (error) {
    logger.error('Failed to get supported countries', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to get supported countries',
      message: 'Unable to retrieve supported countries list'
    });
  }
});

export default router;