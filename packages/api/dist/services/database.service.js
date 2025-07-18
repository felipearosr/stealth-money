"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
// src/services/database.service.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class DatabaseService {
    async createTransaction(data) {
        return prisma.transaction.create({ data });
    }
    async updateTransactionStatus(id, status, details) {
        return prisma.transaction.update({
            where: { id },
            data: {
                status,
                stripePaymentIntentId: details.paymentId,
                blockchainTxHash: details.txHash,
            },
        });
    }
    async getTransaction(id) {
        return prisma.transaction.findUnique({
            where: { id },
        });
    }
    async getAllTransactions() {
        return prisma.transaction.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
}
exports.DatabaseService = DatabaseService;
