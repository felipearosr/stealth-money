"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle, 
  User, 
  CreditCard, 
  Send, 
  ArrowRight, 
  ArrowLeft,
  Shield, 
  Globe,
  DollarSign,
  Clock,
  AlertCircle,
  Calculator,
  ArrowRightLeft,
  Euro,
  RefreshCw
} from "lucide-react";

type DemoStep = 'verification' | 'selection' | 'payment' | 'results';

interface MockUser {
  id: string;
  name: string;
  email: string;
  country: string;
  acceptedCurrencies: string[];
  firstName: string;
  lastName: string;
}

const mockUsers: MockUser[] = [
  {
    id: '1',
    name: 'María González',
    firstName: 'María',
    lastName: 'González',
    email: 'maria@example.cl',
    country: 'Chile',
    acceptedCurrencies: ['CLP', 'USD']
  },
  {
    id: '2',
    name: 'Carlos Rodriguez',
    firstName: 'Carlos',
    lastName: 'Rodriguez',
    email: 'carlos@example.cl',
    country: 'Chile',
    acceptedCurrencies: ['CLP']
  },
  {
    id: '3',
    name: 'Ana Silva',
    firstName: 'Ana',
    lastName: 'Silva',
    email: 'ana@example.cl',
    country: 'Chile',
    acceptedCurrencies: ['CLP', 'USD', 'EUR']
  },
  {
    id: '4',
    name: 'Diego Morales',
    firstName: 'Diego',
    lastName: 'Morales',
    email: 'diego@example.cl',
    country: 'Chile',
    acceptedCurrencies: ['CLP']
  },
  {
    id: '5',
    name: 'Isabella Torres',
    firstName: 'Isabella',
    lastName: 'Torres',
    email: 'isabella@example.cl',
    country: 'Chile',
    acceptedCurrencies: ['CLP', 'USD']
  },
  {
    id: '6',
    name: 'Roberto Fernandez',
    firstName: 'Roberto',
    lastName: 'Fernandez',
    email: 'roberto@example.cl',
    country: 'Chile',
    acceptedCurrencies: ['CLP', 'EUR']
  }
];

type CalculatorMode = 'send' | 'receive';

// Currency definitions
const SUPPORTED_CURRENCIES = {
  CLP: { flag: '🇨🇱', name: 'Chilean Peso', symbol: '$', minAmount: 1000, maxAmount: 10000000 },
  USD: { flag: '🇺🇸', name: 'US Dollar', symbol: '$', minAmount: 1, maxAmount: 10000 },
  EUR: { flag: '🇪🇺', name: 'Euro', symbol: '€', minAmount: 1, maxAmount: 10000 },
  GBP: { flag: '🇬🇧', name: 'British Pound', symbol: '£', minAmount: 1, maxAmount: 10000 },
  MXN: { flag: '🇲🇽', name: 'Mexican Peso', symbol: '$', minAmount: 20, maxAmount: 200000 }
};

const SEND_CURRENCIES = ['CLP', 'USD', 'EUR', 'GBP'] as const;
const RECEIVE_CURRENCIES = ['CLP', 'USD', 'EUR', 'GBP', 'MXN'] as const;

type SendCurrency = typeof SEND_CURRENCIES[number];
type ReceiveCurrency = typeof RECEIVE_CURRENCIES[number];

// Mock exchange rates
const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  CLP: { USD: 0.00105, EUR: 0.00095, GBP: 0.00082, MXN: 0.021, CLP: 1 },
  USD: { CLP: 950, EUR: 0.85, GBP: 0.78, MXN: 20, USD: 1 },
  EUR: { CLP: 1050, USD: 1.18, GBP: 0.92, MXN: 23.5, EUR: 1 },
  GBP: { CLP: 1220, USD: 1.28, EUR: 1.09, MXN: 25.6, GBP: 1 },
  MXN: { CLP: 47.6, USD: 0.05, EUR: 0.043, GBP: 0.039, MXN: 1 }
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

