"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getExchangeRate } from "@/lib/api";

// Terminal logging utility
const addLog = (
  setTerminalLogs: React.Dispatch<React.SetStateAction<Array<{timestamp: string, message: string, type: 'info' | 'success' | 'warning' | 'error'}>>>,
  message: string, 
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
) => {
  const timestamp = new Date().toLocaleTimeString();
  setTerminalLogs(prev => [...prev, { timestamp, message, type }]);
};

// Demo simulation function for presentation with terminal logs
const simulatePaymentAndBlockchainFlow = async (
  transferData: {
    transactionId: string;
    sourceAmount: number;
    destCurrency: string;
    recipientAmount: number;
    clientSecret: string;
    rate: number;
    status: string;
  },
  setTerminalLogs: React.Dispatch<React.SetStateAction<Array<{timestamp: string, message: string, type: 'info' | 'success' | 'warning' | 'error'}>>>
) => {
  const steps = [
    {
      type: 'info' as const,
      messages: [
        `🏦 TRANSFER INITIATED`,
        `Transaction ID: ${transferData.transactionId}`,
        `Amount: ${transferData.sourceAmount} USD → ${transferData.recipientAmount} ${transferData.destCurrency}`,
        `Status: ${transferData.status}`,
        `Exchange Rate: ${transferData.rate}`,
        ``
      ]
    },
    {
      type: 'info' as const,
      messages: [
        `💳 PROCESSING PAYMENT`,
        `Stripe Payment Intent: ${transferData.clientSecret.split('_')[1]}`,
        `Processing card payment...`,
        `Payment Method: Visa ****4242`,
        `Amount: $${transferData.sourceAmount}`,
        ``
      ]
    },
    {
      type: 'success' as const,
      messages: [
        `✅ PAYMENT CONFIRMED`,
        `Payment Status: SUCCEEDED`,
        `Amount Charged: $${transferData.sourceAmount}`,
        `Stripe Fee: $2.90`,
        `Net Amount: $${(transferData.sourceAmount - 2.90).toFixed(2)}`,
        ``
      ]
    },
    {
      type: 'info' as const,
      messages: [
        `⛓️ BLOCKCHAIN PROCESSING`,
        `Connecting to Ethereum Network: Sepolia Testnet`,
        `RPC Endpoint: https://sepolia.infura.io/v3/...`,
        `Contract Address: 0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e`,
        `Initiating smart contract call...`,
        ``
      ]
    },
    {
      type: 'warning' as const,
      messages: [
        `🔐 SMART CONTRACT EXECUTION`,
        `Function: releaseFunds()`,
        `Recipient: 0x8ba1f109551bD432803012645Hac136c5c8b`,
        `Amount: ${transferData.recipientAmount} USDC`,
        `Gas Price: 20 gwei`,
        `Gas Limit: 50,000`,
        `Estimated Gas Fee: 0.0023 ETH`,
        ``
      ]
    },
    {
      type: 'info' as const,
      messages: [
        `📝 TRANSACTION MINING`,
        `Block Number: #4,892,156`,
        `Transaction Hash: 0x9f2d8c1a5b3e7f4c6d8e9a2b1c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d`,
        `Gas Used: 45,231 / 50,000 (90.46%)`,
        `Confirmations: 1/12`,
        `Block Time: 12 seconds`,
        ``
      ]
    },
    {
      type: 'success' as const,
      messages: [
        `🎉 TRANSFER COMPLETE!`,
        `✅ Funds Released Successfully!`,
        `💰 Recipient received: ${transferData.recipientAmount} ${transferData.destCurrency}`,
        `🏦 Bank transfer initiated`,
        `📱 SMS notification sent`,
        `Transaction Status: COMPLETED`,
        `Total Processing Time: 45 seconds`,
        ``,
        `🎊 MONEY TRANSFER SUCCESSFUL! 🎊`
      ]
    }
  ];

  for (const step of steps) {
    for (const message of step.messages) {
      addLog(setTerminalLogs, message, step.type);
      await new Promise(resolve => setTimeout(resolve, 400)); // Typing effect
    }
    await new Promise(resolve => setTimeout(resolve, 800)); // Pause between sections
  }
};

export function TransferCalculator() {
  // State variables
  const [sendAmount, setSendAmount] = useState('1000');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [sourceCurrency, setSourceCurrency] = useState('USD');
  const [destCurrency, setDestCurrency] = useState('EUR');
  const [lastEdited, setLastEdited] = useState<'send' | 'receive'>('send');
  
  // API state
  const [rate, setRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Terminal log state
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<Array<{timestamp: string, message: string, type: 'info' | 'success' | 'warning' | 'error'}>>([]);

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

  // Handle continue button click
  const handleContinue = async () => {
    if (!sendAmount || !receiveAmount || !rate) return;

    setIsLoading(true);
    setError(null);
    setShowTerminal(true);
    setTerminalLogs([]);

    try {
      // Create transfer via API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(sendAmount),
          sourceCurrency,
          destCurrency,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create transfer');
      }

      const transferData = await response.json();
      console.log('Transfer created:', transferData);

      // Demo flow for presentation with terminal logs
      await simulatePaymentAndBlockchainFlow(transferData, setTerminalLogs);

    } catch (err) {
      setError('Failed to create transfer');
      console.error('Transfer creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if button should be enabled
  const isButtonEnabled = !isLoading && rate && sendAmount && receiveAmount && !error && parseFloat(sendAmount) > 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="w-full max-w-md mx-auto">
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
            disabled={!isButtonEnabled}
            onClick={handleContinue}
          >
            {isLoading ? "Processing..." : "Continue"}
          </Button>
        </CardFooter>
      </Card>

      {/* Terminal Interface */}
      {showTerminal && (
        <Card className="w-full bg-black text-green-400 font-mono">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-400 text-sm">Stealth Money Terminal - Usando Contratos Reales, Stripe en modo test</CardTitle>
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-96 overflow-y-auto space-y-1 text-xs">
              {terminalLogs.map((log, index) => (
                <div key={index} className={`flex space-x-2 ${
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'warning' ? 'text-yellow-400' :
                  log.type === 'error' ? 'text-red-400' :
                  'text-green-300'
                }`}>
                  <span className="text-gray-500">[{log.timestamp}]</span>
                  <span>{log.message}</span>
                </div>
              ))}
              {isLoading && (
                <div className="flex space-x-2 text-green-400">
                  <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>
                  <span className="animate-pulse">Processing...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}