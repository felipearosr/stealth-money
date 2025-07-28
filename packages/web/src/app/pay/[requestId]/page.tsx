"use client";

import { UserOnboarding } from "@/components/features/UserOnboarding";

// Mock payment request for demonstration
const mockPaymentRequest = {
  id: 'req-demo-001',
  amount: 125.00,
  currency: 'USD',
  description: 'Payment for services rendered',
  requesterId: 'user-requester-123',
};

export default function PaymentPage({ params }: { params: { requestId: string } }) {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Complete Your Payment
          </h1>
          <p className="text-gray-600">
            You've been requested to make a payment. Complete the steps below to proceed.
          </p>
        </div>
        
        <UserOnboarding 
          paymentRequest={mockPaymentRequest}
          onOnboardingComplete={(data) => {
            console.log('Onboarding completed:', data);
            alert('Payment completed successfully! (This is a demo)');
          }}
        />
      </div>
    </div>
  );
}