"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TransferCalculator() {
  // State variables
  const [sendAmount, setSendAmount] = useState('1000');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [sourceCurrency, setSourceCurrency] = useState('USD');
  const [destCurrency, setDestCurrency] = useState('BRL');
  const MOCK_RATE = 5.15; // Hardcoded rate for now

  // Calculate receive amount when send amount changes
  useEffect(() => {
    const amount = parseFloat(sendAmount);
    if (!isNaN(amount)) {
      setReceiveAmount((amount * MOCK_RATE).toFixed(2));
    } else {
      setReceiveAmount('');
    }
  }, [sendAmount]); // Re-run only when sendAmount changes

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
              onChange={(e) => setSendAmount(e.target.value)}
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
              readOnly
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
          <div className="flex justify-between text-sm text-gray-600">
            <span>Exchange Rate:</span>
            <span>1 {sourceCurrency} = {MOCK_RATE} {destCurrency}</span>
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
        <Button className="w-full">Continue</Button>
      </CardFooter>
    </Card>
  );
}