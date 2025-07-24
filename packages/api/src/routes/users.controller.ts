// src/routes/users.controller.ts
import { Router, Request, Response } from 'express';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { syncUser } from '../middleware/user-sync.middleware';
import { DatabaseService } from '../services/database.service';
import { logger } from '../middleware/logging.middleware';

const router = Router();
const dbService = new DatabaseService();

// Currency validation helper
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'CLP', 'MXN', 'GBP'];
const CURRENCY_CONFIGS = {
  USD: {
    country: 'US',
    requiredFields: ['routingNumber', 'accountNumber'],
    accountTypes: ['checking', 'savings']
  },
  EUR: {
    country: null, // EUR is multinational, country must be provided
    requiredFields: ['iban'], // BIC/SWIFT can be derived from IBAN
    accountTypes: ['checking', 'savings', 'current']
  },
  CLP: {
    country: 'CL',
    requiredFields: ['rut', 'chileanAccountNumber'], // bankCode is now provided by bank selection
    accountTypes: ['checking', 'savings', 'vista', 'rut']
  },
  MXN: {
    country: 'MX',
    requiredFields: ['clabe'],
    accountTypes: ['checking', 'savings']
  },
  GBP: {
    country: 'GB',
    requiredFields: ['sortCode', 'ukAccountNumber'],
    accountTypes: ['checking', 'savings']
  }
};

// Validation helper for bank account data
function validateBankAccountData(currency: string, data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    errors.push(`Unsupported currency: ${currency}`);
    return { isValid: false, errors };
  }

  const config = CURRENCY_CONFIGS[currency as keyof typeof CURRENCY_CONFIGS];
  
  // Check required fields for this currency
  for (const field of config.requiredFields) {
    if (!data[field] || data[field].trim() === '') {
      errors.push(`${field} is required for ${currency} accounts`);
    }
  }

  // Validate account type if provided
  if (data.accountType && !config.accountTypes.includes(data.accountType)) {
    errors.push(`Invalid account type for ${currency}. Supported types: ${config.accountTypes.join(', ')}`);
  }

  return { isValid: errors.length === 0, errors };
}

// GET /api/users/search - Intelligent search for users by email/username/phone
router.get('/search', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { q: query, limit = '10', currency, country } = req.query;
    
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Invalid query',
        message: 'Query must be at least 2 characters long'
      });
    }

    const searchLimit = Math.min(parseInt(limit as string) || 10, 50);
    const searchQuery = query.trim();
    
    // Intelligent search: automatically detect if it's email, phone, or username
    const users = await dbService.intelligentUserSearch(searchQuery, searchLimit, currency as string, country as string);
    
    // Transform the response to include supported currencies and payment methods
    const searchResults = users.map((user: any) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      isVerified: user.isVerified,
      supportedCurrencies: (user.bankAccounts || [])
        .filter((account: any) => account.isVerified && account.isActive)
        .map((account: any) => account.currency),
      verifiedPaymentMethods: (user.bankAccounts || [])
        .filter((account: any) => account.isVerified && account.isActive)
        .map((account: any) => ({
          id: account.id,
          type: 'bank_account',
          currency: account.currency,
          bankName: account.bankName,
          accountType: account.accountType,
          lastFourDigits: account.accountNumber ? account.accountNumber.slice(-4) : undefined,
          isDefault: account.isPrimary,
          verifiedAt: account.createdAt,
          country: account.country
        })),
      createdAt: user.createdAt
    }));

    logger.info('User search completed', {
      query: query.trim(),
      resultsCount: searchResults.length,
      requesterId: (req as AuthenticatedRequest).userId
    });

    res.json({
      users: searchResults,
      total: searchResults.length,
      query: query.trim()
    });
  } catch (error) {
    logger.error('User search failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query: req.query.q,
      requesterId: (req as AuthenticatedRequest).userId
    });

    res.status(500).json({
      error: 'Search failed',
      message: 'Unable to search users at this time'
    });
  }
});

// GET /api/users/me/recipients - Get user's saved recipients
router.get('/me/recipients', requireAuth, syncUser, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const recipients = await dbService.getUserSavedRecipients(authReq.userId);
    
    logger.info('Retrieved user recipients', {
      userId: authReq.userId,
      recipientCount: recipients.length
    });

    res.json({
      recipients,
      total: recipients.length
    });
  } catch (error) {
    logger.error('Failed to retrieve recipients', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: authReq.userId
    });

    res.status(500).json({
      error: 'Failed to retrieve recipients',
      message: 'Unable to fetch saved recipients'
    });
  }
});

