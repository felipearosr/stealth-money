"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  User, 
  CreditCard, 
  Send, 
  ArrowRight, 
  Shield, 
  Globe,
  DollarSign,
  Clock,
  AlertCircle
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

  const steps = [
    { id: 'verification', title: 'Bank Verification', icon: Shield },
    { id: 'selection', title: 'Select Recipient', icon: Globe },
    { id: 'payment', title: 'Payment Process', icon: CreditCard },
    { id: 'results', title: 'Results', icon: CheckCircle }
  ];

  const verificationSteps = [
    'Connecting to Chilean banking network...',
    'Validating RUT with Registro Civil...',
    'Verifying account ownership with bank...',
    'Checking account status and permissions...',
    'Confirming transaction capabilities...',
    'Finalizing security protocols...',
    'Bank account successfully verified!'
  ];

  const getCurrentStepIndex = () => steps.findIndex(step => step.id === currentStep);
  const progressPercentage = ((getCurrentStepIndex() + 1) / steps.length) * 100;

  const handleVerification = () => {
    setIsProcessing(true);
    setVerificationProgress(0);
    setVerificationMessages([]);
    setCurrentMessageIndex(0);
    
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex(prev => {
        if (prev < verificationSteps.length - 1) {
          setVerificationMessages(msgs => [...msgs, verificationSteps[prev]]);
          return prev + 1;
        }
        clearInterval(messageInterval);
        return prev;
      });
    }, 1200);
    
    const progressInterval = setInterval(() => {
      setVerificationProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsProcessing(false);
          setTimeout(() => setCurrentStep('selection'), 1500);
          return 100;
        }
        return prev + (100 / verificationSteps.length);
      });
    }, 1200);
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

  const handlePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCurrentStep('results');
    }, 3000);
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
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-800">Chilean Bank Verification</h3>
              <p className="text-blue-600">We'll verify your Chilean bank account for CLP transactions</p>
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

        {isProcessing && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="space-y-2">
                {verificationMessages.map((message, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-blue-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{message}</span>
                  </div>
                ))}
                {currentMessageIndex < verificationSteps.length - 1 && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>{verificationSteps[currentMessageIndex]}</span>
                  </div>
                )}
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

        <Button 
          onClick={handleVerification} 
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? 'Verifying...' : 'Verify Bank Account'}
          {!isProcessing && <Shield className="ml-2 h-4 w-4" />}
        </Button>
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
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="text-green-500" />
          Transfer Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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

        {/* Calculator Interface */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">You send</label>
              <div className="relative">
                <input 
                  type="number" 
                  placeholder="50,000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-3 pr-16 border rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-gray-500">
                  CLP
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">They receive</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={paymentAmount ? (parseInt(paymentAmount) - 2500).toLocaleString() : '0'}
                  readOnly
                  className="w-full p-3 pr-16 border rounded-lg text-lg font-semibold bg-gray-50 text-gray-700"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-gray-500">
                  CLP
                </div>
              </div>
            </div>
          </div>

          {/* Exchange Rate Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Exchange rate</span>
              <span className="text-sm font-semibold text-blue-600">1 USD = 950.00 CLP</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Transfer fee</span>
                <span className="font-medium">2,500 CLP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Processing time</span>
                <span className="font-medium">2-5 minutes</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Total cost</span>
                <span className="font-bold text-lg text-gray-900">
                  {paymentAmount ? parseInt(paymentAmount).toLocaleString() : '0'} CLP
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Payment method</label>
            <div className="p-3 border rounded-lg bg-white">
              <div className="flex items-center gap-3">
                <CreditCard className="text-blue-500 w-5 h-5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Banco de Chile</p>
                  <p className="text-sm text-gray-600">Cuenta Corriente •••• 1234</p>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-200">Verified</Badge>
              </div>
            </div>
          </div>
        </div>

        <Button 
          onClick={handlePayment} 
          disabled={!paymentAmount || parseInt(paymentAmount) < 1000}
          className="w-full h-12 text-lg font-semibold"
        >
          Send {paymentAmount ? parseInt(paymentAmount).toLocaleString() : '0'} CLP
          <Send className="ml-2 h-5 w-5" />
        </Button>

        {parseInt(paymentAmount || '0') > 0 && parseInt(paymentAmount || '0') < 1000 && (
          <p className="text-sm text-red-600 text-center">Minimum transfer amount is 1,000 CLP</p>
        )}
      </CardContent>
    </Card>
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
