"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";
import { z } from "zod";
import { Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getExchangeRate } from "@/lib/api";

// Form validation schema
const transferSchema = z.object({
  amountToSend: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  amountToReceive: z.string().min(1, "Receive amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Receive amount must be a positive number"
  ),
  sourceCurrency: z.string().min(1, "Source currency is required"),
  destCurrency: z.string().min(1, "Destination currency is required"),
});

interface TransferCalculatorProps {
  onContinue?: (data: {
    amount: number;
    sourceCurrency: string;
    destCurrency: string;
    rate: number;
    recipientAmount: number;
  }) => void;
}

export function TransferCalculator({ onContinue }: TransferCalculatorProps) {
  const router = useRouter();
  
  // Form state
  const [amountToSend, setAmountToSend] = useState('1000');
  const [amountToReceive, setAmountToReceive] = useState('');
  const [sourceCurrency, setSourceCurrency] = useState('USD');
  const [destCurrency, setDestCurrency] = useState('EUR');
  const [lockedField, setLockedField] = useState<'send' | 'receive'>('send');
  
  // API state
  const [rate, setRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Debounced values to avoid excessive API calls
  const [debouncedAmountToSend] = useDebounce(amountToSend, 500);
  const [debouncedAmountToReceive] = useDebounce(amountToReceive, 500);
  const [debouncedSourceCurrency] = useDebounce(sourceCurrency, 300);
  const [debouncedDestCurrency] = useDebounce(destCurrency, 300);

  // Fetch exchange rate from API
  useEffect(() => {
    const fetchRate = async () => {
      if (!debouncedSourceCurrency || !debouncedDestCurrency) return;
      if (debouncedSourceCurrency === debouncedDestCurrency) {
        setRate(1);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await getExchangeRate(debouncedSourceCurrency, debouncedDestCurrency);
        setRate(response.rate);
      } catch (err) {
        setError('Failed to fetch exchange rate');
        console.error('Exchange rate fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRate();
  }, [debouncedSourceCurrency, debouncedDestCurrency]);

  // Two-way calculation logic based on locked field
  useEffect(() => {
    if (!rate) return;

    if (lockedField === 'send') {
      const amount = parseFloat(debouncedAmountToSend);
      if (!isNaN(amount)) {
        setAmountToReceive((amount * rate).toFixed(2));
      } else {
        setAmountToReceive('');
      }
    } else { // lockedField === 'receive'
      const amount = parseFloat(debouncedAmountToReceive);
      if (!isNaN(amount)) {
        setAmountToSend((amount / rate).toFixed(2));
      } else {
        setAmountToSend('');
      }
    }
  }, [debouncedAmountToSend, debouncedAmountToReceive, lockedField, rate]);

  // Toggle lock field
  const toggleLock = (field: 'send' | 'receive') => {
    setLockedField(field === lockedField ? (field === 'send' ? 'receive' : 'send') : field);
  };

  // Calculate fee and total
  const fee = amountToSend ? (parseFloat(amountToSend) * 0.029).toFixed(2) : '0.00';
  const total = amountToSend ? (parseFloat(amountToSend) + parseFloat(fee)).toFixed(2) : '0.00';

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous validation errors
    setValidationErrors({});
    setError(null);

    // Validate form data
    const formData = {
      amountToSend,
      amountToReceive,
      sourceCurrency,
      destCurrency,
    };

    try {
      transferSchema.parse(formData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.issues.forEach((error) => {
          if (error.path[0]) {
            errors[error.path[0] as string] = error.message;
          }
        });
        setValidationErrors(errors);
        return;
      }
    }

    if (!rate) {
      setError('Exchange rate not available');
      return;
    }

    // If onContinue prop is provided, use the multi-step flow
    if (onContinue) {
      onContinue({
        amount: parseFloat(amountToSend),
        sourceCurrency,
        destCurrency,
        rate,
        recipientAmount: parseFloat(amountToReceive),
      });
      return;
    }

    // Create initial transfer without recipient information
    setIsLoading(true);

    try {
      // Make API call to create transfer
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amountToSend),
          sourceCurrency,
          destCurrency,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create transfer');
      }

      const transferData = await response.json();
      
      // Redirect to recipient page to collect recipient information
      router.push(`/recipient/${transferData.transactionId}`);
      
    } catch (err) {
      setError('Failed to create transfer. Please try again.');
      console.error('Transfer creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Send Money</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* You Send Section */}
          <div className="space-y-2">
            <Label htmlFor="send-amount">You Send</Label>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Input
                  id="send-amount"
                  type="number"
                  placeholder="0.00"
                  className="pr-10"
                  value={amountToSend}
                  onChange={(e) => setAmountToSend(e.target.value)}
                  disabled={lockedField === 'send'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => toggleLock('send')}
                >
                  {lockedField === 'send' ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <LockOpen className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Select value={sourceCurrency} onValueChange={setSourceCurrency}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {validationErrors.amountToSend && (
              <p className="text-sm text-red-600">{validationErrors.amountToSend}</p>
            )}
          </div>

          {/* They Receive Section */}
          <div className="space-y-2">
            <Label htmlFor="receive-amount">They Receive</Label>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Input
                  id="receive-amount"
                  type="number"
                  placeholder="0.00"
                  className="pr-10"
                  value={amountToReceive}
                  onChange={(e) => setAmountToReceive(e.target.value)}
                  disabled={lockedField === 'receive'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => toggleLock('receive')}
                >
                  {lockedField === 'receive' ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <LockOpen className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Select value={destCurrency} onValueChange={setDestCurrency}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {validationErrors.amountToReceive && (
              <p className="text-sm text-red-600">{validationErrors.amountToReceive}</p>
            )}
          </div>

          {/* Fee and Rate Details */}
          <div className="space-y-2 pt-4 border-t">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>Exchange Rate:</span>
              <span>
                {isLoading ? (
                  "Loading..."
                ) : rate ? (
                  `1 ${sourceCurrency} = ${rate.toFixed(4)} ${destCurrency}`
                ) : (
                  "Rate unavailable"
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Fee (2.9%):</span>
              <span>{sourceCurrency} {fee}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total to pay:</span>
              <span className="font-semibold">{sourceCurrency} {total}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit"
            className="w-full" 
            disabled={isLoading || !rate || !amountToSend || !amountToReceive || parseFloat(amountToSend) <= 0}
          >
            {isLoading ? "Processing..." : "Continue"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}