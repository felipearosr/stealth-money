// src/components/features/BankAccountOnboarding.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Plus, Trash2, Edit } from 'lucide-react';

interface BankAccount {
  id: string;
  accountName: string;
  currency: string;
  country: string;
  bankName: string;
  accountHolderName: string;
  accountType?: string;
  isVerified: boolean;
  isPrimary: boolean;
  isActive: boolean;
  // Currency-specific fields
  iban?: string;
  bic?: string;
  routingNumber?: string;
  accountNumber?: string;
  rut?: string;
  bankCode?: string;
  clabe?: string;
  sortCode?: string;
  ukAccountNumber?: string;
  createdAt: string;
  updatedAt: string;
}

interface BankAccountFormData {
  accountName: string;
  currency: string;
  bankName: string;
  accountHolderName: string;
  accountType: string;
  isPrimary: boolean;
  // Currency-specific fields
  iban?: string;
  bic?: string;
  routingNumber?: string;
  accountNumber?: string;
  rut?: string;
  bankCode?: string;
  clabe?: string;
  sortCode?: string;
  ukAccountNumber?: string;
}

const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', country: 'US' },
  { code: 'EUR', name: 'Euro', country: 'DE' },
  { code: 'CLP', name: 'Chilean Peso', country: 'CL' },
  { code: 'MXN', name: 'Mexican Peso', country: 'MX' },
  { code: 'GBP', name: 'British Pound', country: 'GB' }
];

const CURRENCY_CONFIGS = {
  USD: {
    requiredFields: ['routingNumber', 'accountNumber'],
    fieldLabels: {
      routingNumber: 'Routing Number',
      accountNumber: 'Account Number'
    },
    accountTypes: ['checking', 'savings']
  },
  EUR: {
    requiredFields: ['iban', 'bic'],
    fieldLabels: {
      iban: 'IBAN',
      bic: 'BIC/SWIFT Code'
    },
    accountTypes: ['checking', 'savings']
  },
  CLP: {
    requiredFields: ['rut', 'bankCode', 'accountNumber'],
    fieldLabels: {
      rut: 'RUT',
      bankCode: 'Bank Code',
      accountNumber: 'Account Number'
    },
    accountTypes: ['checking', 'savings']
  },
  MXN: {
    requiredFields: ['clabe'],
    fieldLabels: {
      clabe: 'CLABE'
    },
    accountTypes: ['checking', 'savings']
  },
  GBP: {
    requiredFields: ['sortCode', 'ukAccountNumber'],
    fieldLabels: {
      sortCode: 'Sort Code',
      ukAccountNumber: 'Account Number'
    },
    accountTypes: ['checking', 'savings']
  }
};

interface BankAccountOnboardingProps {
  onComplete?: () => void;
  onSkip?: () => void;
  requireVerification?: boolean;
}

