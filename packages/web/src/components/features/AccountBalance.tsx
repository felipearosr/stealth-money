"use client";

import { useUser, useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wallet, ArrowDown, ArrowUp } from 'lucide-react';

interface AccountBalance {
  totalReceived: number;
  availableBalance: number;
  pendingAmount: number;
  currency: string;
  recentTransactions: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    senderName?: string;
    createdAt: string;
  }[];
}

export function AccountBalance() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!isSignedIn) {
        setIsLoading(false);
        return;
      }

      try {
        const token = await getToken();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/account/balance`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch account balance');
        }

        const data = await response.json();
        setBalance(data);
      } catch (err) {
        setError('Failed to load account balance');
        console.error('Balance fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded) {
      fetchBalance();
    }
  }, [isLoaded, isSignedIn, user]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!isSignedIn) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Wallet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sign In to View Balance</h3>
          <p className="text-gray-600">Create an account to receive money and track your balance.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading account balance...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Balance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="h-5 w-5 mr-2" />
            Your Stealth Money Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {balance ? formatCurrency(balance.availableBalance, balance.currency) : '$0.00'}
              </div>
              <div className="text-sm text-gray-600">Available Balance</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {balance ? formatCurrency(balance.pendingAmount, balance.currency) : '$0.00'}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {balance ? formatCurrency(balance.totalReceived, balance.currency) : '$0.00'}
              </div>
              <div className="text-sm text-gray-600">Total Received</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      {balance && balance.recentTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Money Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {balance.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <ArrowDown className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </div>
                      {transaction.senderName && (
                        <div className="text-sm text-gray-600">
                          From: {transaction.senderName}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {formatDate(transaction.createdAt)}
                      </div>
                    </div>
                  </div>
                  <Badge 
                    className={
                      transaction.status === 'COMPLETED' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }
                  >
                    {transaction.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {balance && balance.recentTransactions.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <ArrowDown className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Money Received Yet</h3>
            <p className="text-gray-600 mb-4">
              When someone sends you money through Stealth Money, it will appear here.
            </p>
            <div className="text-sm text-gray-500">
              <p>Share your email address with senders to receive money:</p>
              <p className="font-mono bg-gray-100 p-2 rounded mt-2">
                {user?.emailAddresses[0]?.emailAddress}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 