// POST /api/users/me/recipients - Save a new recipient
router.post('/me/recipients', requireAuth, syncUser, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const {
      name,
      email,
      phone,
      currency,
      country,
      bankName,
      accountHolderName,
      accountType,
      isDefault,
      // Currency-specific fields
      iban,
      bic,
      routingNumber,
      accountNumber,
      rut,
      bankCode,
      chileanAccountNumber,
      clabe,
      sortCode,
      ukAccountNumber
    } = req.body;

    // Validate required fields
    if (!name || !email || !currency || !bankName || !accountHolderName) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'name, email, currency, bankName, and accountHolderName are required'
      });
    }

    // Validate bank account data for the currency
    const validation = validateBankAccountData(currency, req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid bank account data',
        message: validation.errors.join(', ')
      });
    }

    const recipient = await dbService.createSavedRecipient({
      userId: authReq.userId,
      name,
      email,
      phone,
      currency,
      country: country || CURRENCY_CONFIGS[currency as keyof typeof CURRENCY_CONFIGS].country,
      bankName,
      accountHolderName,
      accountType,
      isDefault,
      iban,
      bic,
      routingNumber,
      accountNumber,
      rut,
      bankCode,
      chileanAccountNumber,
      clabe,
      sortCode,
      ukAccountNumber
    });

    logger.info('Created saved recipient', {
      userId: authReq.userId,
      recipientId: recipient.id,
      currency,
      isDefault
    });

    res.status(201).json(recipient);
  } catch (error) {
    logger.error('Failed to create recipient', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: authReq.userId
    });

    res.status(500).json({
      error: 'Failed to create recipient',
      message: 'Unable to save recipient'
    });
  }
});

// PUT /api/users/me/recipients/:id - Update a saved recipient
router.put('/me/recipients/:id', requireAuth, syncUser, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If currency is being updated, validate the bank account data
    if (updateData.currency) {
      const validation = validateBankAccountData(updateData.currency, updateData);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Invalid bank account data',
          message: validation.errors.join(', ')
        });
      }
    }

    const recipient = await dbService.updateSavedRecipient(id, updateData);

    logger.info('Updated saved recipient', {
      userId: authReq.userId,
      recipientId: id
    });

    res.json(recipient);
  } catch (error) {
    if (error instanceof Error && error.message === 'Saved recipient not found') {
      return res.status(404).json({
        error: 'Recipient not found',
        message: 'The specified recipient does not exist'
      });
    }

    logger.error('Failed to update recipient', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: authReq.userId,
      recipientId: req.params.id
    });

    res.status(500).json({
      error: 'Failed to update recipient',
      message: 'Unable to update recipient'
    });
  }
});

// DELETE /api/users/me/recipients/:id - Delete a saved recipient
router.delete('/me/recipients/:id', requireAuth, syncUser, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { id } = req.params;
    
    await dbService.deleteSavedRecipient(id);

    logger.info('Deleted saved recipient', {
      userId: authReq.userId,
      recipientId: id
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete recipient', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: authReq.userId,
      recipientId: req.params.id
    });

    res.status(500).json({
      error: 'Failed to delete recipient',
      message: 'Unable to delete recipient'
    });
  }
});

// GET /api/users/me/bank-accounts - Get user's bank accounts
router.get('/me/bank-accounts', requireAuth, syncUser, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const bankAccounts = await dbService.getUserBankAccounts(authReq.userId);
    
    logger.info('Retrieved user bank accounts', {
      userId: authReq.userId,
      accountCount: bankAccounts.length
    });

    res.json({
      bankAccounts,
      total: bankAccounts.length
    });
  } catch (error) {
    logger.error('Failed to retrieve bank accounts', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: authReq.userId
    });

    res.status(500).json({
      error: 'Failed to retrieve bank accounts',
      message: 'Unable to fetch bank accounts'
    });
  }
});

