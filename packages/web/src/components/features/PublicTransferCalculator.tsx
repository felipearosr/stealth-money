"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TransferCalculator } from "./TransferCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

export interface PublicCalculatorData {
  sendAmount: number;
  receiveAmount: number;
  sendCurrency: string;
  receiveCurrency: string;
  exchangeRate: number;
  fees: number;
  rateId: string;
  rateValidUntil: string;
  calculatorMode: 'send' | 'receive';
  breakdown: any;
  estimatedArrival: string;
}

interface PublicTransferCalculatorProps {
  className?: string;
}

export function PublicTransferCalculator({ className = "" }: PublicTransferCalculatorProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCalculatorContinue = useCallback((data: {
    sendAmount: number;
    receiveAmount: number;
    sendCurrency: string;
    receiveCurrency: string;
    exchangeRate: number;
    fees: number;
    rateId: string;
    rateValidUntil: string;
    calculatorMode: 'send' | 'receive';
    breakdown: any;
    estimatedArrival: string;
  }) => {
    setIsLoading(true);
    
    // Store the calculation data in sessionStorage so we can use it on the next page
    const calculatorData: PublicCalculatorData = {
      sendAmount: data.sendAmount,
      receiveAmount: data.receiveAmount,
      sendCurrency: data.sendCurrency,
      receiveCurrency: data.receiveCurrency,
      exchangeRate: data.exchangeRate,
      fees: data.fees,
      rateId: data.rateId,
      rateValidUntil: data.rateValidUntil,
      calculatorMode: data.calculatorMode,
      breakdown: data.breakdown,
      estimatedArrival: data.estimatedArrival,
    };
    
    sessionStorage.setItem('transferCalculation', JSON.stringify(calculatorData));
    
    // Navigate to the dedicated transfer process page
    router.push('/transfer/process');
  }, [router]);

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      <Card className="shadow-2xl border-0">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-center justify-center">
            <Calculator className="h-5 w-5 text-blue-600" />
            <span>Calculate Your Transfer</span>
          </CardTitle>
          <p className="text-sm text-gray-600 text-center">
            Get real-time exchange rates and see exactly what you'll pay
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <TransferCalculator
            onContinue={handleCalculatorContinue}
            isNavigating={isLoading}
            showTitle={false} // Don't show title since we have it in CardHeader
            publicMode={true} // Indicate this is for public use
          />
        </CardContent>
      </Card>
    </div>
  );
}