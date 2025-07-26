"use client";

import { useState } from "react";
import { TransferCalculator } from "./TransferCalculator";

export function TransferCalculatorDemo() {
  const [isNavigating, setIsNavigating] = useState(false);

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
    console.log('Continue clicked with data:', data);
    setIsNavigating(true);
    
    // Simulate navigation delay
    setTimeout(() => {
      setIsNavigating(false);
      alert(`Transfer calculation complete!\nSend: $${data.sendAmount}\nReceive: ${data.receiveAmount}\nMode: ${data.calculatorMode}`);
    }, 2000);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8 text-center">Transfer Calculator Demo</h1>
      <TransferCalculator 
        onContinue={handleContinue}
        isNavigating={isNavigating}
      />
    </div>
  );
}