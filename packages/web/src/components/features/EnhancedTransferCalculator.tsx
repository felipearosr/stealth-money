"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ProcessorSelection } from "./ProcessorSelection";
import { getExchangeRate, createTransferWithProcessor, ProcessorOption, ProcessorSelection as ProcessorSelectionType, LocationData } from "@/lib/api";
import { MapPin, Loader2, AlertCircle, CheckCircle, Clock, DollarSign } from "lucide-react";

// Mock user ID for demo purposes - in real app this would come from auth
const MOCK_USER_ID = "user-123";

// Terminal logging utility
const addLog = (
  setTerminalLogs: React.Dispatch<React.SetStateAction<Array<{timestamp: string, message: string, type: 'info' | 'success' | 'warning' | 'error'}>>>,
  message: string, 
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
) => {
  const timestamp = new Date().toLocaleTimeString();
  setTerminalLogs(prev => [...prev, { timestamp, message, type }]);
};

// Enhanced simulation function with processor-specific flows
const simulateEnhancedPaymentFlow = async (
  transferData: {
    transactionId: string;
    sourceAmount: number;
    destCurrency: string;
    recipientAmount: number;
    clientSecret?: string;
    rate: number;
    status: string;
    processorId: string;
    fallbackUsed?: boolean;
    processorInfo?: any;
  },
  setTerminalLogs: React.Dispatch<React.SetStateAction<Array<{timestamp: string, message: string, type: 'info' | 'success' | 'warning' | 'error'}>>>
) => {
  const processorName = transferData.processorId === 'stripe' ? 'Stripe' : 
                       transferData.processorId === 'plaid' ? 'Plaid' : 
                       transferData.processorId === 'circle' ? 'Circle' : 'Unknown';

  const steps = [
    {
      type: 'info' as const,
      messages: [
        `🏦 ENHANCED TRANSFER INITIATED`,
        `Transaction ID: ${transferData.transactionId}`,
        `Amount: ${transferData.sourceAmount} USD → ${transferData.recipientAmount} ${transferData.destCurrency}`,
        `Selected Processor: ${processorName}`,
        `Status: ${transferData.status}`,
        `Exchange Rate: ${transferData.rate}`,
        transferData.fallbackUsed ? `⚠️ Fallback processor used` : `✅ Primary processor selected`,
        ``
      ]
    },
    {
      type: 'info' as const,
      messages: [
        `💳 PROCESSING WITH ${processorName.toUpperCase()}`,
        transferData.processorId === 'stripe' ? `Stripe Payment Intent: ${transferData.clientSecret?.split('_')[1] || 'pi_xxx'}` :
        transferData.processorId === 'plaid' ? `Plaid Link Token: plaid_${Date.now()}` :
        transferData.processorId === 'circle' ? `Circle Payment ID: circle_${Date.now()}` : 'Processing...',
        `Processing payment method...`,
        transferData.processorId === 'stripe' ? `Payment Method: Visa ****4242` :
        transferData.processorId === 'plaid' ? `Bank Account: Chase ****1234` :
        transferData.processorId === 'circle' ? `USDC Wallet: 0x742d...5c8e` : 'Payment Method: Card',
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
        transferData.processorId === 'stripe' ? `Stripe Fee: $${(transferData.sourceAmount * 0.029 + 0.30).toFixed(2)}` :
        transferData.processorId === 'plaid' ? `Plaid Fee: $${(transferData.sourceAmount * 0.015 + 0.25).toFixed(2)}` :
        transferData.processorId === 'circle' ? `Circle Fee: $${(transferData.sourceAmount * 0.01 + 0.10).toFixed(2)}` : `Fee: $2.90`,
        `Net Amount: $${(transferData.sourceAmount - (transferData.processorId === 'stripe' ? 2.90 : transferData.processorId === 'plaid' ? 1.75 : 1.10)).toFixed(2)}`,
        ``
      ]
    },
    {
      type: 'info' as const,
      messages: [
        `⛓️ BLOCKCHAIN PROCESSING`,
        `Connecting to Settlement Network...`,
        transferData.processorId === 'circle' ? `Using Circle's USDC Settlement` : `Using Mantle L2 Network`,
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
        `Amount: ${transferData.recipientAmount} ${transferData.destCurrency === 'USD' ? 'USDC' : transferData.destCurrency}`,
        `Gas Price: ${transferData.processorId === 'circle' ? '5 gwei (Circle optimized)' : '20 gwei'}`,
        `Gas Limit: 50,000`,
        `Estimated Gas Fee: ${transferData.processorId === 'circle' ? '0.0012 ETH' : '0.0023 ETH'}`,
        ``
      ]
    },
    {
      type: 'info' as const,
      messages: [
        `📝 TRANSACTION MINING`,
        `Block Number: #4,892,${Math.floor(Math.random() * 1000) + 100}`,
        `Transaction Hash: 0x${Math.random().toString(16).substring(2, 66)}`,
        `Gas Used: ${Math.floor(Math.random() * 5000) + 40000} / 50,000`,
        `Confirmations: 1/12`,
        `Block Time: ${transferData.processorId === 'circle' ? '8 seconds' : '12 seconds'}`,
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
        `Total Processing Time: ${transferData.processorId === 'circle' ? '32 seconds' : transferData.processorId === 'plaid' ? '38 seconds' : '45 seconds'}`,
        `Processor: ${processorName} ${transferData.fallbackUsed ? '(Fallback)' : '(Primary)'}`,
        ``,
        `🎊 MONEY TRANSFER SUCCESSFUL! 🎊`
      ]
    }
  ];

  for (const step of steps) {
    for (const message of step.messages) {
      addLog(setTerminalLogs, message, step.type);
      await new Promise(resolve => setTimeout(resolve, 300)); // Faster typing effect
    }
    await new Promise(resolve => setTimeout(resolve, 600)); // Shorter pause between sections
  }
};

