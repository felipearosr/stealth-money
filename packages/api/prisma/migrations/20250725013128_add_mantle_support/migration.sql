-- Add Mantle support to existing Transaction table
ALTER TABLE "Transaction" ADD COLUMN "transferMethod" TEXT NOT NULL DEFAULT 'circle';
ALTER TABLE "Transaction" ADD COLUMN "mantleWalletId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "mantleTxHash" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "gasCostUsd" DOUBLE PRECISION;
ALTER TABLE "Transaction" ADD COLUMN "networkFeeUsd" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "MantleTransfer" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "senderWalletAddress" TEXT NOT NULL,
    "recipientWalletAddress" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "amountWei" TEXT NOT NULL,
    "gasPriceGwei" TEXT,
    "gasUsed" TEXT,
    "blockNumber" BIGINT,
    "transactionHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MantleTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MantleTransfer_transferId_key" ON "MantleTransfer"("transferId");

-- CreateIndex
CREATE UNIQUE INDEX "MantleTransfer_transactionHash_key" ON "MantleTransfer"("transactionHash");

-- CreateIndex
CREATE INDEX "MantleTransfer_transferId_idx" ON "MantleTransfer"("transferId");

-- CreateIndex
CREATE INDEX "MantleTransfer_senderWalletAddress_idx" ON "MantleTransfer"("senderWalletAddress");

-- CreateIndex
CREATE INDEX "MantleTransfer_recipientWalletAddress_idx" ON "MantleTransfer"("recipientWalletAddress");

-- CreateIndex
CREATE INDEX "MantleTransfer_transactionHash_idx" ON "MantleTransfer"("transactionHash");

-- CreateIndex
CREATE INDEX "MantleTransfer_status_idx" ON "MantleTransfer"("status");

-- CreateIndex
CREATE INDEX "MantleTransfer_createdAt_idx" ON "MantleTransfer"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_transferMethod_idx" ON "Transaction"("transferMethod");

-- CreateIndex
CREATE INDEX "Transaction_mantleWalletId_idx" ON "Transaction"("mantleWalletId");

-- AddForeignKey
ALTER TABLE "MantleTransfer" ADD CONSTRAINT "MantleTransfer_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;