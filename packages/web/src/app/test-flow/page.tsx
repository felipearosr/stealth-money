"use client";

import { TransferFlowContainer } from "@/components/features/TransferFlowContainer";

export default function TestFlowPage() {
  const handleComplete = (transferId: string) => {
    console.log('Transfer completed with ID:', transferId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Transfer Flow Test
          </h1>
          <p className="text-gray-600">
            Testing the multi-step transfer flow container
          </p>
        </div>
        
        <TransferFlowContainer
          initialStep="calculator"
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}