export function EnhancedTransferCalculator() {
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

  // Processor selection state
  const [selectedProcessor, setSelectedProcessor] = useState<ProcessorOption | null>(null);
  const [processorSelection, setProcessorSelection] = useState<ProcessorSelectionType | null>(null);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [showProcessorSelection, setShowProcessorSelection] = useState(true);

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

  // Calculate fee and total based on selected processor
  const calculateFees = () => {
    if (!sendAmount || !selectedProcessor) {
      return { fee: '0.00', total: '0.00' };
    }
    
    const amount = parseFloat(sendAmount);
    const processorFee = selectedProcessor.fees.fixedFee + (amount * selectedProcessor.fees.percentageFee / 100);
    const total = amount + processorFee;
    
    return {
      fee: processorFee.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const { fee, total } = calculateFees();

  // Handle processor selection
  const handleProcessorSelected = (processor: ProcessorOption, selection?: ProcessorSelectionType) => {
    setSelectedProcessor(processor);
    setProcessorSelection(selection);
    setShowProcessorSelection(false);
  };

  const handleLocationDetected = (location: LocationData) => {
    setUserLocation(location);
  };

  // Handle continue button click
  const handleContinue = async () => {
    if (!sendAmount || !receiveAmount || !rate || !selectedProcessor) return;

    setIsLoading(true);
    setError(null);
    setShowTerminal(true);
    setTerminalLogs([]);

    try {
      // Create transfer via enhanced API with processor selection
      const transferData = await createTransferWithProcessor({
        amount: parseFloat(sendAmount),
        sourceCurrency,
        destCurrency,
        userId: MOCK_USER_ID,
        processorId: selectedProcessor.id,
      });

      console.log('Enhanced transfer created:', transferData);

      // Enhanced demo flow with processor-specific information
      await simulateEnhancedPaymentFlow(transferData, setTerminalLogs);

    } catch (err) {
      setError('Failed to create transfer');
      console.error('Transfer creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if button should be enabled
  const isButtonEnabled = !isLoading && rate && sendAmount && receiveAmount && !error && parseFloat(sendAmount) > 0 && selectedProcessor;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Send Money</span>
            {userLocation && (
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{userLocation.country}</span>
              </div>
            )}
          </CardTitle>
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
            {selectedProcessor && (
              <>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Payment Method:</span>
                  <span className="flex items-center space-x-1">
                    <span>{selectedProcessor.name}</span>
                    {processorSelection && (
                      <Badge variant="outline" className="text-xs">
                        Recommended
                      </Badge>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Fee ({selectedProcessor.fees.percentageFee}% + ${selectedProcessor.fees.fixedFee}):</span>
                  <span>{sourceCurrency} {fee}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Processing Time:</span>
                  <span className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{selectedProcessor.processingTime}</span>
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total to pay:</span>
              <span className="font-semibold">{sourceCurrency} {total}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col space-y-3">
          {!selectedProcessor && (
            <div className="w-full text-center text-sm text-gray-600 bg-yellow-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Please select a payment method to continue
            </div>
          )}
          <Button 
            className="w-full" 
            disabled={!isButtonEnabled}
            onClick={handleContinue}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              "Continue"
            )}
          </Button>
          {selectedProcessor && (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setShowProcessorSelection(true)}
            >
              Change Payment Method
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Processor Selection */}
      {showProcessorSelection && (
        <ProcessorSelection
          userId={MOCK_USER_ID}
          amount={parseFloat(sendAmount) || undefined}
          currency={sourceCurrency}
          onProcessorSelected={handleProcessorSelected}
          onLocationDetected={handleLocationDetected}
          criteria={{
            prioritizeCost: true,
            prioritizeSpeed: false,
            prioritizeReliability: true
          }}
        />
      )}

      {/* Selected Processor Summary */}
      {selectedProcessor && !showProcessorSelection && (
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{selectedProcessor.name} Selected</h3>
                  <p className="text-sm text-gray-600">
                    {processorSelection?.reason || 'Payment method configured'}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowProcessorSelection(true)}
              >
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Terminal Interface */}
      {showTerminal && (
        <Card className="w-full bg-black text-green-400 font-mono">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-400 text-sm">
                Enhanced Payment Terminal - Intelligent Processor Selection
              </CardTitle>
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