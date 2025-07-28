-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "qrCode" TEXT,
    "shareableLink" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_shareableLink_key" ON "PaymentRequest"("shareableLink");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_paymentId_key" ON "PaymentRequest"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentRequest_requesterId_idx" ON "PaymentRequest"("requesterId");

-- CreateIndex
CREATE INDEX "PaymentRequest_status_idx" ON "PaymentRequest"("status");

-- CreateIndex
CREATE INDEX "PaymentRequest_expiresAt_idx" ON "PaymentRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "PaymentRequest_requesterId_status_idx" ON "PaymentRequest"("requesterId", "status");

-- CreateIndex
CREATE INDEX "PaymentRequest_shareableLink_idx" ON "PaymentRequest"("shareableLink");

-- CreateIndex
CREATE INDEX "PaymentRequest_createdAt_idx" ON "PaymentRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
