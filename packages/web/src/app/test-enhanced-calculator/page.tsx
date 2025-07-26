"use client";

import { TransferCalculator } from "@/components/features/TransferCalculator";

export default function TestEnhancedCalculatorPage() {
  const handleContinue = (data: {
    sendAmount: number;
    receiveAmount: number;
    sendCurrency: string;
    receiveCurrency: string;
    exchangeRate: number;
    fees: number;
    rateId: string;
    rateValidUntil: string;
    calculatorMode: 'send' | 'receive';
    breakdown: {
      sendAmountUSD: number;
      fees: {
        cardProcessing: number;
        transfer: number;
        payout: number;
        total: number;
      };
      netAmountUSD: number;
      exchangeRate: number;
      receiveAmount: number;
    };
    estimatedArrival: string;
    selectedMethod?: 'circle' | 'mantle';
  }) => {
    console.log('Transfer data:', data);
    alert(`Selected method: ${data.selectedMethod}, Amount: ${data.sendAmount} ${data.sendCurrency}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          Enhanced Transfer Calculator Test
        </h1>
        
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Enhanced Calculator with Mantle Support */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Enhanced Calculator (with Mantle)</h2>
            <TransferCalculator
              onContinue={handleContinue}
              showTitle={true}
              showTransferMethods={true}
              mantleEnabled={true}
              defaultMethod="circle"
            />
          </div>

          {/* Legacy Calculator */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Legacy Calculator (Circle only)</h2>
            <TransferCalculator
              onContinue={handleContinue}
              showTitle={true}
              showTransferMethods={false}
              mantleEnabled={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}