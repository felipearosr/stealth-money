// src/services/database.service.ts
import { PrismaClient, Transaction } from '@prisma/client';

const prisma = new PrismaClient();

export class DatabaseService {
  async createTransaction(data: {
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
    return prisma.transaction.create({ data });
  }

  async updateTransactionStatus(
    id: string, 
    status: string, 
    details: { paymentId?: string; txHash?: string }
  ): Promise<Transaction> {
    return prisma.transaction.update({
      where: { id },
      data: {
        status,
        stripePaymentIntentId: details.paymentId,
        blockchainTxHash: details.txHash,
      },
    });
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    return prisma.transaction.findUnique({
      where: { id },
    });
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}