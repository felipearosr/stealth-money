"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, RefreshCw, DollarSign } from 'lucide-react';

interface BankAccount {
  id: string;
  accountName: string;
  currency: string;
  bankName: string;
  accountHolderName: string;
  isVerified: boolean;
  verificationMethod?: string;
  verificationStartedAt?: string;
  verificationFailures: number;
  accountNumber?: string;
  iban?: string;
  country: string;
}

interface VerificationProps {
  account: BankAccount;
  onVerificationComplete: (accountId: string) => void;
  onSkip?: () => void;
}

export function BankAccountVerification({ account, onVerificationComplete, onSkip }: VerificationProps) {
  const { getToken } = useAuth();
  const [verificationMethod, setVerificationMethod] = useState<'micro_deposits' | 'instant' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Micro-deposit verification state
  const [depositAmounts, setDepositAmounts] = useState(['', '']);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'deposits_sent' | 'verifying' | 'verified' | 'failed'>('pending');

  // Check verification status on component mount
  useEffect(() => {
    if (account.verificationMethod === 'micro_deposits' && account.verificationStartedAt) {
      setVerificationMethod('micro_deposits');
      setVerificationStatus('deposits_sent');
    }
  }, [account]);

  // Start micro-deposit verification
  const startMicroDepositVerification = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/me/bank-accounts/${account.id}/verify/micro-deposits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to start verification');
      }

      setVerificationMethod('micro_deposits');
      setVerificationStatus('deposits_sent');
      setSuccess('Micro-deposits have been sent to your account. They will appear within 1-2 business days.');
    } catch (error) {
      console.error('Micro-deposit verification error:', error);
      setError(error instanceof Error ? error.message : 'Failed to start verification');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify micro-deposit amounts
  const verifyMicroDeposits = async () => {
    if (!depositAmounts[0] || !depositAmounts[1]) {
      setError('Please enter both deposit amounts');
      return;
    }

    setIsLoading(true);
    setError(null);
    setVerificationStatus('verifying');

    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/me/bank-accounts/${account.id}/verify/micro-deposits/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amounts: depositAmounts.map(amount => parseFloat(amount))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Verification failed');
      }

      setVerificationStatus('verified');
      setSuccess('Account verified successfully!');
      
      // Call completion handler after a brief delay
      setTimeout(() => {
        onVerificationComplete(account.id);
      }, 2000);
    } catch (error) {
      console.error('Micro-deposit confirmation error:', error);
      setError(error instanceof Error ? error.message : 'Verification failed');
      setVerificationStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Start instant verification (would integrate with Plaid or similar)
  const startInstantVerification = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // This would integrate with Plaid Link or similar service
      // For now, we'll simulate instant verification
      setSuccess('Instant verification would launch here (Plaid integration)');
      
      // Simulate successful verification
      setTimeout(() => {
        onVerificationComplete(account.id);
      }, 3000);
    } catch (error) {
      console.error('Instant verification error:', error);
      setError('Instant verification is not available for this account');
    } finally {
      setIsLoading(false);
    }
  };

  // Get verification method display info
  const getVerificationMethodInfo = (method: string) => {
    switch (method) {
      case 'micro_deposits':
        return {
          name: 'Micro-Deposits',
          description: 'We send small deposits to verify account ownership',
          icon: <DollarSign className="h-5 w-5" />
        };
      case 'instant':
        return {
          name: 'Instant Verification',
          description: 'Connect securely through your online banking',
          icon: <CheckCircle className="h-5 w-5" />
        };
      default:
        return {
          name: 'Unknown',
          description: 'Unknown verification method',
          icon: <AlertCircle className="h-5 w-5" />
        };
    }
  };

  // Render verification method selection
  const renderMethodSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Verify Your Bank Account</h3>
        <p className="text-gray-600">
          To send and receive money, we need to verify that you own this account.
        </p>
      </div>

      <div className="space-y-3">
        {/* Micro-Deposits Option */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200"
          onClick={() => !isLoading && startMicroDepositVerification()}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Micro-Deposits (Recommended)</h4>
                <p className="text-sm text-gray-600">
                  We'll send 2 small deposits (under $1) to your account. Verify the amounts to complete setup.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Takes 1-2 business days • Most secure method
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instant Verification Option */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200"
          onClick={() => !isLoading && startInstantVerification()}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Instant Verification</h4>
                <p className="text-sm text-gray-600">
                  Connect through your online banking for immediate verification.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Instant setup • Powered by Plaid
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Render micro-deposit entry
  const renderMicroDepositEntry = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Micro-Deposits Sent</h3>
        <p className="text-gray-600">
          We've sent 2 small deposits to your {account.bankName} account ending in {account.accountNumber?.slice(-4) || '****'}.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Check your account statement and enter the exact amounts below.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="deposit1">First Deposit Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <Input
              id="deposit1"
              type="number"
              step="0.01"
              min="0"
              max="1"
              placeholder="0.XX"
              className="pl-8"
              value={depositAmounts[0]}
              onChange={(e) => setDepositAmounts([e.target.value, depositAmounts[1]])}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="deposit2">Second Deposit Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <Input
              id="deposit2"
              type="number"
              step="0.01"
              min="0"
              max="1"
              placeholder="0.XX"
              className="pl-8"
              value={depositAmounts[1]}
              onChange={(e) => setDepositAmounts([depositAmounts[0], e.target.value])}
            />
          </div>
        </div>
      </div>

      <div className="flex space-x-3">
        <Button
          onClick={verifyMicroDeposits}
          disabled={isLoading || !depositAmounts[0] || !depositAmounts[1]}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Account'
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setVerificationMethod(null);
            setVerificationStatus('pending');
            setDepositAmounts(['', '']);
          }}
        >
          Back
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <p className="text-blue-800">
          <strong>Can't find the deposits?</strong> They may take up to 2 business days to appear. 
          Look for deposits from "Stealth Money" or "SM Verify" in your transaction history.
        </p>
      </div>
    </div>
  );

  // Render verification success
  const renderSuccess = () => (
    <div className="text-center space-y-4">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
      <h3 className="text-xl font-semibold text-green-700">Account Verified!</h3>
      <p className="text-gray-600">
        Your {account.bankName} account has been successfully verified. You can now send and receive money.
      </p>
      <Badge className="bg-green-100 text-green-800">
        Verified {account.verificationMethod && getVerificationMethodInfo(account.verificationMethod).name}
      </Badge>
    </div>
  );

  // Render verification failed
  const renderFailed = () => (
    <div className="text-center space-y-4">
      <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
      <h3 className="text-xl font-semibold text-red-700">Verification Failed</h3>
      <p className="text-gray-600">
        The amounts you entered don't match our records. Please check your account statement and try again.
      </p>
      <p className="text-sm text-gray-500">
        Attempts remaining: {3 - account.verificationFailures}
      </p>
      <div className="flex space-x-3 justify-center">
        <Button
          onClick={() => {
            setVerificationStatus('deposits_sent');
            setDepositAmounts(['', '']);
            setError(null);
          }}
          disabled={account.verificationFailures >= 3}
        >
          Try Again
        </Button>
        {account.verificationFailures >= 3 && (
          <Button variant="outline" onClick={() => setVerificationMethod(null)}>
            Choose Different Method
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            {account.isVerified ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Clock className="h-5 w-5 text-yellow-500" />
            )}
            <span>
              {account.accountName} ({account.currency})
            </span>
          </div>
        </CardTitle>
        <div className="text-sm text-gray-600">
          {account.bankName} • {account.accountHolderName}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Verification Error</span>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Success</span>
            </div>
            <p className="text-green-600 mt-1">{success}</p>
          </div>
        )}

        {/* Main Content */}
        {account.isVerified ? (
          renderSuccess()
        ) : verificationStatus === 'failed' ? (
          renderFailed()
        ) : verificationStatus === 'deposits_sent' ? (
          renderMicroDepositEntry()
        ) : verificationStatus === 'verified' ? (
          renderSuccess()
        ) : (
          renderMethodSelection()
        )}

        {/* Skip Option */}
        {onSkip && !account.isVerified && verificationStatus === 'pending' && (
          <div className="pt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                You can verify this account later, but you won't be able to send or receive money until it's verified.
              </p>
              <Button variant="outline" onClick={onSkip}>
                Skip for Now
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}