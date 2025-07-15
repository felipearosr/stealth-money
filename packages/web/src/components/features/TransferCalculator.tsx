"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getExchangeRate } from "@/lib/api";

export function TransferCalculator() {
  // State variables
  const [sendAmount, setSendAmount] = useState('1000');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [sourceCurrency, setSourceCurrency] = useState('USD');
  const [destCurrency, setDestCurrency] = useState('BRL');
  const [lastEdited, setLastEdited] = useState<'send' | 'receive'>('send');
  
  // API state
  const [rate, setRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced values to avoid excessive API calls
  const [debouncedSendAmount] = useDebounce(sendAmount, 500);
  const [debouncedReceiveAmount] = useDebounce(receiveAmount, 500);
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

  // Two-way calculation logic with API rate
  useEffect(() => {
    if (!rate) return;

    if (lastEdited === 'send') {
      const amount = parseFloat(debouncedSendAmount);
      if (!isNaN(amount)) {
        setReceiveAmount((amount * rate).toFixed(2));
      } else {
        setReceiveAmount('');
      }
    } else { // lastEdited === 'receive'
      const amount = parseFloat(debouncedReceiveAmount);
      if (!isNaN(amount)) {
        setSendAmount((amount / rate).toFixed(2));
      } else {
        setSendAmount('');
      }
    }
  }, [debouncedSendAmount, debouncedReceiveAmount, lastEdited, rate]);

  // Calculate fee and total
  const fee = sendAmount ? (parseFloat(sendAmount) * 0.029).toFixed(2) : '0.00';
  const total = sendAmount ? (parseFloat(sendAmount) + parseFloat(fee)).toFixed(2) : '0.00';

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Send Money</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* You Send Section */}
        <div className="space-y-2">
          <Label htmlFor="send-amount">You Send</Label>
          <div className="flex space-x-2">
            <Input
              id="send-amount"
              type="number"
              placeholder="0.00"
              className="flex-1"
              value={sendAmount}
              onChange={(e) => {
                setSendAmount(e.target.value);
                setLastEdited('send');
              }}
            />
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
        </div>

        {/* Recipient Gets Section */}
        <div className="space-y-2">
          <Label htmlFor="receive-amount">Recipient Gets</Label>
          <div className="flex space-x-2">
            <Input
              id="receive-amount"
              type="number"
              placeholder="0.00"
              className="flex-1"
              value={receiveAmount}
              onChange={(e) => {
                setReceiveAmount(e.target.value);
                setLastEdited('receive');
              }}
            />
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
          className="w-full" 
          disabled={isLoading || !rate || !sendAmount || !receiveAmount || !!error}
        >
          {isLoading ? "Loading..." : "Continue"}
        </Button>
      </CardFooter>
    </Card>
  );
}