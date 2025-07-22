"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { z } from "zod";
import { Calculator, RefreshCw, AlertCircle, DollarSign, Euro, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  SUPPORTED_CURRENCIES, 
  SEND_CURRENCIES, 
  RECEIVE_CURRENCIES,
  formatCurrency,
  formatNumberInput,
  validateAmount,
  getCurrencyDisplayName,
  type SendCurrency,
  type ReceiveCurrency
} from "@/lib/currencies";

// Dynamic validation schema for transfer calculation
const createTransferCalculationSchema = (sendCurrency: string) => {
  const currency = SUPPORTED_CURRENCIES[sendCurrency];
  return z.object({
    sendAmount: z.number()
      .min(currency.minAmount, `Amount must be at least ${formatCurrency(currency.minAmount, sendCurrency)}`)
      .max(currency.maxAmount, `Amount cannot exceed ${formatCurrency(currency.maxAmount, sendCurrency)}`),
  });
};

interface TransferCalculation {
  sendAmount: number;
  receiveAmount: number;
  sendCurrency: string;
  receiveCurrency: string;
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
    receiveAmount: number;
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
  const [sendAmount, setSendAmount] = useState<string>('');
  const [sendCurrency, setSendCurrency] = useState<SendCurrency>('USD');
  const [receiveCurrency, setReceiveCurrency] = useState<ReceiveCurrency>('EUR');
  const [calculation, setCalculation] = useState<TransferCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Debounced values to avoid excessive API calls
  const [debouncedSendAmount] = useDebounce(sendAmount, 500);
  const [debouncedSendCurrency] = useDebounce(sendCurrency, 300);
  const [debouncedReceiveCurrency] = useDebounce(receiveCurrency, 300);

  // Calculate transfer using API
  const calculateTransfer = async (amount: string, fromCurrency: SendCurrency, toCurrency: ReceiveCurrency) => {
    if (!amount || amount === '0' || amount === '') {
      setCalculation(null);
      return;
    }

    const numericAmount = parseFloat(amount);
    
    // Validate amount using dynamic schema
    try {
      const schema = createTransferCalculationSchema(fromCurrency);
      schema.parse({ sendAmount: numericAmount });
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
          sendCurrency: fromCurrency,
          receiveCurrency: toCurrency
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

  // Effect to calculate transfer when amount or currencies change
  useEffect(() => {
    // Calculate when amount or currencies change
    if (debouncedSendAmount && debouncedSendAmount !== '0' && debouncedSendAmount !== '') {
      calculateTransfer(debouncedSendAmount, debouncedSendCurrency, debouncedReceiveCurrency);
    }
  }, [debouncedSendAmount, debouncedSendCurrency, debouncedReceiveCurrency]);

  // Handle amount input change
  const handleAmountChange = (value: string) => {
    const formatted = formatNumberInput(value, sendCurrency);
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
        {/* Send Amount and Currency */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              You send
            </Label>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                id="send-amount"
                type="text"
                placeholder={SUPPORTED_CURRENCIES[sendCurrency].decimalPlaces === 0 ? "1000" : "100.00"}
                value={sendAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={`text-lg font-medium ${validationError ? 'border-red-500' : ''}`}
              />
            </div>
            <div className="w-32">
              <Select value={sendCurrency} onValueChange={(value) => setSendCurrency(value as SendCurrency)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEND_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      <div className="flex items-center gap-2">
                        <span>{SUPPORTED_CURRENCIES[currency].flag}</span>
                        <span>{currency}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {validationError && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {validationError}
            </p>
          )}
        </div>

        {/* Currency Exchange Arrow */}
        <div className="flex justify-center">
          <div className="bg-gray-100 rounded-full p-2">
            <ArrowRightLeft className="h-4 w-4 text-gray-600" />
          </div>
        </div>

        {/* Receive Currency */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Recipient gets
            </Label>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="h-10 px-3 py-2 border border-input bg-gray-50 rounded-md flex items-center text-lg font-medium text-muted-foreground">
                {calculation ? formatCurrency(calculation.receiveAmount, receiveCurrency) : '---'}
              </div>
            </div>
            <div className="w-32">
              <Select value={receiveCurrency} onValueChange={(value) => setReceiveCurrency(value as ReceiveCurrency)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECEIVE_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      <div className="flex items-center gap-2">
                        <span>{SUPPORTED_CURRENCIES[currency].flag}</span>
                        <span>{currency}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
                  <span className="text-lg">{SUPPORTED_CURRENCIES[receiveCurrency].flag}</span>
                  <span className="text-sm font-medium text-green-700">Recipient gets</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-700">
                    {formatCurrency(calculation.receiveAmount, receiveCurrency)}
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
                    1 {sendCurrency} = {calculation.exchangeRate.toFixed(SUPPORTED_CURRENCIES[receiveCurrency].decimalPlaces === 0 ? 0 : 4)} {receiveCurrency}
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
                  {formatCurrency(calculation.fees, sendCurrency)}
                </span>
              </div>

              {/* Fee Breakdown */}
              <div className="space-y-1 pl-4 border-l-2 border-gray-100">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Card processing</span>
                  <span>{formatCurrency(calculation.breakdown.fees.cardProcessing, sendCurrency)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Transfer fee</span>
                  <span>{formatCurrency(calculation.breakdown.fees.transfer, sendCurrency)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Payout fee</span>
                  <span>{formatCurrency(calculation.breakdown.fees.payout, sendCurrency)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Total to pay</span>
                <span className="text-lg font-bold">
                  {formatCurrency(calculation.sendAmount + calculation.fees, sendCurrency)}
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