export default function BankAccountOnboarding({ 
  onComplete, 
  onSkip, 
  requireVerification = false 
}: BankAccountOnboardingProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState<BankAccountFormData>({
    accountName: '',
    currency: '',
    bankName: '',
    accountHolderName: '',
    accountType: 'checking',
    isPrimary: false
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users/me/bank-accounts', {
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if needed
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBankAccounts(data.bankAccounts || []);
      } else {
        console.error('Failed to fetch bank accounts');
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.accountName.trim()) {
      errors.accountName = 'Account name is required';
    }

    if (!formData.currency) {
      errors.currency = 'Currency is required';
    }

    if (!formData.bankName.trim()) {
      errors.bankName = 'Bank name is required';
    }

    if (!formData.accountHolderName.trim()) {
      errors.accountHolderName = 'Account holder name is required';
    }

    // Validate currency-specific fields
    if (formData.currency && CURRENCY_CONFIGS[formData.currency as keyof typeof CURRENCY_CONFIGS]) {
      const config = CURRENCY_CONFIGS[formData.currency as keyof typeof CURRENCY_CONFIGS];
      
      for (const field of config.requiredFields) {
        if (!formData[field as keyof BankAccountFormData]) {
          errors[field] = `${config.fieldLabels[field as keyof typeof config.fieldLabels]} is required`;
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const url = editingAccount 
        ? `/api/users/me/bank-accounts/${editingAccount.id}`
        : '/api/users/me/bank-accounts';
      
      const method = editingAccount ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if needed
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchBankAccounts();
        resetForm();
        setShowAddForm(false);
        setEditingAccount(null);
      } else {
        const errorData = await response.json();
        console.error('Failed to save bank account:', errorData);
        // Handle specific error messages
        if (errorData.message) {
          setFormErrors({ general: errorData.message });
        }
      }
    } catch (error) {
      console.error('Error saving bank account:', error);
      setFormErrors({ general: 'Failed to save bank account. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/me/bank-accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if needed
        }
      });

      if (response.ok) {
        await fetchBankAccounts();
      } else {
        console.error('Failed to delete bank account');
      }
    } catch (error) {
      console.error('Error deleting bank account:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      accountName: '',
      currency: '',
      bankName: '',
      accountHolderName: '',
      accountType: 'checking',
      isPrimary: false
    });
    setFormErrors({});
  };

  const startEdit = (account: BankAccount) => {
    setFormData({
      accountName: account.accountName,
      currency: account.currency,
      bankName: account.bankName,
      accountHolderName: account.accountHolderName,
      accountType: account.accountType || 'checking',
      isPrimary: account.isPrimary,
      iban: account.iban || '',
      bic: account.bic || '',
      routingNumber: account.routingNumber || '',
      accountNumber: account.accountNumber || '',
      rut: account.rut || '',
      bankCode: account.bankCode || '',
      clabe: account.clabe || '',
      sortCode: account.sortCode || '',
      ukAccountNumber: account.ukAccountNumber || ''
    });
    setEditingAccount(account);
    setShowAddForm(true);
  };

  const renderCurrencySpecificFields = () => {
    if (!formData.currency || !CURRENCY_CONFIGS[formData.currency as keyof typeof CURRENCY_CONFIGS]) {
      return null;
    }

    const config = CURRENCY_CONFIGS[formData.currency as keyof typeof CURRENCY_CONFIGS];

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-gray-700">
          {formData.currency} Account Details
        </h4>
        {config.requiredFields.map((field) => (
          <div key={field}>
            <Label htmlFor={field}>
              {config.fieldLabels[field as keyof typeof config.fieldLabels]}
            </Label>
            <Input
              id={field}
              value={formData[field as keyof BankAccountFormData] as string || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
              className={formErrors[field] ? 'border-red-500' : ''}
            />
            {formErrors[field] && (
              <p className="text-sm text-red-500 mt-1">{formErrors[field]}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const hasVerifiedAccount = bankAccounts.some(account => account.isVerified);
  const canProceed = !requireVerification || hasVerifiedAccount || bankAccounts.length > 0;

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">Loading bank accounts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Bank Account Setup
            {hasVerifiedAccount && <CheckCircle className="h-5 w-5 text-green-500" />}
          </CardTitle>
          <CardDescription>
            {requireVerification 
              ? "You need at least one verified bank account to send and receive transfers."
              : "Add your bank accounts to enable transfers in different currencies."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Bank Accounts */}
          {bankAccounts.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Your Bank Accounts</h3>
              {bankAccounts.map((account) => (
                <div key={account.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{account.accountName}</h4>
                      <Badge variant={account.isPrimary ? "default" : "secondary"}>
                        {account.currency}
                      </Badge>
                      {account.isPrimary && (
                        <Badge variant="outline">Primary</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {account.isVerified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(account)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(account.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>{account.bankName} • {account.accountHolderName}</p>
                    <p>Status: {account.isVerified ? 'Verified' : 'Pending Verification'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Account Button */}
          {!showAddForm && (
            <Button
              onClick={() => {
                resetForm();
                setShowAddForm(true);
              }}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Bank Account
            </Button>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {formErrors.general && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{formErrors.general}</p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      value={formData.accountName}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                      placeholder="e.g., My Primary USD Account"
                      className={formErrors.accountName ? 'border-red-500' : ''}
                    />
                    {formErrors.accountName && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.accountName}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger className={formErrors.currency ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.currency && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.currency}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                      placeholder="e.g., Chase Bank"
                      className={formErrors.bankName ? 'border-red-500' : ''}
                    />
                    {formErrors.bankName && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.bankName}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="accountHolderName">Account Holder Name</Label>
                    <Input
                      id="accountHolderName"
                      value={formData.accountHolderName}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountHolderName: e.target.value }))}
                      placeholder="Full name as it appears on the account"
                      className={formErrors.accountHolderName ? 'border-red-500' : ''}
                    />
                    {formErrors.accountHolderName && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.accountHolderName}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="accountType">Account Type</Label>
                    <Select
                      value={formData.accountType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, accountType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {renderCurrencySpecificFields()}

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPrimary"
                      checked={formData.isPrimary}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPrimary: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="isPrimary">Set as primary account for this currency</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Saving...' : (editingAccount ? 'Update Account' : 'Add Account')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingAccount(null);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {canProceed && onComplete && (
              <Button onClick={onComplete} className="flex-1">
                {hasVerifiedAccount ? 'Continue' : 'Continue with Unverified Account'}
              </Button>
            )}
            {onSkip && !requireVerification && (
              <Button variant="outline" onClick={onSkip}>
                Skip for Now
              </Button>
            )}
          </div>

          {!canProceed && requireVerification && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-700">
                  You need to add and verify at least one bank account before you can proceed.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}