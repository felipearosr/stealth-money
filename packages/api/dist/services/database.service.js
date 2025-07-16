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
exports.DatabaseService = void 0;
// src/services/database.service.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class DatabaseService {
    createTransaction(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.transaction.create({ data });
        });
    }
    updateTransactionStatus(id, status, details) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.transaction.update({
                where: { id },
                data: {
                    status,
                    stripePaymentIntentId: details.paymentId,
                    blockchainTxHash: details.txHash,
                },
            });
        });
    }
    getTransaction(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.transaction.findUnique({
                where: { id },
            });
        });
    }
    getAllTransactions() {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.transaction.findMany({
                orderBy: { createdAt: 'desc' },
            });
        });
    }
}
exports.DatabaseService = DatabaseService;
