"use client";

import { PaymentRequestManager } from "@/components/features/PaymentRequestManager";

// Mock data for demonstration
const mockPaymentRequests = [
  {
    id: 'req-001',
    amount: 150.00,
    currency: 'USD',
    description: 'Dinner split',
    status: 'pending' as const,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    requesterId: 'user-123',
  },
  {
    id: 'req-002',
    amount: 75.50,
    currency: 'EUR',
    description: 'Concert tickets',
    status: 'paid' as const,
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    paidAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    paymentId: 'pay-456',
    requesterId: 'user-123',
  },
  {
    id: 'req-003',
    amount: 200.00,
    currency: 'GBP',
    description: 'Monthly rent share',
    status: 'expired' as const,
    expiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
    requesterId: 'user-123',
  },
];

export default function PaymentRequestsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Request System
          </h1>
          <p className="text-gray-600">
            Create, manage, and track payment requests with QR codes and shareable links
          </p>
        </div>
        
        <PaymentRequestManager initialRequests={mockPaymentRequests} />
      </div>
    </div>
  );
}