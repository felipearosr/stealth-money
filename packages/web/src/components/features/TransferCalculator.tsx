"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { z } from "zod";
import { Calculator, RefreshCw, AlertCircle, DollarSign, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Validation schema for transfer calculation
const transferCalculationSchema = z.object({
  sendAmount: z.number().min(0.01, 'Amount must be at least $0.01').max(50000, 'Amount cannot exceed $50,000'),
});

interface TransferCalculation {
  sendAmount: number;
  receiveAmount: number;
  exchangeRate: number;
  fees: number;
  rateValidUntil: string;
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
    receiveAmountEUR: number;
  };
  estimatedArrival: string;
  rateId: string;
}

interface TransferCalculatorProps {
  onContinue?: (data: {
    sendAmount: number;
    receiveAmount: number;
    exchangeRate: number;
    fees: number;
    rateId: string;
  }) => void;
}

export function TransferCalculator({ onContinue }: TransferCalculatorProps) {
  // Component state
  const [sendAmount, setSendAmount] = useState<string>('100');
  const [calculation, setCalculation] = useState<TransferCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Debounced send amount to avoid excessive API calls
  const [debouncedSendAmount] = useDebounce(sendAmount, 500);

  // Format currency display
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format number input
  const formatNumberInput = (value: string) => {
    // Remove any non-numeric characters except decimal point
    const cleaned = value.replace(/[^\d.]/g, '');
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts[1];
    }
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].substring(0, 2);
    }
    return cleaned;
  };

  // Calculate transfer using API
  const calculateTransfer = async (amount: string) => {
    if (!amount || amount === '0' || amount === '') {
      setCalculation(null);
      return;
    }

    const numericAmount = parseFloat(amount);
    
    // Validate amount
    try {
      transferCalculationSchema.parse({ sendAmount: numericAmount });
      setValidationError(null);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setValidationError(err.errors?.[0]?.message || 'Invalid amount');
        setCalculation(null);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_URL}/api/transfers/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sendAmount: numericAmount,
          sendCurrency: 'USD',
          receiveCurrency: 'EUR'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to calculate transfer');
      }

      const data: TransferCalculation = await response.json();
      setCalculation(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Transfer calculation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate transfer');
      setCalculation(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to calculate transfer when amount changes
  useEffect(() => {
    // Only calculate if the amount has been changed from the initial value
    if (debouncedSendAmount && debouncedSendAmount !== '100') {
      calculateTransfer(debouncedSendAmount);
    }
  }, [debouncedSendAmount]);

  // Handle amount input change
  const handleAmountChange = (value: string) => {
    const formatted = formatNumberInput(value);
    setSendAmount(formatted);
  };

  // Handle continue button click
  const handleContinue = () => {
    if (calculation && onContinue) {
      onContinue({
        sendAmount: calculation.sendAmount,
        receiveAmount: calculation.receiveAmount,
        exchangeRate: calculation.exchangeRate,
        fees: calculation.fees,
        rateId: calculation.rateId,
      });
    }
  };

  // Check if rate is about to expire (within 2 minutes)
  const isRateExpiringSoon = calculation && calculation.rateValidUntil ? 
    new Date(calculation.rateValidUntil).getTime() - Date.now() < 2 * 60 * 1000 : false;

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Calculator className="h-5 w-5" />
          Transfer Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Calculate how much your recipient will receive
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Send Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="send-amount" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            You send (USD)
          </Label>
          <div className="relative">
            <Input
              id="send-amount"
              type="text"
              placeholder="100.00"
              value={sendAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className={`text-lg font-medium ${validationError ? 'border-red-500' : ''}`}
            />
            <div className="absolute inset-y-0 right-3 flex items-center">
              <span className="text-sm text-muted-foreground font-medium">USD</span>
            </div>
          </div>
          {validationError && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {validationError}
            </p>
          )}
        </div>

        {/* Calculation Results */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Calculating...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Calculation Error</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        )}

        {calculation && !isLoading && !error && (
          <div className="space-y-4">
            {/* Recipient Amount */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Recipient gets</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-700">
                    {formatCurrency(calculation.receiveAmount, 'EUR')}
                  </div>
                </div>
              </div>
            </div>

            {/* Exchange Rate Info */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Exchange rate</span>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    1 USD = {calculation.exchangeRate.toFixed(4)} EUR
                  </div>
                  {isRateExpiringSoon && (
                    <div className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Rate expires soon
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total fees</span>
                <span className="text-sm font-medium">
                  {formatCurrency(calculation.fees, 'USD')}
                </span>
              </div>

              {/* Fee Breakdown */}
              <div className="space-y-1 pl-4 border-l-2 border-gray-100">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Card processing</span>
                  <span>{formatCurrency(calculation.breakdown.fees.cardProcessing, 'USD')}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Transfer fee</span>
                  <span>{formatCurrency(calculation.breakdown.fees.transfer, 'USD')}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Payout fee</span>
                  <span>{formatCurrency(calculation.breakdown.fees.payout, 'USD')}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Total to pay</span>
                <span className="text-lg font-bold">
                  {formatCurrency(calculation.sendAmount + calculation.fees, 'USD')}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Estimated arrival</span>
                <span>{new Date(calculation.estimatedArrival).toLocaleString()}</span>
              </div>
            </div>

            {/* Last Updated */}
            {lastUpdated && (
              <div className="text-xs text-muted-foreground text-center">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}

            {/* Continue Button */}
            {onContinue && (
              <Button 
                onClick={handleContinue}
                className="w-full"
                size="lg"
              >
                Continue with this rate
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}