"use client";

import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "use-debounce";
import { z } from "zod";
import { Calculator, RefreshCw, AlertCircle, DollarSign, Euro, ArrowRightLeft, Zap, Clock, Shield, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  SUPPORTED_CURRENCIES,
  SEND_CURRENCIES,
  RECEIVE_CURRENCIES,
  formatCurrency,
  formatNumberInput,
  type SendCurrency,
  type ReceiveCurrency
} from "@/lib/currencies";

// Dynamic validation schema for transfer calculation
const createTransferCalculationSchema = (currency: string, mode: CalculatorMode) => {
  const currencyConfig = SUPPORTED_CURRENCIES[currency];
  const fieldName = mode === 'send' ? 'sendAmount' : 'receiveAmount';

  return z.object({
    [fieldName]: z.number()
      .min(currencyConfig.minAmount, `Amount must be at least ${formatCurrency(currencyConfig.minAmount, currency)}`)
      .max(currencyConfig.maxAmount, `Amount cannot exceed ${formatCurrency(currencyConfig.maxAmount, currency)}`),
  });
};

interface TransferMethodOption {
  method: 'circle' | 'mantle';
  sendAmount: number;
  receiveAmount: number;
  exchangeRate: number;
  fees: {
    processing: number;
    network: number;
    exchange: number;
    total: number;
  };
  estimatedTime: string;
  benefits: string[];
  limitations: string[];
  recommended: boolean;
  availableForAmount: boolean;
  rateValidUntil?: string;
  rateId?: string;
  breakdown?: {
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
  gasEstimate?: {
    gasLimit: string;
    gasPrice: string;
    totalCost: string;
    totalCostUSD: string;
  };
  networkStatus?: {
    connected: boolean;
    blockNumber: number;
    gasPrice: string;
    latency: number;
  };
}

interface EnhancedTransferCalculation {
  sendAmount: number;
  sendCurrency: string;
  receiveCurrency: string;
  calculatorMode: string;
  transferMethods: TransferMethodOption[];
  recommendedMethod: 'circle' | 'mantle';
  recommendation: {
    method: 'circle' | 'mantle';
    reason: string;
    costSavings: number;
    timeSavings?: string;
  };
  comparison?: {
    costDifference: number;
    timeDifference: string;
    mantleSavings: {
      percentage: string;
      absolute: string;
    };
  };
  timestamp: string;
}

// Legacy interface for backward compatibility
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

type CalculatorMode = 'send' | 'receive';
type TransferMethod = 'circle' | 'mantle';

interface TransferCalculatorProps {
  onContinue?: (data: {
    sendAmount: number;
    receiveAmount: number;
    sendCurrency: string;
    receiveCurrency: string;
    exchangeRate: number;
    fees: number;
    rateId: string;
    rateValidUntil: string;
    calculatorMode: CalculatorMode;
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
    selectedMethod?: TransferMethod;
  }) => void;
  isNavigating?: boolean;
  showTitle?: boolean;
  publicMode?: boolean;
  showTransferMethods?: boolean;
  defaultMethod?: TransferMethod;
  mantleEnabled?: boolean;
}

export function TransferCalculator({
  onContinue,
  isNavigating = false,
  showTitle = true,
  showTransferMethods = true,
  defaultMethod = 'circle',
  mantleEnabled = true
}: TransferCalculatorProps) {
  // Component state
  const [calculatorMode, setCalculatorMode] = useState<CalculatorMode>('send');
  const [inputAmount, setInputAmount] = useState<string>('');
  const [sendCurrency, setSendCurrency] = useState<SendCurrency>('CLP'); // Default to CLP for Chilean users
  const [receiveCurrency, setReceiveCurrency] = useState<ReceiveCurrency>('CLP'); // Default to CLP for Chilean users
  const [selectedMethod, setSelectedMethod] = useState<TransferMethod>(defaultMethod);
  const [enhancedCalculation, setEnhancedCalculation] = useState<EnhancedTransferCalculation | null>(null);
  const [calculation, setCalculation] = useState<TransferCalculation | null>(null); // Legacy support
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Debounced values to avoid excessive API calls
  const [debouncedInputAmount] = useDebounce(inputAmount, 500);
  const [debouncedCalculatorMode] = useDebounce(calculatorMode, 300);
  const [debouncedSendCurrency] = useDebounce(sendCurrency, 300);
  const [debouncedReceiveCurrency] = useDebounce(receiveCurrency, 300);

  // Calculate transfer using API with enhanced Mantle support
  const calculateTransfer = useCallback(async (amount: string, mode: CalculatorMode, fromCurrency: SendCurrency, toCurrency: ReceiveCurrency) => {
    if (!amount || amount === '0' || amount === '') {
      setCalculation(null);
      setEnhancedCalculation(null);
      return;
    }

    const numericAmount = parseFloat(amount);

    // Validate amount using dynamic schema based on mode
    try {
      const validationCurrency = mode === 'send' ? fromCurrency : toCurrency;
      const schema = createTransferCalculationSchema(validationCurrency, mode);
      const fieldName = mode === 'send' ? 'sendAmount' : 'receiveAmount';
      schema.parse({ [fieldName]: numericAmount });
      setValidationError(null);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setValidationError(err.issues?.[0]?.message || 'Invalid amount');
        setCalculation(null);
        setEnhancedCalculation(null);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      // For "receive" mode, estimate the send amount first
      let estimatedSendAmount = numericAmount;
      if (mode === 'receive') {
        const roughExchangeRate = toCurrency === 'EUR' ? 0.85 :
          toCurrency === 'GBP' ? 0.80 :
            toCurrency === 'CLP' ? 800 :
              toCurrency === 'MXN' ? 20 : 0.85;
        estimatedSendAmount = Math.ceil((numericAmount / roughExchangeRate) * 1.1);
      }

      // Request enhanced calculation with Mantle support if enabled
      const requestBody = {
        sendAmount: estimatedSendAmount,
        sendCurrency: fromCurrency,
        receiveCurrency: toCurrency,
        calculatorMode: mode,
        includeMantle: showTransferMethods && mantleEnabled,
        userId: 'demo-user' // For demo purposes
      };

      const response = await fetch(`${API_URL}/api/transfers/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to calculate transfer');
      }

      const data = await response.json();

      // Check if we received enhanced response with transfer methods
      if (data.transferMethods && Array.isArray(data.transferMethods)) {
        // Enhanced response with Mantle support
        const enhancedData = data as EnhancedTransferCalculation;
        setEnhancedCalculation(enhancedData);
        
        // Also set legacy calculation for backward compatibility
        const selectedMethodData = enhancedData.transferMethods.find(m => m.method === selectedMethod) || 
                                   enhancedData.transferMethods[0];
        
        if (selectedMethodData) {
          setCalculation({
            sendAmount: selectedMethodData.sendAmount,
            receiveAmount: selectedMethodData.receiveAmount,
            sendCurrency: fromCurrency,
            receiveCurrency: toCurrency,
            exchangeRate: selectedMethodData.exchangeRate,
            fees: selectedMethodData.fees.total,
            rateValidUntil: selectedMethodData.rateValidUntil || new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            breakdown: selectedMethodData.breakdown || {
              sendAmountUSD: selectedMethodData.sendAmount,
              fees: {
                cardProcessing: selectedMethodData.fees.processing,
                transfer: selectedMethodData.fees.network,
                payout: selectedMethodData.fees.exchange,
                total: selectedMethodData.fees.total
              },
              netAmountUSD: selectedMethodData.sendAmount - selectedMethodData.fees.total,
              exchangeRate: selectedMethodData.exchangeRate,
              receiveAmount: selectedMethodData.receiveAmount
            },
            estimatedArrival: selectedMethodData.estimatedTime,
            rateId: selectedMethodData.rateId || 'demo-rate-id'
          });
        }
      } else {
        // Legacy response format
        const legacyData = data as TransferCalculation;
        setCalculation(legacyData);
        setEnhancedCalculation(null);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Transfer calculation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate transfer');
      setCalculation(null);
      setEnhancedCalculation(null);
    } finally {
      setIsLoading(false);
    }
  }, [showTransferMethods, mantleEnabled, selectedMethod]);

  // Effect to calculate transfer when amount, mode, or currencies change
  useEffect(() => {
    // Calculate when amount or currencies change
    if (debouncedInputAmount && debouncedInputAmount !== '0' && debouncedInputAmount !== '') {
      calculateTransfer(debouncedInputAmount, debouncedCalculatorMode, debouncedSendCurrency, debouncedReceiveCurrency);
    }
  }, [debouncedInputAmount, debouncedCalculatorMode, debouncedSendCurrency, debouncedReceiveCurrency, calculateTransfer]);

  // Effect to update calculation when selected method changes
  useEffect(() => {
    if (enhancedCalculation && enhancedCalculation.transferMethods.length > 0) {
      const selectedMethodData = enhancedCalculation.transferMethods.find(m => m.method === selectedMethod) || 
                                 enhancedCalculation.transferMethods[0];
      
      if (selectedMethodData) {
        setCalculation({
          sendAmount: selectedMethodData.sendAmount,
          receiveAmount: selectedMethodData.receiveAmount,
          sendCurrency: sendCurrency,
          receiveCurrency: receiveCurrency,
          exchangeRate: selectedMethodData.exchangeRate,
          fees: selectedMethodData.fees.total,
          rateValidUntil: selectedMethodData.rateValidUntil || new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          breakdown: selectedMethodData.breakdown || {
            sendAmountUSD: selectedMethodData.sendAmount,
            fees: {
              cardProcessing: selectedMethodData.fees.processing,
              transfer: selectedMethodData.fees.network,
              payout: selectedMethodData.fees.exchange,
              total: selectedMethodData.fees.total
            },
            netAmountUSD: selectedMethodData.sendAmount - selectedMethodData.fees.total,
            exchangeRate: selectedMethodData.exchangeRate,
            receiveAmount: selectedMethodData.receiveAmount
          },
          estimatedArrival: selectedMethodData.estimatedTime,
          rateId: selectedMethodData.rateId || 'demo-rate-id'
        });
      }
    }
  }, [selectedMethod, enhancedCalculation, sendCurrency, receiveCurrency]);

  // Handle amount input change
  const handleAmountChange = (value: string) => {
    const validationCurrency = calculatorMode === 'send' ? sendCurrency : receiveCurrency;
    const formatted = formatNumberInput(value, validationCurrency);
    setInputAmount(formatted);
  };

  // Handle calculator mode toggle
  const handleModeToggle = () => {
    const newMode = calculatorMode === 'send' ? 'receive' : 'send';
    setCalculatorMode(newMode);

    // If we have a calculation, preserve the amount by switching to the opposite field
    if (calculation) {
      if (newMode === 'receive') {
        // Switching to "Recipient Gets" mode, use the current receive amount
        setInputAmount(calculation.receiveAmount.toString());
      } else {
        // Switching to "You Send" mode, use the current send amount
        setInputAmount(calculation.sendAmount.toString());
      }
    }
  };

  // Handle continue button click
  const handleContinue = () => {
    if (calculation && onContinue) {
      onContinue({
        sendAmount: calculation.sendAmount,
        receiveAmount: calculation.receiveAmount,
        sendCurrency: sendCurrency,
        receiveCurrency: receiveCurrency,
        exchangeRate: calculation.exchangeRate,
        fees: calculation.fees,
        rateId: calculation.rateId,
        rateValidUntil: calculation.rateValidUntil,
        calculatorMode: calculatorMode,
        breakdown: calculation.breakdown,
        estimatedArrival: calculation.estimatedArrival,
        selectedMethod: selectedMethod
      });
    }
  };

  // Check if rate is about to expire (within 2 minutes)
  const isRateExpiringSoon = calculation && calculation.rateValidUntil ?
    new Date(calculation.rateValidUntil).getTime() - Date.now() < 2 * 60 * 1000 : false;

  return (
    <Card className="w-full max-w-lg mx-auto">
      {showTitle && (
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Calculator className="h-5 w-5" />
            Transfer Calculator
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Calculate how much your recipient will receive
          </p>
        </CardHeader>
      )}
      <CardContent className="space-y-6">
        {/* Calculator Mode Switcher */}
        <div className="flex items-center justify-center">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={handleModeToggle}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${calculatorMode === 'send'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                You Send
              </div>
            </button>
            <button
              onClick={handleModeToggle}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${calculatorMode === 'receive'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Recipient Gets
              </div>
            </button>
          </div>
        </div>

        {/* Transfer Method Selection */}
        {showTransferMethods && enhancedCalculation && enhancedCalculation.transferMethods.length > 1 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Transfer Method</Label>
            <div className="grid grid-cols-2 gap-3">
              {enhancedCalculation.transferMethods.map((method) => (
                <button
                  key={method.method}
                  onClick={() => setSelectedMethod(method.method)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedMethod === method.method
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {method.method === 'mantle' ? (
                        <Zap className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Shield className="h-4 w-4 text-green-600" />
                      )}
                      <span className="font-medium capitalize">
                        {method.method === 'mantle' ? 'Mantle L2' : 'Traditional'}
                      </span>
                    </div>
                    {method.recommended && (
                      <Badge variant="secondary" className="text-xs">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{method.estimatedTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      <span>Fee: {formatCurrency(method.fees.total, sendCurrency)}</span>
                    </div>
                  </div>

                  {/* Method-specific indicators */}
                  {method.method === 'mantle' && method.gasEstimate && (
                    <div className="mt-2 text-xs text-blue-600">
                      Gas: {method.gasEstimate.totalCostUSD} USD
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Method Comparison */}
            {enhancedCalculation.comparison && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <TrendingDown className="h-4 w-4" />
                  <span className="font-medium text-sm">Cost Comparison</span>
                </div>
                <div className="text-xs text-amber-600 space-y-1">
                  <div>
                    Mantle L2 saves {enhancedCalculation.comparison.mantleSavings.percentage}% 
                    ({formatCurrency(parseFloat(enhancedCalculation.comparison.mantleSavings.absolute), sendCurrency)})
                  </div>
                  <div>{enhancedCalculation.comparison.timeDifference}</div>
                </div>
              </div>
            )}

            {/* Recommendation */}
            {enhancedCalculation.recommendation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <Calculator className="h-4 w-4" />
                  <span className="font-medium text-sm">Recommendation</span>
                </div>
                <p className="text-xs text-blue-600">
                  {enhancedCalculation.recommendation.reason}
                  {enhancedCalculation.recommendation.costSavings > 0 && (
                    <span className="ml-1">
                      (Save {formatCurrency(enhancedCalculation.recommendation.costSavings, sendCurrency)})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Input Amount and Currency */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              {calculatorMode === 'send' ? (
                <>
                  <DollarSign className="h-4 w-4" />
                  You send
                </>
              ) : (
                <>
                  <Euro className="h-4 w-4" />
                  Recipient gets
                </>
              )}
            </Label>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                id="input-amount"
                type="text"
                placeholder={
                  calculatorMode === 'send'
                    ? `Enter amount to send (${SUPPORTED_CURRENCIES[sendCurrency].decimalPlaces === 0 ? "e.g. 1000" : "e.g. 100.00"})`
                    : `Enter amount recipient gets (${SUPPORTED_CURRENCIES[receiveCurrency].decimalPlaces === 0 ? "e.g. 1000" : "e.g. 100.00"})`
                }
                value={inputAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={`text-lg font-medium ${validationError ? 'border-red-500' : ''}`}
              />
            </div>
            <div className="w-32">
              {calculatorMode === 'send' ? (
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
              ) : (
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
              )}
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

        {/* Output Amount and Currency */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              {calculatorMode === 'send' ? (
                <>
                  <Euro className="h-4 w-4" />
                  Recipient gets
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4" />
                  You send
                </>
              )}
            </Label>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <div className="h-10 px-3 py-2 border border-input bg-gray-50 rounded-md flex items-center text-lg font-medium text-muted-foreground">
                {calculation ? (
                  calculatorMode === 'send'
                    ? formatCurrency(calculation.receiveAmount, receiveCurrency)
                    : formatCurrency(calculation.sendAmount, sendCurrency)
                ) : (
                  <span className="text-sm">
                    {calculatorMode === 'send'
                      ? 'Amount recipient will receive'
                      : 'Amount you need to send'
                    }
                  </span>
                )}
              </div>
            </div>
            <div className="w-32">
              {calculatorMode === 'send' ? (
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
              ) : (
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
              )}
            </div>
          </div>
        </div>

        {/* Empty State Guidance */}
        {!inputAmount && !isLoading && !error && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Calculator className="h-4 w-4" />
              <span className="font-medium">Get Started</span>
            </div>
            <p className="text-sm text-blue-600 mb-3">
              Enter an amount above to see how much your recipient will receive and the total cost including fees.
            </p>
            <div className="space-y-2 text-xs text-blue-600">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>Real-time exchange rates</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>Transparent fee breakdown</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>Fast international transfers</span>
              </div>
            </div>
          </div>
        )}

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

              {/* Enhanced Fee Breakdown with Method-Specific Details */}
              <div className="space-y-1 pl-4 border-l-2 border-gray-100">
                {enhancedCalculation && enhancedCalculation.transferMethods.length > 0 ? (
                  // Enhanced breakdown for selected method
                  (() => {
                    const selectedMethodData = enhancedCalculation.transferMethods.find(m => m.method === selectedMethod);
                    if (!selectedMethodData) return null;
                    
                    return (
                      <>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Processing fee</span>
                          <span>{formatCurrency(selectedMethodData.fees.processing, sendCurrency)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {selectedMethod === 'mantle' ? 'Network gas fee' : 'Transfer fee'}
                          </span>
                          <span>{formatCurrency(selectedMethodData.fees.network, sendCurrency)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Exchange fee</span>
                          <span>{formatCurrency(selectedMethodData.fees.exchange, sendCurrency)}</span>
                        </div>
                        {selectedMethod === 'mantle' && selectedMethodData.gasEstimate && (
                          <div className="flex justify-between text-xs text-blue-600">
                            <span>Gas details</span>
                            <span>{selectedMethodData.gasEstimate.gasPrice} gwei</span>
                          </div>
                        )}
                      </>
                    );
                  })()
                ) : (
                  // Legacy breakdown
                  <>
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
                  </>
                )}
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

            {/* Mantle-Specific Benefits and Network Status */}
            {selectedMethod === 'mantle' && enhancedCalculation && (
              (() => {
                const mantleMethod = enhancedCalculation.transferMethods.find(m => m.method === 'mantle');
                if (!mantleMethod) return null;
                
                return (
                  <div className="space-y-3">
                    {/* Mantle Benefits */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-blue-700 mb-2">
                        <Zap className="h-4 w-4" />
                        <span className="font-medium text-sm">Mantle L2 Benefits</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-blue-600">
                        {mantleMethod.benefits.map((benefit, index) => (
                          <div key={index} className="flex items-center gap-1">
                            <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                            <span>{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Network Status */}
                    {mantleMethod.networkStatus && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-700 mb-2">
                          <div className={`w-2 h-2 rounded-full ${
                            mantleMethod.networkStatus.connected ? 'bg-green-400' : 'bg-red-400'
                          }`}></div>
                          <span className="font-medium text-sm">Network Status</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <div>Block: #{mantleMethod.networkStatus.blockNumber}</div>
                          <div>Latency: {mantleMethod.networkStatus.latency}ms</div>
                          <div>Gas Price: {mantleMethod.networkStatus.gasPrice} gwei</div>
                          <div className={`${
                            mantleMethod.networkStatus.connected ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {mantleMethod.networkStatus.connected ? 'Connected' : 'Disconnected'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Real-time Cost Comparison */}
                    {enhancedCalculation.comparison && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-green-700 mb-2">
                          <TrendingDown className="h-4 w-4" />
                          <span className="font-medium text-sm">Cost Savings with Mantle</span>
                        </div>
                        <div className="text-sm text-green-600">
                          <div className="font-medium">
                            Save {enhancedCalculation.comparison.mantleSavings.percentage}% 
                            ({formatCurrency(parseFloat(enhancedCalculation.comparison.mantleSavings.absolute), sendCurrency)})
                          </div>
                          <div className="text-xs mt-1">
                            {enhancedCalculation.comparison.timeDifference}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            )}

            {/* Last Updated */}
            {lastUpdated && (
              <div className="text-xs text-muted-foreground text-center">
                Last updated: {lastUpdated.toLocaleTimeString()}
                {selectedMethod === 'mantle' && (
                  <span className="ml-2 text-blue-600">• Powered by Mantle L2</span>
                )}
              </div>
            )}

            {/* Continue Button */}
            {onContinue && (
              <Button
                onClick={handleContinue}
                disabled={isNavigating}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg"
                size="lg"
              >
                {isNavigating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Continue with this rate'
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}