// POST /api/users/me/bank-accounts - Add a new bank account
router.post('/me/bank-accounts', requireAuth, syncUser, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const {
      accountName,
      currency,
      country,
      bankName,
      accountHolderName,
      accountType,
      isPrimary,
      // Currency-specific fields
      iban,
      bic,
      routingNumber,
      accountNumber,
      rut,
      bankCode,
      chileanAccountNumber,
      clabe,
      sortCode,
      ukAccountNumber
    } = req.body;

    // Validate required fields
    if (!accountName || !currency || !bankName || !accountHolderName) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'accountName, currency, bankName, and accountHolderName are required'
      });
    }

    // EUR requires country to be specified
    if (currency === 'EUR' && !country) {
      return res.status(400).json({
        error: 'Country required for EUR accounts',
        message: 'Please specify the country for your EUR account'
      });
    }

    // Validate bank account data for the currency
    const validation = validateBankAccountData(currency, req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid bank account data',
        message: validation.errors.join(', ')
      });
    }

    const bankAccount = await dbService.createBankAccount({
      userId: authReq.userId,
      accountName,
      currency,
      country: country || CURRENCY_CONFIGS[currency as keyof typeof CURRENCY_CONFIGS].country || 'US',
      bankName,
      accountHolderName,
      accountType,
      isPrimary,
      iban,
      bic,
      routingNumber,
      accountNumber,
      rut,
      bankCode,
      chileanAccountNumber,
      clabe,
      sortCode,
      ukAccountNumber
    });

    logger.info('Created bank account', {
      userId: authReq.userId,
      accountId: bankAccount.id,
      currency,
      isPrimary
    });

    res.status(201).json(bankAccount);
  } catch (error) {
    logger.error('Failed to create bank account', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: authReq.userId
    });

    res.status(500).json({
      error: 'Failed to create bank account',
      message: 'Unable to add bank account'
    });
  }
});

// PUT /api/users/me/bank-accounts/:id - Update a bank account
router.put('/me/bank-accounts/:id', requireAuth, syncUser, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get the existing account to check ownership
    const existingAccount = await dbService.getBankAccountById(id);
    if (!existingAccount || existingAccount.userId !== authReq.userId) {
      return res.status(404).json({
        error: 'Bank account not found',
        message: 'The specified bank account does not exist or you do not have permission to modify it'
      });
    }

    // If currency-specific fields are being updated, validate them
    if (updateData.iban || updateData.bic || updateData.routingNumber || 
        updateData.accountNumber || updateData.rut || updateData.bankCode || 
        updateData.clabe || updateData.sortCode || updateData.ukAccountNumber) {
      const validation = validateBankAccountData(existingAccount.currency, updateData);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Invalid bank account data',
          message: validation.errors.join(', ')
        });
      }
    }

    const bankAccount = await dbService.updateBankAccount(id, updateData);

    logger.info('Updated bank account', {
      userId: authReq.userId,
      accountId: id
    });

    res.json(bankAccount);
  } catch (error) {
    if (error instanceof Error && error.message === 'Bank account not found') {
      return res.status(404).json({
        error: 'Bank account not found',
        message: 'The specified bank account does not exist'
      });
    }

    logger.error('Failed to update bank account', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: authReq.userId,
      accountId: req.params.id
    });

    res.status(500).json({
      error: 'Failed to update bank account',
      message: 'Unable to update bank account'
    });
  }
});

// DELETE /api/users/me/bank-accounts/:id - Delete (deactivate) a bank account
router.delete('/me/bank-accounts/:id', requireAuth, syncUser, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { id } = req.params;
    
    // Get the existing account to check ownership
    const existingAccount = await dbService.getBankAccountById(id);
    if (!existingAccount || existingAccount.userId !== authReq.userId) {
      return res.status(404).json({
        error: 'Bank account not found',
        message: 'The specified bank account does not exist or you do not have permission to delete it'
      });
    }

    await dbService.deleteBankAccount(id);

    logger.info('Deleted bank account', {
      userId: authReq.userId,
      accountId: id
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete bank account', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: authReq.userId,
      accountId: req.params.id
    });

    res.status(500).json({
      error: 'Failed to delete bank account',
      message: 'Unable to delete bank account'
    });
  }
});

// GET /api/users/me/supported-currencies - Get currencies supported by user's verified accounts
router.get('/me/supported-currencies', requireAuth, syncUser, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const supportedCurrencies = await dbService.getUserSupportedCurrencies(authReq.userId);
    
    res.json({
      currencies: supportedCurrencies,
      total: supportedCurrencies.length
    });
  } catch (error) {
    logger.error('Failed to retrieve supported currencies', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: authReq.userId
    });

    res.status(500).json({
      error: 'Failed to retrieve supported currencies',
      message: 'Unable to fetch supported currencies'
    });
  }
});

export default router;