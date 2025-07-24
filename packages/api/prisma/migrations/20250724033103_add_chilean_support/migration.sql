/*
  Warnings:

  - A unique constraint covering the columns `[processingReference]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[circlePaymentId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[circleTransferId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[circlePayoutId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "bankTransactionId" TEXT,
ADD COLUMN     "calculationId" TEXT,
ADD COLUMN     "circlePaymentId" TEXT,
ADD COLUMN     "circlePayoutId" TEXT,
ADD COLUMN     "circleTransferId" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "fees" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paymentMethodId" TEXT,
ADD COLUMN     "processingReference" TEXT,
ADD COLUMN     "recipientBankAccount" TEXT,
ADD COLUMN     "recipientUserId" TEXT,
ADD COLUMN     "senderBankAccount" TEXT,
ADD COLUMN     "statusHistory" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "username" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isDiscoverable" BOOLEAN NOT NULL DEFAULT true,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "hasVerifiedAccount" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT DEFAULT 'CL',
    "rut" TEXT,
    "preferredCurrency" TEXT DEFAULT 'CLP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "iban" TEXT,
    "bic" TEXT,
    "routingNumber" TEXT,
    "accountNumber" TEXT,
    "rut" TEXT,
    "bankCode" TEXT,
    "chileanAccountNumber" TEXT,
    "clabe" TEXT,
    "sortCode" TEXT,
    "ukAccountNumber" TEXT,
    "bankName" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "accountType" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationMethod" TEXT,
    "verificationData" JSONB,
    "verificationStartedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verificationFailures" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedRecipient" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "currency" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "iban" TEXT,
    "bic" TEXT,
    "routingNumber" TEXT,
    "accountNumber" TEXT,
    "rut" TEXT,
    "bankCode" TEXT,
    "chileanAccountNumber" TEXT,
    "clabe" TEXT,
    "sortCode" TEXT,
    "ukAccountNumber" TEXT,
    "bankName" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "accountType" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "transferCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_rut_key" ON "User"("rut");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_country_idx" ON "User"("country");

-- CreateIndex
CREATE INDEX "User_rut_idx" ON "User"("rut");

-- CreateIndex
CREATE INDEX "BankAccount_userId_idx" ON "BankAccount"("userId");

-- CreateIndex
CREATE INDEX "BankAccount_currency_idx" ON "BankAccount"("currency");

-- CreateIndex
CREATE INDEX "BankAccount_userId_currency_isPrimary_idx" ON "BankAccount"("userId", "currency", "isPrimary");

-- CreateIndex
CREATE INDEX "SavedRecipient_userId_idx" ON "SavedRecipient"("userId");

-- CreateIndex
CREATE INDEX "SavedRecipient_email_idx" ON "SavedRecipient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_processingReference_key" ON "Transaction"("processingReference");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_circlePaymentId_key" ON "Transaction"("circlePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_circleTransferId_key" ON "Transaction"("circleTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_circlePayoutId_key" ON "Transaction"("circlePayoutId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_recipientUserId_idx" ON "Transaction"("recipientUserId");

-- CreateIndex
CREATE INDEX "Transaction_recipientEmail_idx" ON "Transaction"("recipientEmail");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_sourceCurrency_destCurrency_idx" ON "Transaction"("sourceCurrency", "destCurrency");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedRecipient" ADD CONSTRAINT "SavedRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
