// src/components/features/BankAccountOnboardingV2.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@clerk/nextjs';
import { CheckCircle, AlertCircle, Plus, Trash2, Edit, Globe, Building2, CreditCard, User } from 'lucide-react';
import { BankAccountVerification } from './BankAccountVerification';
import { 
  COUNTRY_BANKING_CONFIGS, 
  validateIBAN, 
  validateCLABE,
  validateUSRoutingNumber,
  validateUKSortCode,
  formatSortCode,
  type Bank
} from '@/lib/bank-config';
import { 
  validateRUT, 
  formatRUTInput, 
  getRUTValidationError
} from '@/lib/chilean-utils';

interface BankAccount {
  id: string;
  accountName: string;
  currency: string;
  country: string;
  bankName: string;
  bankCode?: string;
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
  clabe?: string;
  sortCode?: string;
  ukAccountNumber?: string;
  createdAt: string;
  updatedAt: string;
}

interface BankAccountFormData {
  accountName: string;
  country: string;
  bankId: string;
  accountHolderName: string;
  accountType: string;
  isPrimary: boolean;
  // Dynamic fields based on country
  [key: string]: string | boolean;
}

interface BankAccountOnboardingV2Props {
  onComplete?: () => void;
  onSkip?: () => void;
  requireVerification?: boolean;
  onAccountAdded?: () => void; // New callback for when account is added (not necessarily verified)
}

