// src/services/database.service.ts
import { PrismaClient, User, BankAccount, SavedRecipient, Transaction } from '@prisma/client';

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // User management
  async createUser(data: {
    id: string; // Clerk user ID
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    isDiscoverable?: boolean;
  }): Promise<User> {
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

  async getUserById(id: string): Promise<User | null> {
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

  async getUserByEmail(email: string): Promise<User | null> {
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

  async updateUser(id: string, data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    isVerified?: boolean;
    isDiscoverable?: boolean;
  }): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async searchUsers(query: string, limit: number = 10): Promise<any[]> {
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
  async intelligentUserSearch(query: string, limit: number = 10, currency?: string, country?: string): Promise<any[]> {
    const trimmedQuery = query.trim();
    
    // Detect query type
    const isEmail = trimmedQuery.includes('@');
    const isPhone = /^[\+]?[\d\s\-\(\)]+$/.test(trimmedQuery);
    const isUsername = !isEmail && !isPhone;

    // Build search conditions based on query type
    let searchConditions: any[] = [];

    if (isEmail) {
      // Prioritize exact email match, then partial
      searchConditions = [
        { email: { equals: trimmedQuery, mode: 'insensitive' } },
        { email: { contains: trimmedQuery, mode: 'insensitive' } }
      ];
    } else if (isPhone) {
      // Search phone number (clean formatting)
      const cleanPhone = trimmedQuery.replace(/[\s\-\(\)]/g, '');
      searchConditions = [
        { phone: { contains: cleanPhone } },
        { phone: { contains: trimmedQuery } }
      ];
    } else {
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
    let orderBy: any[] = [
      { isVerified: 'desc' },  // Verified users first
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
  async createBankAccount(data: {
    userId: string;
    accountName: string;
    currency: string;
    country: string;
    bankName: string;
    accountHolderName: string;
    accountType?: string;
    isPrimary?: boolean;
    // Currency-specific fields
    iban?: string;
    bic?: string;
    routingNumber?: string;
    accountNumber?: string;
    rut?: string;
    bankCode?: string;
    chileanAccountNumber?: string;
    clabe?: string;
    sortCode?: string;
    ukAccountNumber?: string;
  }): Promise<BankAccount> {
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

  async getUserBankAccounts(userId: string): Promise<BankAccount[]> {
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

  async getBankAccountById(id: string): Promise<BankAccount | null> {
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

  async updateBankAccount(id: string, data: {
    accountName?: string;
    bankName?: string;
    accountHolderName?: string;
    accountType?: string;
    isPrimary?: boolean;
    isVerified?: boolean;
    verificationMethod?: string;
    verificationData?: any;
    // Currency-specific fields
    iban?: string;
    bic?: string;
    routingNumber?: string;
    accountNumber?: string;
    rut?: string;
    bankCode?: string;
    chileanAccountNumber?: string;
    clabe?: string;
    sortCode?: string;
    ukAccountNumber?: string;
  }): Promise<BankAccount> {
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

  async deleteBankAccount(id: string): Promise<BankAccount> {
    return this.prisma.bankAccount.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getUserSupportedCurrencies(userId: string): Promise<string[]> {
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
  async createSavedRecipient(data: {
    userId: string;
    name: string;
    email: string;
    phone?: string;
    currency: string;
    country: string;
    bankName: string;
    accountHolderName: string;
    accountType?: string;
    isDefault?: boolean;
    // Currency-specific fields
    iban?: string;
    bic?: string;
    routingNumber?: string;
    accountNumber?: string;
    rut?: string;
    bankCode?: string;
    chileanAccountNumber?: string;
    clabe?: string;
    sortCode?: string;
    ukAccountNumber?: string;
  }): Promise<SavedRecipient> {
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

  async getUserSavedRecipients(userId: string): Promise<SavedRecipient[]> {
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

  async updateSavedRecipient(id: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    bankName?: string;
    accountHolderName?: string;
    accountType?: string;
    isDefault?: boolean;
    // Currency-specific fields
    iban?: string;
    bic?: string;
    routingNumber?: string;
    accountNumber?: string;
    rut?: string;
    bankCode?: string;
    clabe?: string;
    sortCode?: string;
    ukAccountNumber?: string;
  }): Promise<SavedRecipient> {
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

  async deleteSavedRecipient(id: string): Promise<SavedRecipient> {
    return this.prisma.savedRecipient.delete({
      where: { id },
    });
  }

  async updateRecipientUsage(id: string): Promise<SavedRecipient> {
    return this.prisma.savedRecipient.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
        transferCount: { increment: 1 }
      },
    });
  }

  // Transaction management (enhanced)
  async createTransaction(data: {
    userId?: string;
    recipientUserId?: string;
    amount: number;
    sourceCurrency: string;
    destCurrency: string;
    exchangeRate: number;
    recipientAmount: number;
    recipientName?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    payoutMethod?: string;
    payoutDetails?: any;
  }): Promise<Transaction> {
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
      },
    });
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
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

  async updateTransactionStatus(
    id: string,
    status: string,
    details: {
      stripePaymentIntentId?: string;
      blockchainTxHash?: string;
      circlePaymentId?: string;
      circleTransferId?: string;
      circlePayoutId?: string;
    }
  ): Promise<Transaction> {
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

  async getUserTransactions(userId: string): Promise<Transaction[]> {
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
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}