export default function MVPDemo() {
  const [currentStep, setCurrentStep] = useState<DemoStep>('verification');
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<MockUser[]>([]);
  const [showUsers, setShowUsers] = useState(false);
  const [verificationMessages, setVerificationMessages] = useState<string[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [verificationStep, setVerificationStep] = useState<'form' | 'sending' | 'waiting' | 'verifying'>('form');
  const [microDepositSent, setMicroDepositSent] = useState(false);
  
  // Calculator state
  const [calculatorMode, setCalculatorMode] = useState<CalculatorMode>('send');
  const [sendCurrency, setSendCurrency] = useState<SendCurrency>('CLP');
  const [receiveCurrency, setReceiveCurrency] = useState<ReceiveCurrency>('CLP');
  const [calculation, setCalculation] = useState<TransferCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  const steps = [
    { id: 'verification', title: 'Bank Verification', icon: Shield },
    { id: 'selection', title: 'Select Recipient', icon: Globe },
    { id: 'payment', title: 'Payment Process', icon: CreditCard },
    { id: 'results', title: 'Results', icon: CheckCircle }
  ];

  const verificationSteps = {
    sending: [
      'Connecting to Chilean banking network...',
      'Validating RUT with Registro Civil...',
      'Preparing micro-deposit of 1 CLP...',
      'Sending verification deposit to your account...',
      'Micro-deposit sent successfully!'
    ],
    verifying: ['Account verified!']
  };

  const canGoBack = () => {
    if (currentStep === 'verification') return false;
    if (currentStep === 'selection') return true;
    if (currentStep === 'payment') return true;
    if (currentStep === 'results') return !isProcessing;
    return true;
  };

  const handleGoBack = () => {
    if (!canGoBack()) return;
    
    if (currentStep === 'selection') {
      setCurrentStep('verification');
    } else if (currentStep === 'payment') {
      setCurrentStep('selection');
    } else if (currentStep === 'results') {
      setCurrentStep('payment');
    }
  };

  const getCurrentStepIndex = () => steps.findIndex(step => step.id === currentStep);
  const progressPercentage = ((getCurrentStepIndex() + 1) / steps.length) * 100;

  useEffect(() => {
    if (verificationStep !== 'sending' || !isProcessing) return;

    const currentSteps = verificationSteps.sending;
    const timer = setTimeout(() => {
      if (currentMessageIndex < currentSteps.length) {
        setVerificationMessages(prev => [...prev, currentSteps[currentMessageIndex]]);
        setVerificationProgress(prev => prev + (100 / currentSteps.length));
        setCurrentMessageIndex(prev => prev + 1);
      } else {
        setIsProcessing(false);
        setMicroDepositSent(true);
        setVerificationStep('waiting');
        setVerificationProgress(100);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [currentMessageIndex, verificationStep, isProcessing]);

  // Handle payment processing timeout in results page
  useEffect(() => {
    if (currentStep === 'results' && isProcessing) {
      const timer = setTimeout(() => {
        setIsProcessing(false);
      }, 23000); // 23 seconds for pending state

      return () => clearTimeout(timer);
    }
  }, [currentStep, isProcessing]);



  const handleSendMicroDeposit = () => {
    setVerificationStep('sending');
    setIsProcessing(true);
    setVerificationProgress(0);
    setVerificationMessages([]);
    setCurrentMessageIndex(0);
  };

  const handleVerifyDeposit = () => {
    setVerificationStep('verifying');
    setIsProcessing(true);
    setVerificationMessages(['Account verified!']);
    setVerificationProgress(100);

    setTimeout(() => {
      setIsProcessing(false);
      setCurrentStep('selection');
    }, 1500);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const filtered = mockUsers.filter(user => 
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredUsers(filtered);
      setTimeout(() => setShowUsers(true), 300);
    } else {
      setShowUsers(false);
      setFilteredUsers([]);
    }
  };

  const getProfileColor = (firstName: string, lastName: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 
      'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
    ];
    const index = (firstName.charCodeAt(0) + lastName.charCodeAt(0)) % colors.length;
    return colors[index];
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  // Mock calculation function with currency support
  const calculateTransfer = (amount: string, mode: CalculatorMode, fromCurrency: SendCurrency, toCurrency: ReceiveCurrency) => {
    if (!amount || amount === '0' || amount === '') {
      setCalculation(null);
      return;
    }

    const numericAmount = parseFloat(amount);
    const minAmount = SUPPORTED_CURRENCIES[mode === 'send' ? fromCurrency : toCurrency].minAmount;
    if (numericAmount < minAmount) return; // Minimum amount check

    setIsCalculating(true);
    setCalculationError(null);

    // Mock calculation with realistic fees and exchange rates
    setTimeout(() => {
      const exchangeRate = EXCHANGE_RATES[fromCurrency]?.[toCurrency] || 1;
      
      let sendAmount: number;
      let receiveAmount: number;
      
      if (mode === 'send') {
        sendAmount = numericAmount;
        receiveAmount = Math.round(numericAmount * exchangeRate);
      } else {
        receiveAmount = numericAmount;
        sendAmount = Math.round(numericAmount / exchangeRate);
      }

      const mockFees = {
        cardProcessing: Math.round(sendAmount * 0.029), // 2.9% card processing
        transfer: fromCurrency === 'CLP' ? 2500 : fromCurrency === 'USD' ? 3 : fromCurrency === 'EUR' ? 2.5 : 2, // Currency-specific transfer fee
        payout: Math.round(sendAmount * 0.01), // 1% payout fee
        total: 0
      };
      mockFees.total = mockFees.cardProcessing + mockFees.transfer + mockFees.payout;

      // Adjust receive amount for fees if in send mode
      if (mode === 'send') {
        receiveAmount = Math.round((sendAmount - mockFees.total) * exchangeRate);
      } else {
        sendAmount = sendAmount + mockFees.total;
      }

      const mockCalculation: TransferCalculation = {
        sendAmount,
        receiveAmount,
        sendCurrency: fromCurrency,
        receiveCurrency: toCurrency,
        exchangeRate,
        fees: mockFees.total,
        rateValidUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        breakdown: {
          sendAmountUSD: sendAmount * (EXCHANGE_RATES[fromCurrency]?.USD || 1),
          fees: mockFees,
          netAmountUSD: (sendAmount - mockFees.total) * (EXCHANGE_RATES[fromCurrency]?.USD || 1),
          exchangeRate,
          receiveAmount
        },
        estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        rateId: `rate_${Date.now()}`
      };

      setCalculation(mockCalculation);
      setIsCalculating(false);
    }, 800); // Simulate API delay
  };

  // Handle calculator mode toggle
  const handleModeToggle = () => {
    const newMode = calculatorMode === 'send' ? 'receive' : 'send';
    setCalculatorMode(newMode);
    
    // If we have a calculation, preserve the amount by switching to the opposite field
    if (calculation) {
      if (newMode === 'receive') {
        setPaymentAmount(calculation.receiveAmount.toString());
      } else {
        setPaymentAmount(calculation.sendAmount.toString());
      }
    }
  };

  // Effect to calculate when amount or currencies change
  useEffect(() => {
    if (paymentAmount && paymentAmount !== '0' && paymentAmount !== '') {
      calculateTransfer(paymentAmount, calculatorMode, sendCurrency, receiveCurrency);
    }
  }, [paymentAmount, calculatorMode, sendCurrency, receiveCurrency]);

  const handlePayment = () => {
    setIsProcessing(true);
    setCurrentStep('results');
  };



  const renderVerificationStep = () => (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="text-blue-500" />
          Bank Account Verification - Chile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {verificationStep === 'form' && (
          <>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <DollarSign className="text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-800">Micro-Deposit Verification</h3>
                  <p className="text-blue-600">We'll send 1 CLP ($0.01 USD) to verify your account ownership</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bank Name</label>
                  <select className="w-full p-2 border rounded-md bg-white">
                    <option>Banco de Chile</option>
                    <option>BancoEstado</option>
                    <option>Banco Santander</option>
                    <option>Banco BCI</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Account Type</label>
                  <select className="w-full p-2 border rounded-md bg-white">
                    <option>Cuenta Corriente</option>
                    <option>Cuenta Vista</option>
                    <option>Cuenta de Ahorro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">RUT</label>
                <input 
                  type="text" 
                  placeholder="12.345.678-9"
                  className="w-full p-2 border rounded-md"
                  defaultValue="12.345.678-9"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Account Number</label>
                <input 
                  type="text" 
                  placeholder="Enter your account number"
                  className="w-full p-2 border rounded-md"
                  defaultValue="****1234"
                />
              </div>
            </div>

            <Button 
              onClick={handleSendMicroDeposit} 
              disabled={isProcessing}
              className="w-full"
            >
              Send 1 CLP Verification Deposit
              <DollarSign className="ml-2 h-4 w-4" />
            </Button>
          </>
        )}

        {(verificationStep === 'sending' || verificationStep === 'verifying') && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="space-y-2">
                {verificationMessages.map((message, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-blue-700">
                    {isProcessing && index === verificationMessages.length - 1 ? (
                      <Clock className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    <span>{message}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Verification Progress</span>
                <span>{Math.round(verificationProgress)}%</span>
              </div>
              <Progress value={verificationProgress} className="w-full" />
            </div>
          </div>
        )}

        {verificationStep === 'waiting' && (
          <>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800">Micro-Deposit Sent!</h3>
                  <p className="text-green-600">1 CLP has been sent to your account. Check your bank statement.</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-3">
                <Clock className="text-yellow-600" />
                <div>
                  <h3 className="font-semibold text-yellow-800">Waiting for Confirmation</h3>
                  <p className="text-yellow-600">Please check your bank account and confirm you received the 1 CLP deposit.</p>
                  <p className="text-sm text-yellow-500 mt-1">This usually takes 1-2 minutes to appear in your account.</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleVerifyDeposit} 
              disabled={isProcessing}
              className="w-full"
            >
              I've Received the 1 CLP Deposit
              <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderSelectionStep = () => (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="text-purple-500" />
          Select Recipient
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600">Search for a user to send money to:</p>
        
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="text-sm text-gray-500">Type at least 2 characters to search</p>
          )}
        </div>
        
        {showUsers && (
          <div className="space-y-3">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedUser?.id === user.id 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                        getProfileColor(user.firstName, user.lastName)
                      }`}>
                        {getInitials(user.firstName, user.lastName)}
                      </div>
                      <div>
                        <h3 className="font-semibold">{user.name}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-sm text-gray-500">{user.country}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-1 flex-wrap justify-end">
                        {user.acceptedCurrencies.map(currency => (
                          <Badge 
                            key={currency} 
                            variant="secondary" 
                            className={currency === 'CLP' ? 'bg-blue-100 text-blue-800' : ''}
                          >
                            {currency}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No users found matching your search</p>
            )}
          </div>
        )}

        <Button 
          onClick={() => setCurrentStep('payment')} 
          disabled={!selectedUser}
          className="w-full"
        >
          Continue to Payment
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );



  const renderPaymentStep = () => (
    <div className="w-full max-w-2xl mx-auto">
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
        <CardContent className="pt-0 space-y-6">
          {selectedUser && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Sending to:</h3>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                  getProfileColor(selectedUser.firstName, selectedUser.lastName)
                }`}>
                  {getInitials(selectedUser.firstName, selectedUser.lastName)}
                </div>
                <div>
                  <p className="font-medium">{selectedUser.name}</p>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Calculator Mode Switcher */}
          <div className="flex items-center justify-center">
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <button
                onClick={handleModeToggle}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  calculatorMode === 'send'
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
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  calculatorMode === 'receive'
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

          {/* Transfer Calculator Interface */}
          <div className="space-y-6">
            {/* Input Amount */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
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
                </label>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder={calculatorMode === 'send' ? "50,000" : "47,500"}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full p-4 border-2 rounded-lg text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="w-32">
                  {calculatorMode === 'send' ? (
                    <Select value={sendCurrency} onValueChange={(value) => setSendCurrency(value as SendCurrency)}>
                      <SelectTrigger className="h-16 border-2">
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
                      <SelectTrigger className="h-16 border-2">
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
            </div>

            {/* Currency Exchange Arrow */}
            <div className="flex justify-center">
              <div className="bg-gray-100 rounded-full p-2">
                <ArrowRightLeft className="h-4 w-4 text-gray-600" />
              </div>
            </div>

            {/* Output Amount */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
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
                </label>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="h-16 px-4 py-4 border-2 border-input bg-gray-50 rounded-lg flex items-center text-xl font-bold text-muted-foreground">
                    {isCalculating ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Calculating...</span>
                      </div>
                    ) : calculation ? (
                      calculatorMode === 'send' 
                        ? calculation.receiveAmount.toLocaleString()
                        : calculation.sendAmount.toLocaleString()
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
                      <SelectTrigger className="h-16 border-2">
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
                      <SelectTrigger className="h-16 border-2">
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

            {/* Calculation Results */}
            {calculation && !isCalculating && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="space-y-4">
                  {/* Recipient Amount Highlight */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{SUPPORTED_CURRENCIES[receiveCurrency].flag}</span>
                        <span className="text-sm font-medium text-green-700">Recipient gets</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-700">
                          {calculation.receiveAmount.toLocaleString()} {receiveCurrency}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Exchange Rate */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Exchange rate</span>
                    <div className="text-right">
                      <span className="text-lg font-bold text-blue-600">
                        {calculation.exchangeRate.toFixed(sendCurrency === receiveCurrency ? 5 : 4)}
                      </span>
                      <p className="text-xs text-gray-500">1 {sendCurrency} = {calculation.exchangeRate.toFixed(sendCurrency === receiveCurrency ? 5 : 4)} {receiveCurrency}</p>
                    </div>
                  </div>
                  
                  {/* Fee Breakdown */}
                  <div className="border-t border-blue-200 pt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Card processing (2.9%)</span>
                      <span className="font-medium">{calculation.breakdown.fees.cardProcessing.toLocaleString()} {sendCurrency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Transfer fee</span>
                      <span className="font-medium">{calculation.breakdown.fees.transfer.toLocaleString()} {sendCurrency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Payout fee (1%)</span>
                      <span className="font-medium">{calculation.breakdown.fees.payout.toLocaleString()} {sendCurrency}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-blue-200 pt-2">
                      <span className="text-gray-600 font-medium">Total fees</span>
                      <span className="font-bold">{calculation.fees.toLocaleString()} {sendCurrency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Processing time</span>
                      <span className="font-medium text-green-600">2-5 minutes</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-blue-200 pt-4 flex justify-between">
                    <span className="font-bold text-gray-900">Total you pay</span>
                    <span className="font-bold text-xl text-gray-900">
                      {(calculation.sendAmount + calculation.fees).toLocaleString()} {sendCurrency}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!paymentAmount && !isCalculating && (
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
                    <span>Real-time fee calculation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                    <span>Transparent fee breakdown</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                    <span>Fast domestic transfers</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Payment method</label>
              <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
                <div className="flex items-center gap-3">
                  <CreditCard className="text-green-600 w-6 h-6" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Banco de Chile</p>
                    <p className="text-sm text-gray-600">Cuenta Corriente •••• 1234</p>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-300 bg-green-100">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <Button 
              onClick={handlePayment} 
              disabled={!calculation || !paymentAmount}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {calculation ? (
                <>
                  Send {calculation.sendAmount.toLocaleString()} {sendCurrency}
                  <Send className="ml-2 h-5 w-5" />
                </>
              ) : (
                <>
                  Enter amount to continue
                  <Send className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            {paymentAmount && parseFloat(paymentAmount) > 0 && parseFloat(paymentAmount) < SUPPORTED_CURRENCIES[calculatorMode === 'send' ? sendCurrency : receiveCurrency].minAmount && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600 text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Minimum transfer amount is {SUPPORTED_CURRENCIES[calculatorMode === 'send' ? sendCurrency : receiveCurrency].minAmount.toLocaleString()} {calculatorMode === 'send' ? sendCurrency : receiveCurrency}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderResultsStep = () => (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isProcessing ? (
            <Clock className="text-yellow-500 animate-spin" />
          ) : (
            <CheckCircle className="text-green-500" />
          )}
          {isProcessing ? 'Processing Transfer...' : 'Transfer Completed Successfully!'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isProcessing ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-yellow-600 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-yellow-800 mb-2">Processing Your Transfer</h3>
              <p className="text-yellow-600">Please wait while we securely process your payment</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Payment authorized</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Funds debited from your account</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Transferring to recipient...</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-green-800 mb-2">Payment Successful!</h3>
            <p className="text-green-600">Your money has been sent successfully</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Transaction Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Transaction ID:</span>
                <span className="font-mono">TXN-CLP-{Date.now().toString().slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Sent:</span>
                <span className="font-semibold">{paymentAmount ? parseInt(paymentAmount).toLocaleString() : '0'} CLP</span>
              </div>
              <div className="flex justify-between">
                <span>Transfer Fee:</span>
                <span>2,500 CLP</span>
              </div>
              <div className="flex justify-between">
                <span>Total Charged:</span>
                <span className="font-bold">{paymentAmount ? (parseInt(paymentAmount) + 2500).toLocaleString() : '0'} CLP</span>
              </div>
              <div className="flex justify-between">
                <span>Recipient:</span>
                <span>{selectedUser?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant="outline" className="text-green-600">Completed</Badge>
              </div>
              <div className="flex justify-between">
                <span>Completed At:</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">What's Next?</h3>
            <ul className="text-sm text-blue-600 space-y-1">
              <li>• {selectedUser?.name} will receive a notification</li>
              <li>• Funds will be available in their account within 2-5 minutes</li>
              <li>• You'll receive an email confirmation shortly</li>
              <li>• Track this transfer in your transaction history</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1">
            View Receipt
          </Button>
          <Button 
            onClick={() => {
              setCurrentStep('verification');
              setSelectedUser(null);
              setPaymentAmount('');
              setVerificationProgress(0);
              setSearchQuery('');
              setShowUsers(false);
              setFilteredUsers([]);
            }}
            className="flex-1"
          >
            Send Another Transfer
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'verification':
        return renderVerificationStep();
      case 'selection':
        return renderSelectionStep();
      case 'payment':
        return renderPaymentStep();
      case 'results':
        return renderResultsStep();
      default:
        return renderVerificationStep();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Stealth Money MVP Demo
          </h1>
          <p className="text-gray-600">
            Complete Payment Flow - From Account Creation to Final Results
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          {canGoBack() && (
            <div className="mb-4">
              <Button 
                variant="ghost" 
                onClick={handleGoBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>
          )}
          <div className="flex justify-between items-center mb-4">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = getCurrentStepIndex() > index;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isActive 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    <StepIcon className="w-6 h-6" />
                  </div>
                  <span className={`text-xs text-center ${
                    isActive ? 'text-blue-600 font-semibold' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress value={progressPercentage} className="w-full" />
        </div>

        {/* Current Step Content */}
        <div className="flex justify-center">
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
}
