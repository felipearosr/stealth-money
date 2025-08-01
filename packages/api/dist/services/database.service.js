"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
// src/services/database.service.ts
const client_1 = require("@prisma/client");
class DatabaseService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    // User management
    async createUser(data) {
        return this.prisma.user.create({
            data: {
                id: data.id,
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                isDiscoverable: data.isDiscoverable ?? true,
            },
        });
    }
    async getUserById(id) {
        return this.prisma.user.findUnique({
            where: { id },
            include: {
                bankAccounts: {
                    where: { isActive: true },
                    orderBy: [
                        { isPrimary: 'desc' },
                        { createdAt: 'desc' }
                    ]
                }
            }
        });
    }
    async getUserByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
            include: {
                bankAccounts: {
                    where: { isActive: true },
                    orderBy: [
                        { isPrimary: 'desc' },
                        { createdAt: 'desc' }
                    ]
                }
            }
        });
    }
    async updateUser(id, data) {
        return this.prisma.user.update({
            where: { id },
            data,
        });
    }
    async searchUsers(query, limit = 10) {
        return this.prisma.user.findMany({
            where: {
                AND: [
                    { isDiscoverable: true },
                    {
                        OR: [
                            { email: { contains: query, mode: 'insensitive' } },
                            { firstName: { contains: query, mode: 'insensitive' } },
                            { lastName: { contains: query, mode: 'insensitive' } },
                            { phone: { contains: query } }
                        ]
                    }
                ]
            },
            include: {
                bankAccounts: {
                    where: {
                        isActive: true,
                        isVerified: true
                    },
                    select: {
                        currency: true,
                        country: true,
                        isPrimary: true
                    }
                }
            },
            take: limit,
            orderBy: [
                { isVerified: 'desc' },
                { createdAt: 'desc' }
            ]
        });
    }
    // Intelligent user search - automatically detects email, phone, or username
    async intelligentUserSearch(query, limit = 10, currency, country) {
        const trimmedQuery = query.trim();
        // Detect query type
        const isEmail = trimmedQuery.includes('@');
        const isPhone = /^[\+]?[\d\s\-\(\)]+$/.test(trimmedQuery);
        const isUsername = !isEmail && !isPhone;
        // Build search conditions based on query type
        let searchConditions = [];
        if (isEmail) {
            // Prioritize exact email match, then partial
            searchConditions = [
                { email: { equals: trimmedQuery, mode: 'insensitive' } },
                { email: { contains: trimmedQuery, mode: 'insensitive' } }
            ];
        }
        else if (isPhone) {
            // Search phone number (clean formatting)
            const cleanPhone = trimmedQuery.replace(/[\s\-\(\)]/g, '');
            searchConditions = [
                { phone: { contains: cleanPhone } },
                { phone: { contains: trimmedQuery } }
            ];
        }
        else {
            // Username/name search - search across username, firstName, lastName
            searchConditions = [
                { username: { equals: trimmedQuery, mode: 'insensitive' } },
                { username: { contains: trimmedQuery, mode: 'insensitive' } },
                { firstName: { contains: trimmedQuery, mode: 'insensitive' } },
                { lastName: { contains: trimmedQuery, mode: 'insensitive' } },
                // Also search email for usernames that might be part of email
                { email: { contains: trimmedQuery, mode: 'insensitive' } }
            ];
        }
        // Base query conditions
        const baseWhere = {
            AND: [
                { isDiscoverable: true },
                {
                    OR: searchConditions
                }
            ]
        };
        // Add country filter for Chilean users if specified
        if (country === 'CL') {
            baseWhere.AND.push({ country: 'CL' });
        }
        // Enhanced query with currency filtering if provided
        let orderBy = [
            { isVerified: 'desc' }, // Verified users first
            { createdAt: 'desc' }
        ];
        // If currency is specified, prioritize users who support that currency
        if (currency) {
            const usersWithCurrency = await this.prisma.user.findMany({
                where: {
                    ...baseWhere,
                    bankAccounts: {
                        some: {
                            currency: currency,
                            isActive: true,
                            isVerified: true
                        }
                    }
                },
                include: {
                    bankAccounts: {
                        where: {
                            isActive: true,
                            isVerified: true
                        },
                        select: {
                            id: true,
                            currency: true,
                            country: true,
                            isPrimary: true,
                            bankName: true,
                            accountType: true,
                            accountNumber: true,
                            isVerified: true,
                            createdAt: true
                        }
                    }
                },
                take: limit,
                orderBy
            });
            // Get remaining users if we haven't hit the limit
            const remainingLimit = limit - usersWithCurrency.length;
            if (remainingLimit > 0) {
                const userIds = usersWithCurrency.map(u => u.id);
                const otherUsers = await this.prisma.user.findMany({
                    where: {
                        ...baseWhere,
                        id: { notIn: userIds }
                    },
                    include: {
                        bankAccounts: {
                            where: {
                                isActive: true,
                                isVerified: true
                            },
                            select: {
                                id: true,
                                currency: true,
                                country: true,
                                isPrimary: true,
                                bankName: true,
                                accountType: true,
                                accountNumber: true,
                                isVerified: true,
                                createdAt: true
                            }
                        }
                    },
                    take: remainingLimit,
                    orderBy
                });
                return [...usersWithCurrency, ...otherUsers];
            }
            return usersWithCurrency;
        }
        // Standard search without currency filtering
        return this.prisma.user.findMany({
            where: baseWhere,
            include: {
                bankAccounts: {
                    where: {
                        isActive: true,
                        isVerified: true
                    },
                    select: {
                        id: true,
                        currency: true,
                        country: true,
                        isPrimary: true,
                        bankName: true,
                        accountType: true,
                        accountNumber: true,
                        verifiedAt: true,
                        createdAt: true
                    }
                }
            },
            take: limit,
            orderBy
        });
    }
    // Bank account management
    async createBankAccount(data) {
        console.log('Creating bank account with data:', {
            userId: data.userId,
            currency: data.currency,
            isPrimary: data.isPrimary,
            bankName: data.bankName
        });
        // If this is set as primary, unset other primary accounts for this currency
        if (data.isPrimary) {
            console.log(`Unsetting primary accounts for user ${data.userId}, currency ${data.currency}`);
            const result = await this.prisma.bankAccount.updateMany({
                where: {
                    userId: data.userId,
                    currency: data.currency,
                    isPrimary: true
                },
                data: { isPrimary: false }
            });
            console.log(`Unset ${result.count} primary accounts`);
        }
        return this.prisma.bankAccount.create({
            data: {
                userId: data.userId,
                accountName: data.accountName,
                currency: data.currency,
                country: data.country,
                bankName: data.bankName,
                accountHolderName: data.accountHolderName,
                accountType: data.accountType,
                isPrimary: data.isPrimary ?? false,
                iban: data.iban,
                bic: data.bic,
                routingNumber: data.routingNumber,
                accountNumber: data.accountNumber,
                rut: data.rut,
                bankCode: data.bankCode,
                chileanAccountNumber: data.chileanAccountNumber,
                clabe: data.clabe,
                sortCode: data.sortCode,
                ukAccountNumber: data.ukAccountNumber,
            },
        });
    }
    async getUserBankAccounts(userId) {
        return this.prisma.bankAccount.findMany({
            where: {
                userId,
                isActive: true
            },
            orderBy: [
                { isPrimary: 'desc' },
                { currency: 'asc' },
                { createdAt: 'desc' }
            ]
        });
    }
    async getBankAccountById(id) {
        return this.prisma.bankAccount.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
    }
    async updateBankAccount(id, data) {
        const account = await this.prisma.bankAccount.findUnique({
            where: { id }
        });
        if (!account) {
            throw new Error('Bank account not found');
        }
        // If setting as primary, unset other primary accounts for this currency
        if (data.isPrimary) {
            await this.prisma.bankAccount.updateMany({
                where: {
                    userId: account.userId,
                    currency: account.currency,
                    isPrimary: true,
                    id: { not: id }
                },
                data: { isPrimary: false }
            });
        }
        return this.prisma.bankAccount.update({
            where: { id },
            data: {
                ...data,
                verificationData: data.verificationData ? JSON.stringify(data.verificationData) : undefined
            },
        });
    }
    async deleteBankAccount(id) {
        return this.prisma.bankAccount.update({
            where: { id },
            data: { isActive: false },
        });
    }
    async getUserSupportedCurrencies(userId) {
        const accounts = await this.prisma.bankAccount.findMany({
            where: {
                userId,
                isActive: true,
                isVerified: true
            },
            select: { currency: true },
            distinct: ['currency']
        });
        return accounts.map(account => account.currency);
    }
    // Saved recipients management
    async createSavedRecipient(data) {
        // If this is set as default, unset other default recipients
        if (data.isDefault) {
            await this.prisma.savedRecipient.updateMany({
                where: {
                    userId: data.userId,
                    isDefault: true
                },
                data: { isDefault: false }
            });
        }
        return this.prisma.savedRecipient.create({
            data: {
                userId: data.userId,
                name: data.name,
                email: data.email,
                phone: data.phone,
                currency: data.currency,
                country: data.country,
                bankName: data.bankName,
                accountHolderName: data.accountHolderName,
                accountType: data.accountType,
                isDefault: data.isDefault ?? false,
                iban: data.iban,
                bic: data.bic,
                routingNumber: data.routingNumber,
                accountNumber: data.accountNumber,
                rut: data.rut,
                bankCode: data.bankCode,
                chileanAccountNumber: data.chileanAccountNumber,
                clabe: data.clabe,
                sortCode: data.sortCode,
                ukAccountNumber: data.ukAccountNumber,
            },
        });
    }
    async getUserSavedRecipients(userId) {
        return this.prisma.savedRecipient.findMany({
            where: { userId },
            orderBy: [
                { isDefault: 'desc' },
                { lastUsedAt: 'desc' },
                { transferCount: 'desc' },
                { createdAt: 'desc' }
            ]
        });
    }
    async updateSavedRecipient(id, data) {
        const recipient = await this.prisma.savedRecipient.findUnique({
            where: { id }
        });
        if (!recipient) {
            throw new Error('Saved recipient not found');
        }
        // If setting as default, unset other default recipients
        if (data.isDefault) {
            await this.prisma.savedRecipient.updateMany({
                where: {
                    userId: recipient.userId,
                    isDefault: true,
                    id: { not: id }
                },
                data: { isDefault: false }
            });
        }
        return this.prisma.savedRecipient.update({
            where: { id },
            data,
        });
    }
    async deleteSavedRecipient(id) {
        return this.prisma.savedRecipient.delete({
            where: { id },
        });
    }
    async updateRecipientUsage(id) {
        return this.prisma.savedRecipient.update({
            where: { id },
            data: {
                lastUsedAt: new Date(),
                transferCount: { increment: 1 }
            },
        });
    }
    // Transaction management (enhanced)
    async createTransaction(data) {
        return this.prisma.transaction.create({
            data: {
                userId: data.userId,
                recipientUserId: data.recipientUserId,
                amount: data.amount,
                sourceCurrency: data.sourceCurrency,
                destCurrency: data.destCurrency,
                exchangeRate: data.exchangeRate,
                recipientAmount: data.recipientAmount,
                recipientName: data.recipientName,
                recipientEmail: data.recipientEmail,
                recipientPhone: data.recipientPhone,
                payoutMethod: data.payoutMethod,
                payoutDetails: data.payoutDetails,
                transferMethod: data.transferMethod || 'circle',
                mantleWalletId: data.mantleWalletId,
                mantleTxHash: data.mantleTxHash,
                gasCostUsd: data.gasCostUsd,
                networkFeeUsd: data.networkFeeUsd,
            },
        });
    }
    async getTransactionById(id) {
        return this.prisma.transaction.findUnique({
            where: { id },
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                },
                recipient: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
    }
    async updateTransactionStatus(id, status, details) {
        return this.prisma.transaction.update({
            where: { id },
            data: {
                status,
                stripePaymentIntentId: details.stripePaymentIntentId,
                blockchainTxHash: details.blockchainTxHash,
                circlePaymentId: details.circlePaymentId,
                circleTransferId: details.circleTransferId,
                circlePayoutId: details.circlePayoutId,
            },
        });
    }
    async getUserTransactions(userId) {
        return this.prisma.transaction.findMany({
            where: {
                OR: [
                    { userId },
                    { recipientUserId: userId }
                ]
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                },
                recipient: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                },
                mantleTransfer: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    // Mantle Transfer management
    async createMantleTransfer(data) {
        return this.prisma.mantleTransfer.create({
            data: {
                transferId: data.transferId,
                senderWalletAddress: data.senderWalletAddress,
                recipientWalletAddress: data.recipientWalletAddress,
                tokenAddress: data.tokenAddress,
                amountWei: data.amountWei,
                gasPriceGwei: data.gasPriceGwei,
                gasUsed: data.gasUsed,
                blockNumber: data.blockNumber,
                transactionHash: data.transactionHash,
                status: data.status || 'PENDING',
            },
        });
    }
    async getMantleTransferByTransferId(transferId) {
        return this.prisma.mantleTransfer.findUnique({
            where: { transferId },
            include: {
                transaction: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true
                            }
                        },
                        recipient: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            }
        });
    }
    async getMantleTransferByTxHash(transactionHash) {
        return this.prisma.mantleTransfer.findUnique({
            where: { transactionHash },
            include: {
                transaction: true
            }
        });
    }
    async updateMantleTransfer(transferId, data) {
        return this.prisma.mantleTransfer.update({
            where: { transferId },
            data: {
                gasPriceGwei: data.gasPriceGwei,
                gasUsed: data.gasUsed,
                blockNumber: data.blockNumber,
                transactionHash: data.transactionHash,
                status: data.status,
                updatedAt: new Date(),
            },
        });
    }
    async getMantleTransfersByStatus(status) {
        return this.prisma.mantleTransfer.findMany({
            where: { status },
            include: {
                transaction: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true
                            }
                        },
                        recipient: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
    }
    async getMantleTransfersByWallet(walletAddress) {
        return this.prisma.mantleTransfer.findMany({
            where: {
                OR: [
                    { senderWalletAddress: walletAddress },
                    { recipientWalletAddress: walletAddress }
                ]
            },
            include: {
                transaction: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async updateTransactionWithMantleDetails(id, status, details) {
        return this.prisma.transaction.update({
            where: { id },
            data: {
                status,
                stripePaymentIntentId: details.stripePaymentIntentId,
                blockchainTxHash: details.blockchainTxHash,
                circlePaymentId: details.circlePaymentId,
                circleTransferId: details.circleTransferId,
                circlePayoutId: details.circlePayoutId,
                mantleWalletId: details.mantleWalletId,
                mantleTxHash: details.mantleTxHash,
                gasCostUsd: details.gasCostUsd,
                networkFeeUsd: details.networkFeeUsd,
            },
        });
    }
    // Cookathon metrics methods
    async getTransfersByDateRange(startDate, endDate) {
        return this.prisma.transaction.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                mantleTransfer: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async getTotalUserCount() {
        return this.prisma.user.count();
    }
    async getActiveUserCount() {
        // Users who have made a transaction in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return this.prisma.user.count({
            where: {
                OR: [
                    {
                        sentTransactions: {
                            some: {
                                createdAt: {
                                    gte: thirtyDaysAgo
                                }
                            }
                        }
                    },
                    {
                        receivedTransactions: {
                            some: {
                                createdAt: {
                                    gte: thirtyDaysAgo
                                }
                            }
                        }
                    }
                ]
            }
        });
    }
    async getMantleTransferStats(startDate, endDate) {
        const mantleTransfers = await this.prisma.mantleTransfer.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                transaction: true
            }
        });
        const totalTransfers = await this.prisma.transaction.count({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });
        return {
            mantleTransfers,
            totalTransfers,
            mantleAdoption: totalTransfers > 0 ? (mantleTransfers.length / totalTransfers) * 100 : 0
        };
    }
    async getRecentMantleTransactions(limit = 10) {
        return this.prisma.mantleTransfer.findMany({
            take: limit,
            include: {
                transaction: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true
                            }
                        },
                        recipient: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async close() {
        await this.prisma.$disconnect();
    }
}
exports.DatabaseService = DatabaseService;
