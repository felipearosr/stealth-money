"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircleVerificationService = void 0;
const circle_service_1 = require("./circle.service");
const circle_error_handler_1 = require("../utils/circle-error-handler");
/**
 * Circle Verification Service for micro-deposit bank account verification
 * Handles sending small amounts to bank accounts for verification purposes
 */
class CircleVerificationService extends circle_service_1.CircleService {
    constructor() {
        super(...arguments);
        // Company verification wallet (should be configured via environment)
        this.VERIFICATION_WALLET_ID = process.env.CIRCLE_VERIFICATION_WALLET_ID || 'verification-wallet-id';
        this.MINIMUM_BALANCE_USD = '100.00'; // Minimum $100 USD in verification wallet
        this.MICRO_DEPOSIT_EXPIRY_DAYS = 7; // 7 days to verify
    }
    /**
     * Send micro-deposits to a bank account for verification
     */
    async sendMicroDeposits(request) {
        return circle_error_handler_1.CircleRetryHandler.withRetry(async () => {
            try {
                this.validateMicroDepositRequest(request);
                // Check verification wallet balance first
                await this.ensureSufficientBalance(request.amount1 + request.amount2);
                // Determine transfer method based on bank account location
                const transferMethod = this.getTransferMethod(request.bankAccount);
                // Send the two micro-deposits
                const payout1 = await this.sendMicroDeposit(request, request.amount1, `Verification deposit 1 - ${request.description || 'Bank account verification'}`);
                const payout2 = await this.sendMicroDeposit(request, request.amount2, `Verification deposit 2 - ${request.description || 'Bank account verification'}`);
                // Create verification record
                const verificationId = this.generateIdempotencyKey('verification');
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + this.MICRO_DEPOSIT_EXPIRY_DAYS);
                return {
                    id: verificationId,
                    bankAccountId: request.bankAccount.id,
                    payoutId1: payout1.id,
                    payoutId2: payout2.id,
                    amount1: {
                        amount: this.formatAmountFromCents(request.amount1),
                        currency: this.getCurrencyForCountry(request.bankAccount.country)
                    },
                    amount2: {
                        amount: this.formatAmountFromCents(request.amount2),
                        currency: this.getCurrencyForCountry(request.bankAccount.country)
                    },
                    status: 'pending',
                    estimatedArrival: this.getEstimatedArrival(request.bankAccount.country),
                    createDate: new Date().toISOString(),
                    expiresAt: expiresAt.toISOString(),
                    metadata: {
                        ...request.metadata,
                        transferMethod,
                        bankAccountId: request.bankAccount.id
                    }
                };
            }
            catch (error) {
                this.handleCircleError(error, 'micro-deposit creation');
            }
        }, 'micro-deposit creation', 3, 2000, 10000);
    }
    /**
     * Check the status of micro-deposits
     */
    async getMicroDepositStatus(verificationId) {
        try {
            // In a real implementation, this would fetch from database/Circle API
            // For now, we'll use the mock implementation
            const response = await this.mockGetMicroDepositStatus(verificationId);
            return response;
        }
        catch (error) {
            this.handleCircleError(error, 'micro-deposit status retrieval');
        }
    }
    /**
     * Get verification wallet balance
     */
    async getVerificationWalletBalance() {
        try {
            // Mock API call - in real implementation this would call Circle API
            const response = await this.mockGetWalletBalance(this.VERIFICATION_WALLET_ID);
            return {
                walletId: this.VERIFICATION_WALLET_ID,
                balance: {
                    amount: response.available[0]?.amount || '0',
                    currency: response.available[0]?.currency || 'USD'
                },
                minimumBalance: this.MINIMUM_BALANCE_USD
            };
        }
        catch (error) {
            this.handleCircleError(error, 'verification wallet balance retrieval');
        }
    }
    /**
     * Ensure verification wallet has sufficient balance
     */
    async ensureSufficientBalance(totalAmountCents) {
        const wallet = await this.getVerificationWalletBalance();
        const currentBalance = parseFloat(wallet.balance.amount);
        const requiredAmount = totalAmountCents / 100; // Convert cents to dollars
        const minimumBalance = parseFloat(this.MINIMUM_BALANCE_USD);
        if (currentBalance < requiredAmount + minimumBalance) {
            throw new Error(`Insufficient verification wallet balance. Current: $${currentBalance}, ` +
                `Required: $${requiredAmount + minimumBalance} (including $${minimumBalance} minimum reserve)`);
        }
    }
    /**
     * Send a single micro-deposit
     */
    async sendMicroDeposit(request, amountCents, description) {
        const amountUSD = this.formatAmountFromCents(amountCents);
        const idempotencyKey = this.generateIdempotencyKey('micro-deposit');
        // Determine the appropriate Circle API method based on destination
        if (request.bankAccount.country === 'US') {
            // US ACH transfer
            return await this.sendUSACHTransfer({
                idempotencyKey,
                sourceWalletId: request.sourceWalletId,
                amount: amountUSD,
                routingNumber: request.bankAccount.routingNumber,
                accountNumber: request.bankAccount.accountNumber,
                accountHolderName: request.bankAccount.accountHolderName,
                description
            });
        }
        else {
            // International wire transfer
            return await this.sendInternationalTransfer({
                idempotencyKey,
                sourceWalletId: request.sourceWalletId,
                amount: amountUSD,
                bankAccount: request.bankAccount,
                description
            });
        }
    }
    /**
     * Send US ACH transfer for micro-deposit
     */
    async sendUSACHTransfer(request) {
        // Mock API call - in real implementation this would call Circle's ACH API
        const achRequest = {
            idempotencyKey: request.idempotencyKey,
            source: {
                type: 'wallet',
                id: request.sourceWalletId
            },
            destination: {
                type: 'ach',
                accountNumber: request.accountNumber,
                routingNumber: request.routingNumber,
                accountHolderName: request.accountHolderName,
                accountType: 'checking', // Default to checking for verification
            },
            amount: {
                amount: request.amount,
                currency: 'USD'
            },
            description: request.description
        };
        const response = await this.mockCreateACHPayout(achRequest);
        if (!response.data) {
            throw new Error('No ACH payout data received from Circle API');
        }
        return {
            id: response.data.id,
            status: response.data.status
        };
    }
    /**
     * Send international transfer for micro-deposit
     */
    async sendInternationalTransfer(request) {
        // Convert USD to local currency if needed
        const localCurrency = this.getCurrencyForCountry(request.bankAccount.country);
        const localAmount = await this.convertUSDToLocalCurrency(request.amount, localCurrency);
        // Mock API call - in real implementation this would call Circle's international transfer API
        const wireRequest = {
            idempotencyKey: request.idempotencyKey,
            source: {
                type: 'wallet',
                id: request.sourceWalletId
            },
            destination: this.buildInternationalDestination(request.bankAccount),
            amount: {
                amount: localAmount,
                currency: localCurrency
            },
            description: request.description
        };
        const response = await this.mockCreateInternationalPayout(wireRequest);
        if (!response.data) {
            throw new Error('No international payout data received from Circle API');
        }
        return {
            id: response.data.id,
            status: response.data.status
        };
    }
    /**
     * Build destination object for international transfers
     */
    buildInternationalDestination(bankAccount) {
        switch (bankAccount.country) {
            case 'CL': // Chile
                return {
                    type: 'wire',
                    beneficiary: {
                        name: bankAccount.accountHolderName,
                        address1: 'Santiago, Chile', // Default address
                        country: 'CL'
                    },
                    beneficiaryBank: {
                        name: bankAccount.bankName,
                        accountNumber: bankAccount.accountNumber,
                        routingNumber: bankAccount.rut, // Use RUT as identifier
                        country: 'CL'
                    }
                };
            case 'MX': // Mexico
                return {
                    type: 'wire',
                    beneficiary: {
                        name: bankAccount.accountHolderName,
                        address1: 'Mexico City, Mexico',
                        country: 'MX'
                    },
                    beneficiaryBank: {
                        name: bankAccount.bankName,
                        accountNumber: bankAccount.clabe,
                        country: 'MX'
                    }
                };
            default: // European countries (SEPA)
                return {
                    type: 'wire',
                    beneficiary: {
                        name: bankAccount.accountHolderName,
                        address1: 'Europe', // Default
                        country: bankAccount.country
                    },
                    beneficiaryBank: {
                        name: bankAccount.bankName,
                        swiftCode: bankAccount.bic,
                        accountNumber: bankAccount.iban,
                        country: bankAccount.country
                    }
                };
        }
    }
    /**
     * Get estimated arrival time for micro-deposits
     */
    getEstimatedArrival(country) {
        switch (country) {
            case 'US':
                return { min: 1, max: 3, unit: 'days' }; // ACH typically 1-3 business days
            case 'CL':
            case 'MX':
                return { min: 2, max: 5, unit: 'days' }; // International wire 2-5 days
            default:
                return { min: 1, max: 2, unit: 'days' }; // SEPA transfers 1-2 days
        }
    }
    /**
     * Get transfer method based on bank account location
     */
    getTransferMethod(bankAccount) {
        switch (bankAccount.country) {
            case 'US':
                return 'ACH';
            case 'CL':
            case 'MX':
                return 'International Wire';
            default:
                return 'SEPA Transfer';
        }
    }
    /**
     * Get appropriate currency for country
     */
    getCurrencyForCountry(country) {
        const currencyMap = {
            'US': 'USD',
            'CL': 'CLP',
            'MX': 'MXN',
            'GB': 'GBP',
            'EU': 'EUR',
            'DE': 'EUR',
            'FR': 'EUR',
            'ES': 'EUR',
            'IT': 'EUR',
            'NL': 'EUR'
        };
        return currencyMap[country] || 'USD';
    }
    /**
     * Convert USD amount to local currency (mock implementation)
     */
    async convertUSDToLocalCurrency(usdAmount, currency) {
        // Mock exchange rates - in real implementation, use Circle's FX API or external rate service
        const exchangeRates = {
            'USD': 1.0,
            'CLP': 800, // Approximate rate
            'MXN': 18,
            'EUR': 0.85,
            'GBP': 0.75
        };
        const rate = exchangeRates[currency] || 1.0;
        const convertedAmount = parseFloat(usdAmount) * rate;
        return convertedAmount.toFixed(2);
    }
    /**
     * Format amount from cents to dollar string
     */
    formatAmountFromCents(cents) {
        return (cents / 100).toFixed(2);
    }
    /**
     * Validate micro-deposit request
     */
    validateMicroDepositRequest(request) {
        if (!request.bankAccount) {
            throw new Error('Bank account is required');
        }
        if (!request.bankAccount.id) {
            throw new Error('Bank account ID is required');
        }
        if (!request.bankAccount.accountNumber) {
            throw new Error('Account number is required');
        }
        if (!request.bankAccount.accountHolderName) {
            throw new Error('Account holder name is required');
        }
        if (!request.bankAccount.country) {
            throw new Error('Bank account country is required');
        }
        // Validate US-specific fields
        if (request.bankAccount.country === 'US' && !request.bankAccount.routingNumber) {
            throw new Error('Routing number is required for US bank accounts');
        }
        // Validate Chilean-specific fields
        if (request.bankAccount.country === 'CL' && !request.bankAccount.rut) {
            throw new Error('RUT is required for Chilean bank accounts');
        }
        // Validate amounts
        if (!request.amount1 || request.amount1 < 1 || request.amount1 > 99) {
            throw new Error('Amount 1 must be between 1 and 99 cents');
        }
        if (!request.amount2 || request.amount2 < 1 || request.amount2 > 99) {
            throw new Error('Amount 2 must be between 1 and 99 cents');
        }
        if (request.amount1 === request.amount2) {
            throw new Error('The two micro-deposit amounts must be different');
        }
        if (!request.sourceWalletId) {
            throw new Error('Source wallet ID is required');
        }
    }
    // Mock implementations for testing (replace with real Circle API calls)
    async mockCreateACHPayout(request) {
        return {
            data: {
                id: `ach-payout-${Date.now()}`,
                status: 'pending',
                amount: request.amount,
                destination: request.destination,
                createDate: new Date().toISOString()
            }
        };
    }
    async mockCreateInternationalPayout(request) {
        return {
            data: {
                id: `intl-payout-${Date.now()}`,
                status: 'pending',
                amount: request.amount,
                destination: request.destination,
                createDate: new Date().toISOString()
            }
        };
    }
    async mockGetWalletBalance(walletId) {
        return {
            available: [
                { amount: '500.00', currency: 'USD' } // Mock $500 balance
            ]
        };
    }
    async mockGetMicroDepositStatus(verificationId) {
        return {
            id: verificationId,
            bankAccountId: 'mock-bank-account-id',
            payoutId1: `payout-1-${Date.now()}`,
            payoutId2: `payout-2-${Date.now()}`,
            amount1: { amount: '0.12', currency: 'USD' },
            amount2: { amount: '0.34', currency: 'USD' },
            status: 'sent',
            estimatedArrival: { min: 1, max: 3, unit: 'days' },
            createDate: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
    }
}
exports.CircleVerificationService = CircleVerificationService;