export default function BankAccountOnboardingV2({ 
  onComplete, 
  onSkip, 
  requireVerification = false,
  onAccountAdded
}: BankAccountOnboardingV2Props) {
  const { getToken } = useAuth();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [formData, setFormData] = useState<BankAccountFormData>({
    accountName: '',
    country: '',
    bankId: '',
    accountHolderName: '',
    accountType: '',
    isPrimary: false
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [verifyingAccount, setVerifyingAccount] = useState<BankAccount | null>(null);

  // Get country configuration
  const countryConfig = selectedCountry ? COUNTRY_BANKING_CONFIGS[selectedCountry] : null;

  // Fetch existing bank accounts
  const fetchBankAccounts = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/me/bank-accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        // Handle both response formats: array or { bankAccounts: [...] }
        const accounts = responseData.bankAccounts || responseData;
        setBankAccounts(Array.isArray(accounts) ? accounts : []);
      } else {
        setBankAccounts([]);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      setBankAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  // Handle country selection
  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setSelectedBank(null);
    const config = COUNTRY_BANKING_CONFIGS[countryCode];
    
    // Reset form data with country-specific defaults
    setFormData({
      accountName: '',
      country: countryCode,
      bankId: '',
      accountHolderName: '',
      accountType: config?.accountTypes[0]?.value || '',
      isPrimary: !Array.isArray(bankAccounts) || bankAccounts.length === 0
    });
    setFormErrors({});
  };

  // Handle bank selection
  const handleBankChange = (bankId: string) => {
    if (!countryConfig) return;
    
    const bank = countryConfig.banks.find(b => b.id === bankId);
    setSelectedBank(bank || null);
    setFormData(prev => ({ ...prev, bankId }));
  };

  // Validate form fields
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.accountName.trim()) {
      errors.accountName = 'Account name is required';
    }

    if (!selectedCountry) {
      errors.country = 'Please select a country';
    }

    if (!selectedBank) {
      errors.bankId = 'Please select a bank';
    }

    if (!formData.accountHolderName.trim()) {
      errors.accountHolderName = 'Account holder name is required';
    }

    if (!formData.accountType) {
      errors.accountType = 'Account type is required';
    }

    // Validate country-specific fields
    if (countryConfig) {
      for (const field of countryConfig.requiredFields) {
        const value = formData[field.field];
        
        if (!value || typeof value !== 'string' || !value.trim()) {
          errors[field.field] = `${field.label} is required`;
          continue;
        }

        // Field-specific validation
        switch (field.validation) {
          case 'Chilean RUT':
            if (!validateRUT(value)) {
              errors[field.field] = getRUTValidationError(value);
            }
            break;
          case 'IBAN':
            if (!validateIBAN(value)) {
              errors[field.field] = 'Invalid IBAN format';
            }
            break;
          case 'CLABE':
            if (!validateCLABE(value)) {
              errors[field.field] = 'CLABE must be 18 digits';
            }
            break;
          case 'US Routing Number':
            if (!validateUSRoutingNumber(value)) {
              errors[field.field] = 'Routing number must be 9 digits';
            }
            break;
          case 'UK Sort Code':
            if (!validateUKSortCode(value)) {
              errors[field.field] = 'Sort code must be 6 digits';
            }
            break;
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !selectedBank || !countryConfig) {
      return;
    }

    setSubmitting(true);

    try {
      const token = await getToken();
      
      // Prepare submission data
      const submissionData: any = {
        accountName: formData.accountName,
        currency: countryConfig.currency,
        country: selectedCountry,
        bankName: selectedBank.name,
        bankCode: selectedBank.code,
        accountHolderName: formData.accountHolderName,
        accountType: formData.accountType,
        isPrimary: formData.isPrimary
      };

      // Add country-specific fields
      countryConfig.requiredFields.forEach(field => {
        if (formData[field.field]) {
          submissionData[field.field] = formData[field.field];
        }
      });

      const url = editingAccount 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/me/bank-accounts/${editingAccount.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/me/bank-accounts`;
      
      const method = editingAccount ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
        const createdAccount = await response.json();
        console.log('Bank account created successfully:', createdAccount);
        
        await fetchBankAccounts();
        resetForm();
        setShowAddForm(false);
        setEditingAccount(null);
        
        // Show success message
        setSuccessMessage(`✅ ${createdAccount.bankName} account added successfully! Verification required to start sending money.`);
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
        
        // Notify parent that an account was added (triggers state refresh)
        if (onAccountAdded) {
          onAccountAdded();
        }
        
        console.log('Bank account creation completed, form closed');
      } else {
        const errorData = await response.json();
        console.error('Failed to save bank account:', errorData);
        setFormErrors({ general: errorData.message || 'Failed to save bank account' });
      }
    } catch (error) {
      console.error('Error saving bank account:', error);
      setFormErrors({ general: 'Failed to save bank account. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle account deletion
  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) {
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/me/bank-accounts/${accountId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        await fetchBankAccounts();
      } else {
        console.error('Failed to delete bank account');
      }
    } catch (error) {
      console.error('Error deleting bank account:', error);
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedCountry('');
    setSelectedBank(null);
    setFormData({
      accountName: '',
      country: '',
      bankId: '',
      accountHolderName: '',
      accountType: '',
      isPrimary: false
    });
    setFormErrors({});
    setSuccessMessage(''); // Clear success message when starting new form
  };

  // Start editing an account
  const startEdit = (account: BankAccount) => {
    const countryCode = account.country;
    const config = COUNTRY_BANKING_CONFIGS[countryCode];
    const bank = config?.banks.find(b => b.code === account.bankCode);

    setSelectedCountry(countryCode);
    setSelectedBank(bank || null);
    
    const editData: BankAccountFormData = {
      accountName: account.accountName,
      country: countryCode,
      bankId: bank?.id || '',
      accountHolderName: account.accountHolderName,
      accountType: account.accountType || '',
      isPrimary: account.isPrimary
    };

    // Add existing field values
    if (account.iban) editData.iban = account.iban;
    if (account.accountNumber) editData.accountNumber = account.accountNumber;
    if (account.routingNumber) editData.routingNumber = account.routingNumber;
    if (account.rut) editData.rut = account.rut;
    if (account.clabe) editData.clabe = account.clabe;
    if (account.sortCode) editData.sortCode = account.sortCode;
    if (account.ukAccountNumber) editData.ukAccountNumber = account.ukAccountNumber;

    setFormData(editData);
    setEditingAccount(account);
    setShowAddForm(true);
  };

  // Render country-specific form fields
  const renderCountrySpecificFields = () => {
    if (!countryConfig) return null;

    return countryConfig.requiredFields.map(field => (
      <div key={field.field}>
        <Label htmlFor={field.field}>{field.label}</Label>
        <Input
          id={field.field}
          type={field.type}
          value={String(formData[field.field] || '')}
          onChange={(e) => {
            let value = e.target.value;
            
            // Apply formatting for specific fields
            if (field.field === 'rut') {
              value = formatRUTInput(value, String(formData[field.field] || ''));
            } else if (field.field === 'sortCode') {
              value = formatSortCode(value);
            }
            
            setFormData(prev => ({ ...prev, [field.field]: value }));
          }}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          className={formErrors[field.field] ? 'border-red-500' : ''}
        />
        {formErrors[field.field] && (
          <p className="text-sm text-red-500 mt-1">{formErrors[field.field]}</p>
        )}
      </div>
    ));
  };

  const hasVerifiedAccount = Array.isArray(bankAccounts) && bankAccounts.some(acc => acc.isVerified);
  const hasUnverifiedAccounts = Array.isArray(bankAccounts) && bankAccounts.length > 0 && !hasVerifiedAccount;

  // Handle verification completion
  const handleVerificationComplete = async (accountId: string) => {
    console.log('Verification completed for account:', accountId);
    setVerifyingAccount(null);
    await fetchBankAccounts(); // Refresh accounts to show updated verification status
    
    // Check if this completes the onboarding process
    const updatedAccounts = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/me/bank-accounts`, {
      headers: { 'Authorization': `Bearer ${await getToken()}` }
    });
    
    if (updatedAccounts.ok) {
      const responseData = await updatedAccounts.json();
      const accounts = responseData.bankAccounts || responseData;
      const hasVerified = Array.isArray(accounts) && accounts.some((acc: BankAccount) => acc.isVerified);
      
      if (hasVerified && onComplete) {
        console.log('All requirements met, calling onComplete');
        onComplete();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show verification flow if an account is being verified
  if (verifyingAccount) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Verify Bank Account</h2>
          <p className="text-gray-600">
            Complete verification for {verifyingAccount.bankName} to start sending money.
          </p>
        </div>
        
        <BankAccountVerification
          account={verifyingAccount}
          onVerificationComplete={handleVerificationComplete}
          onSkip={() => setVerifyingAccount(null)}
        />
        
        <Button
          variant="outline"
          onClick={() => setVerifyingAccount(null)}
        >
          ← Back to Account List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">
          {hasUnverifiedAccounts ? 'Verify Your Bank Account' : 'Bank Account Setup'}
        </h2>
        <p className="text-gray-600">
          {hasUnverifiedAccounts 
            ? 'Complete bank account verification to start sending money globally.'
            : 'Add and verify your bank accounts to start sending money globally.'
          }
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-700">
                {successMessage}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Prompt for Unverified Accounts */}
      {hasUnverifiedAccounts && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <AlertCircle className="h-6 w-6 text-blue-600" />
                <span className="text-lg font-semibold text-blue-700">
                  Bank Account Added Successfully!
                </span>
              </div>
              <p className="text-blue-600">
                Your account has been added but needs verification to send money. 
                Click "Verify Account" below to start the verification process.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Summary */}
      {Array.isArray(bankAccounts) && bankAccounts.length > 0 && (
        <Card className={hasVerifiedAccount ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              {hasVerifiedAccount ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-700">
                    You have {bankAccounts.filter(acc => acc.isVerified).length} verified account(s)
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-700">
                    Verification required for your bank account(s)
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Accounts */}
      {Array.isArray(bankAccounts) && bankAccounts.length > 0 && (
        <div className="space-y-3">
          {bankAccounts.map((account) => (
            <Card key={account.id} className="relative">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Building2 className="h-8 w-8 text-gray-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{account.accountName}</h4>
                        {account.isPrimary && (
                          <Badge variant="secondary">Primary</Badge>
                        )}
                        <Badge variant={account.isVerified ? 'default' : 'outline'}>
                          {account.isVerified ? 'Verified' : 'Pending'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {account.bankName} • {account.currency} • 
                        {account.accountType === 'checking' ? ' Checking' : ' Savings'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {COUNTRY_BANKING_CONFIGS[account.country]?.countryName}
                      </p>
                      {!account.isVerified && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Verification required to send money
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!account.isVerified && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-500 text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          setVerifyingAccount(account);
                        }}
                      >
                        Verify Account
                      </Button>
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
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Account Button */}
      {!showAddForm && (
        <div className="flex gap-3">
          <Button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="flex-1"
            variant={hasUnverifiedAccounts ? "ghost" : "outline"}
          >
            <Plus className="h-4 w-4 mr-2" />
            {hasUnverifiedAccounts ? "Add Another Account" : "Add Bank Account"}
          </Button>
          
          {onSkip && !requireVerification && !hasUnverifiedAccounts && (
            <Button
              onClick={onSkip}
              variant="ghost"
            >
              Skip for now
            </Button>
          )}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}
            </CardTitle>
            <CardDescription>
              Select your country first, then choose your bank and provide account details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {formErrors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{formErrors.general}</p>
                </div>
              )}

              {/* Step 1: Country Selection */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Globe className="h-4 w-4" />
                  <span>Step 1: Select Your Country</span>
                </div>
                
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={selectedCountry}
                    onValueChange={handleCountryChange}
                  >
                    <SelectTrigger className={formErrors.country ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Choose your country" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(COUNTRY_BANKING_CONFIGS)
                        .sort((a, b) => a.countryName.localeCompare(b.countryName))
                        .map((config) => (
                          <SelectItem key={config.countryCode} value={config.countryCode}>
                            <span className="flex items-center gap-2">
                              <span>{config.flag}</span>
                              <span>{config.countryName}</span>
                              <span className="text-gray-500">({config.currency})</span>
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {formErrors.country && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.country}</p>
                  )}
                </div>
              </div>

              {/* Step 2: Bank Selection */}
              {selectedCountry && countryConfig && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Building2 className="h-4 w-4" />
                    <span>Step 2: Select Your Bank</span>
                  </div>
                  
                  <div>
                    <Label htmlFor="bank">Bank</Label>
                    <Select
                      value={formData.bankId}
                      onValueChange={handleBankChange}
                    >
                      <SelectTrigger className={formErrors.bankId ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Choose your bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryConfig.banks.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.bankId && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.bankId}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="accountType">Account Type</Label>
                    <Select
                      value={formData.accountType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, accountType: value }))}
                    >
                      <SelectTrigger className={formErrors.accountType ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryConfig.accountTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.accountType && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.accountType}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Account Details */}
              {selectedBank && countryConfig && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <CreditCard className="h-4 w-4" />
                    <span>Step 3: Account Details</span>
                  </div>

                  <div>
                    <Label htmlFor="accountName">Account Nickname</Label>
                    <Input
                      id="accountName"
                      value={formData.accountName}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                      placeholder="e.g., My Chilean Account"
                      className={formErrors.accountName ? 'border-red-500' : ''}
                    />
                    {formErrors.accountName && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.accountName}</p>
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

                  {/* Country-specific fields */}
                  {renderCountrySpecificFields()}

                  {/* Primary Account Toggle */}
                  {Array.isArray(bankAccounts) && bankAccounts.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isPrimary"
                        checked={formData.isPrimary}
                        onChange={(e) => setFormData(prev => ({ ...prev, isPrimary: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="isPrimary" className="text-sm font-normal">
                        Set as primary account for {countryConfig.currency}
                      </Label>
                    </div>
                  )}
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-3">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    editingAccount ? 'Update Account' : 'Add Account'
                  )}
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
    </div>
  );
}