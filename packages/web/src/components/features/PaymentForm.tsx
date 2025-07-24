"use client";

import { useState } from "react";
import { z } from "zod";
import { CreditCard, User, Building, Loader2, Shield, AlertCircle, ArrowLeft, CheckCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Validation schemas
const cardDetailsSchema = z.object({
  number: z.string().min(13, 'Card number must be at least 13 digits').max(19, 'Card number cannot exceed 19 digits'),
  expiryMonth: z.number().min(1, 'Invalid month').max(12, 'Invalid month'),
  expiryYear: z.number().min(new Date().getFullYear(), 'Card has expired').max(new Date().getFullYear() + 20, 'Invalid year'),
  cvv: z.string().min(3, 'CVV must be at least 3 digits').max(4, 'CVV cannot exceed 4 digits')
});

const userToUserPaymentFormSchema = z.object({
  cardDetails: cardDetailsSchema
});

// Types for user-to-user transfers
interface CardDetails {
  number: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
}

interface UserProfile {
  id: string;
  email: string;
  username?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  profileImageUrl?: string;
  isVerified: boolean;
  supportedCurrencies: string[];
}

interface VerifiedPaymentMethod {
  id: string;
  type: 'bank_account' | 'mobile_wallet' | 'debit_card';
  currency: string;
  bankName?: string;
  accountType?: string;
  lastFourDigits?: string;
  isDefault: boolean;
  verifiedAt: string;
  country: string;
}

interface TransferCalculationData {
  sendAmount: number;
  receiveAmount: number;
  sendCurrency: string;
  receiveCurrency: string;
  exchangeRate: number;
  fees: number;
  rateId: string;
  rateValidUntil: string;
  calculatorMode: 'send' | 'receive';
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
}


// Legacy interface for backward compatibility
interface RecipientInfo {
  name: string;
  email: string;
  bankAccount: {
    iban: string;
    bic: string;
    bankName: string;
    accountHolderName: string;
    country: 'DE';
  };
}

interface PaymentData {
  cardDetails: CardDetails;
  recipientInfo: RecipientInfo;
}

// Enhanced props for user-to-user transfers
interface EnhancedPaymentFormProps {
  transferData: TransferCalculationData;
  recipientUser: UserProfile;
  selectedPaymentMethod: VerifiedPaymentMethod;
  onSuccess: (transferId: string) => void;
  onBack: () => void;
  onError: (error: string) => void;
  isLoading?: boolean;
}

// Chilean-specific interfaces
interface ChileanBankAccount {
  id: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  rut: string;
  accountHolderName: string;
  accountType: 'checking' | 'savings' | 'vista' | 'rut';
  isVerified: boolean;
  isPrimary: boolean;
  currency: 'CLP';
  country: 'CL';
}

interface ChileanTransferData extends TransferCalculationData {
  sendCurrency: 'CLP';
  receiveCurrency: 'CLP';
}

interface ChileanUserProfile extends UserProfile {
  country: 'CL';
  rut?: string;
  supportedCurrencies: ['CLP'];
}

// Legacy props for backward compatibility
interface PaymentFormProps {
  sendAmount: number;
  receiveAmount: number;
  exchangeRate: number;
  fees: number;
  rateId: string;
  onSubmit: (data: PaymentData) => void;
  isLoading?: boolean;
  // Enhanced props for user-to-user transfers
  transferData?: TransferCalculationData;
  recipientUser?: UserProfile;
  selectedPaymentMethod?: VerifiedPaymentMethod;
  onSuccess?: (transferId: string) => void;
  onBack?: () => void;
  onError?: (error: string) => void;
}

export function PaymentForm({ 
  sendAmount, 
  receiveAmount, 
  exchangeRate, 
  fees, 
  rateId,
  onSubmit,
  isLoading = false,
  // Enhanced props for user-to-user transfers
  transferData,
  recipientUser,
  selectedPaymentMethod,
  onSuccess,
  onBack,
  onError
}: PaymentFormProps) {
  
  // Detect if this is a user-to-user transfer
  const isUserToUserTransfer = !!(transferData && recipientUser && selectedPaymentMethod);
  
  // Use enhanced data if available, otherwise fall back to legacy props
  const effectiveTransferData = transferData || {
    sendAmount,
    receiveAmount,
    sendCurrency: 'USD',
    receiveCurrency: 'EUR',
    exchangeRate,
    fees,
    rateId,
    rateValidUntil: '',
    calculatorMode: 'send' as const,
    breakdown: {
      sendAmountUSD: sendAmount,
      fees: {
        cardProcessing: 0,
        transfer: 0,
        payout: 0,
        total: fees,
      },
      netAmountUSD: sendAmount - fees,
      exchangeRate,
      receiveAmount,
    },
    estimatedArrival: '',
  };
  // Form state
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    number: '',
    expiryMonth: 1,
    expiryYear: new Date().getFullYear(),
    cvv: ''
  });

  const [recipientInfo, setRecipientInfo] = useState<RecipientInfo>({
    name: '',
    email: '',
    bankAccount: {
      iban: '',
      bic: '',
      bankName: '',
      accountHolderName: '',
      country: 'DE'
    }
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
    const matches = cleaned.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return cleaned;
    }
  };

  // Format IBAN with spaces
  const formatIBAN = (value: string) => {
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  // Handle card details change
  const handleCardDetailsChange = (field: keyof CardDetails, value: string | number) => {
    setCardDetails(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[`cardDetails.${field}`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`cardDetails.${field}`];
        return newErrors;
      });
    }
  };

  // Handle recipient info change
  const handleRecipientInfoChange = (field: string, value: string) => {
    if (field.startsWith('bankAccount.')) {
      const bankField = field.replace('bankAccount.', '');
      setRecipientInfo(prev => ({
        ...prev,
        bankAccount: {
          ...prev.bankAccount,
          [bankField]: value
        }
      }));
    } else {
      setRecipientInfo(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear validation error for this field
    if (validationErrors[`recipientInfo.${field}`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`recipientInfo.${field}`];
        return newErrors;
      });
    }
  };

  // Get authentication token (placeholder - would integrate with actual auth)
  const getAuthToken = async (): Promise<string> => {
    // This would integrate with Clerk or your auth system
    // For now, return a placeholder
    return 'mock-token';
  };

  // Detect if this is a Chilean transfer
  const isChileanTransfer = effectiveTransferData.sendCurrency === 'CLP' && effectiveTransferData.receiveCurrency === 'CLP';

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    setValidationErrors({});
    setIsProcessing(true);

    try {
      if (isUserToUserTransfer) {
        // User-to-user transfer flow
        const formData = {
          cardDetails: {
            ...cardDetails,
            number: cardDetails.number.replace(/\s/g, '') // Remove spaces for validation
          }
        };

        userToUserPaymentFormSchema.parse(formData);

        // Determine the appropriate API endpoint based on transfer type
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const endpoint = isChileanTransfer 
          ? `${API_URL}/api/transfers/create-chilean-user-transfer`
          : `${API_URL}/api/transfers/create-user-to-user`;

        const requestBody = isChileanTransfer ? {
          sendAmount: effectiveTransferData.sendAmount,
          sendCurrency: effectiveTransferData.sendCurrency,
          receiveCurrency: effectiveTransferData.receiveCurrency,
          rateId: effectiveTransferData.rateId,
          cardDetails: formData.cardDetails,
          recipientUserId: recipientUser!.id,
          recipientPaymentMethodId: selectedPaymentMethod!.id,
          transferType: 'chilean_user_to_user'
        } : {
          sendAmount: effectiveTransferData.sendAmount,
          sendCurrency: effectiveTransferData.sendCurrency,
          receiveCurrency: effectiveTransferData.receiveCurrency,
          rateId: effectiveTransferData.rateId,
          cardDetails: formData.cardDetails,
          recipientUserId: recipientUser!.id,
          recipientPaymentMethodId: selectedPaymentMethod!.id,
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAuthToken()}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create transfer');
        }

        const result = await response.json();
        
        // Call success callback with transfer ID
        if (onSuccess) {
          onSuccess(result.transferId);
        }
      } else {
        // Legacy transfer flow
        const formData = {
          cardDetails: {
            ...cardDetails,
            number: cardDetails.number.replace(/\s/g, '') // Remove spaces for validation
          },
          recipientInfo: {
            ...recipientInfo,
            bankAccount: {
              ...recipientInfo.bankAccount,
              iban: recipientInfo.bankAccount.iban.replace(/\s/g, '') // Remove spaces for validation
            }
          }
        };

        // For legacy form, validate both card details and recipient info
        const legacyPaymentFormSchema = z.object({
          cardDetails: cardDetailsSchema,
          recipientInfo: z.object({
            name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
            email: z.string().email('Invalid email address'),
            bankAccount: z.object({
              iban: z.string().min(15, 'IBAN must be at least 15 characters').max(34, 'IBAN cannot exceed 34 characters'),
              bic: z.string().min(8, 'BIC must be at least 8 characters').max(11, 'BIC cannot exceed 11 characters'),
              bankName: z.string().min(2, 'Bank name must be at least 2 characters').max(100, 'Bank name cannot exceed 100 characters'),
              accountHolderName: z.string().min(2, 'Account holder name must be at least 2 characters').max(100, 'Account holder name cannot exceed 100 characters'),
              country: z.literal('DE').refine(() => true, { message: 'Only German bank accounts are supported' })
            })
          })
        });

        legacyPaymentFormSchema.parse(formData);

        // Call onSubmit with validated data
        onSubmit(formData);
      }
    } catch (err) {
      console.error('Transfer creation error:', err);
      
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.issues.forEach((error) => {
          const path = error.path.join('.');
          errors[path] = error.message;
        });
        setValidationErrors(errors);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create transfer';
        if (onError) {
          onError(errorMessage);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const totalAmount = effectiveTransferData.sendAmount + effectiveTransferData.fees;

  // Render user-to-user transfer UI
  if (isUserToUserTransfer) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Header with Back Button */}
        {onBack && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={onBack}
              disabled={isLoading || isProcessing}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Complete Payment</h1>
            <div></div> {/* Spacer for centering */}
          </div>
        )}

        {/* Transfer Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Transfer Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sender and Recipient */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sender (You) */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">From</h3>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">You</p>
                    <p className="text-sm text-gray-600">Sending via card payment</p>
                  </div>
                </div>
              </div>

              {/* Recipient */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">To</h3>
                <div className="flex items-center space-x-3">
                  {recipientUser!.profileImageUrl ? (
                    <img
                      src={recipientUser!.profileImageUrl}
                      alt={recipientUser!.fullName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{recipientUser!.fullName}</p>
                      {recipientUser!.isVerified && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Mail className="w-3 h-3" />
                      <span>{recipientUser!.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Amount Details */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Send Amount */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">You Send</h3>
                  <div className="text-2xl font-bold text-gray-900">
                    {effectiveTransferData.sendAmount.toFixed(2)} {effectiveTransferData.sendCurrency}
                  </div>
                  <div className="text-sm text-gray-600">
                    + {effectiveTransferData.fees.toFixed(2)} {effectiveTransferData.sendCurrency} fees
                  </div>
                  <div className="text-lg font-semibold border-t pt-2">
                    Total: {totalAmount.toFixed(2)} {effectiveTransferData.sendCurrency}
                  </div>
                </div>

                {/* Receive Amount */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">They Receive</h3>
                  <div className="text-2xl font-bold text-green-600">
                    {effectiveTransferData.receiveAmount.toFixed(2)} {effectiveTransferData.receiveCurrency}
                  </div>
                  <div className="text-sm text-gray-600">
                    Exchange rate: 1 {effectiveTransferData.sendCurrency} = {effectiveTransferData.exchangeRate.toFixed(4)} {effectiveTransferData.receiveCurrency}
                  </div>
                  {effectiveTransferData.estimatedArrival && (
                    <div className="text-sm text-gray-600">
                      Estimated arrival: {effectiveTransferData.estimatedArrival}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipient Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Recipient's Bank Account
            </CardTitle>
            <p className="text-sm text-gray-600">
              {recipientUser!.fullName} will receive the money in their verified account
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">
                    {selectedPaymentMethod!.bankName || `${selectedPaymentMethod!.type.replace('_', ' ')}`}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {selectedPaymentMethod!.currency}
                  </Badge>
                  {selectedPaymentMethod!.isDefault && (
                    <Badge variant="outline" className="text-xs">Default</Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedPaymentMethod!.accountType} • {selectedPaymentMethod!.country}
                  {selectedPaymentMethod!.lastFourDigits && (
                    <span> • ****{selectedPaymentMethod!.lastFourDigits}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Verified {new Date(selectedPaymentMethod!.verifiedAt).toLocaleDateString()}
                </div>
              </div>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Your Payment Method
            </CardTitle>
            <p className="text-sm text-gray-600">
              Enter your card details to complete the transfer
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Card Details Section */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="card-number">Card Number</Label>
                  <Input
                    id="card-number"
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={formatCardNumber(cardDetails.number)}
                    onChange={(e) => handleCardDetailsChange('number', e.target.value.replace(/\s/g, ''))}
                    className={validationErrors['cardDetails.number'] ? 'border-red-500' : ''}
                    maxLength={19}
                  />
                  {validationErrors['cardDetails.number'] && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors['cardDetails.number']}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="expiry-month">Month</Label>
                    <Input
                      id="expiry-month"
                      type="number"
                      placeholder="MM"
                      min="1"
                      max="12"
                      value={cardDetails.expiryMonth}
                      onChange={(e) => handleCardDetailsChange('expiryMonth', parseInt(e.target.value) || 1)}
                      className={validationErrors['cardDetails.expiryMonth'] ? 'border-red-500' : ''}
                    />
                    {validationErrors['cardDetails.expiryMonth'] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors['cardDetails.expiryMonth']}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="expiry-year">Year</Label>
                    <Input
                      id="expiry-year"
                      type="number"
                      placeholder="YYYY"
                      min={new Date().getFullYear()}
                      max={new Date().getFullYear() + 20}
                      value={cardDetails.expiryYear}
                      onChange={(e) => handleCardDetailsChange('expiryYear', parseInt(e.target.value) || new Date().getFullYear())}
                      className={validationErrors['cardDetails.expiryYear'] ? 'border-red-500' : ''}
                    />
                    {validationErrors['cardDetails.expiryYear'] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors['cardDetails.expiryYear']}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      type="text"
                      placeholder="123"
                      maxLength={4}
                      value={cardDetails.cvv}
                      onChange={(e) => handleCardDetailsChange('cvv', e.target.value.replace(/[^0-9]/g, ''))}
                      className={validationErrors['cardDetails.cvv'] ? 'border-red-500' : ''}
                    />
                    {validationErrors['cardDetails.cvv'] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors['cardDetails.cvv']}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit"
                disabled={isLoading || isProcessing}
                className="w-full"
                size="lg"
              >
                {isLoading || isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Transfer...
                  </>
                ) : (
                  `Send ${totalAmount.toFixed(2)} ${effectiveTransferData.sendCurrency} to ${recipientUser!.fullName}`
                )}
              </Button>

              {/* Security Notice */}
              <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Secured by Circle • PCI DSS Compliant</span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Legacy transfer UI
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Complete Your Transfer
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>You send:</span>
            <span className="font-medium">${effectiveTransferData.sendAmount.toFixed(2)} {effectiveTransferData.sendCurrency}</span>
          </div>
          <div className="flex justify-between">
            <span>Fees:</span>
            <span className="font-medium">${effectiveTransferData.fees.toFixed(2)} {effectiveTransferData.sendCurrency}</span>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1">
            <span>Total to pay:</span>
            <span className="font-bold">${totalAmount.toFixed(2)} {effectiveTransferData.sendCurrency}</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Recipient gets:</span>
            <span className="font-bold">€{effectiveTransferData.receiveAmount.toFixed(2)} {effectiveTransferData.receiveCurrency}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Card Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-4 w-4" />
              <h3 className="font-semibold">Payment Details</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="card-number">Card Number</Label>
                <Input
                  id="card-number"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={formatCardNumber(cardDetails.number)}
                  onChange={(e) => handleCardDetailsChange('number', e.target.value.replace(/\s/g, ''))}
                  className={validationErrors['cardDetails.number'] ? 'border-red-500' : ''}
                  maxLength={19}
                />
                {validationErrors['cardDetails.number'] && (
                  <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors['cardDetails.number']}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="expiry-month">Month</Label>
                  <Input
                    id="expiry-month"
                    type="number"
                    placeholder="MM"
                    min="1"
                    max="12"
                    value={cardDetails.expiryMonth}
                    onChange={(e) => handleCardDetailsChange('expiryMonth', parseInt(e.target.value) || 1)}
                    className={validationErrors['cardDetails.expiryMonth'] ? 'border-red-500' : ''}
                  />
                  {validationErrors['cardDetails.expiryMonth'] && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors['cardDetails.expiryMonth']}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="expiry-year">Year</Label>
                  <Input
                    id="expiry-year"
                    type="number"
                    placeholder="YYYY"
                    min={new Date().getFullYear()}
                    max={new Date().getFullYear() + 20}
                    value={cardDetails.expiryYear}
                    onChange={(e) => handleCardDetailsChange('expiryYear', parseInt(e.target.value) || new Date().getFullYear())}
                    className={validationErrors['cardDetails.expiryYear'] ? 'border-red-500' : ''}
                  />
                  {validationErrors['cardDetails.expiryYear'] && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors['cardDetails.expiryYear']}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    type="text"
                    placeholder="123"
                    maxLength={4}
                    value={cardDetails.cvv}
                    onChange={(e) => handleCardDetailsChange('cvv', e.target.value.replace(/[^0-9]/g, ''))}
                    className={validationErrors['cardDetails.cvv'] ? 'border-red-500' : ''}
                  />
                  {validationErrors['cardDetails.cvv'] && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors['cardDetails.cvv']}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recipient Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-4 w-4" />
              <h3 className="font-semibold">Recipient Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recipient-name">Full Name</Label>
                <Input
                  id="recipient-name"
                  type="text"
                  placeholder="John Doe"
                  value={recipientInfo.name}
                  onChange={(e) => handleRecipientInfoChange('name', e.target.value)}
                  className={validationErrors['recipientInfo.name'] ? 'border-red-500' : ''}
                />
                {validationErrors['recipientInfo.name'] && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors['recipientInfo.name']}</p>
                )}
              </div>

              <div>
                <Label htmlFor="recipient-email">Email Address</Label>
                <Input
                  id="recipient-email"
                  type="email"
                  placeholder="john@example.com"
                  value={recipientInfo.email}
                  onChange={(e) => handleRecipientInfoChange('email', e.target.value)}
                  className={validationErrors['recipientInfo.email'] ? 'border-red-500' : ''}
                />
                {validationErrors['recipientInfo.email'] && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors['recipientInfo.email']}</p>
                )}
              </div>
            </div>
          </div>

          {/* Bank Account Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Building className="h-4 w-4" />
              <h3 className="font-semibold">Bank Account Details (Germany)</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  type="text"
                  placeholder="DE89 3704 0044 0532 0130 00"
                  value={formatIBAN(recipientInfo.bankAccount.iban)}
                  onChange={(e) => handleRecipientInfoChange('bankAccount.iban', e.target.value.replace(/\s/g, ''))}
                  className={validationErrors['recipientInfo.bankAccount.iban'] ? 'border-red-500' : ''}
                />
                {validationErrors['recipientInfo.bankAccount.iban'] && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors['recipientInfo.bankAccount.iban']}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bic">BIC/SWIFT Code</Label>
                  <Input
                    id="bic"
                    type="text"
                    placeholder="COBADEFFXXX"
                    value={recipientInfo.bankAccount.bic}
                    onChange={(e) => handleRecipientInfoChange('bankAccount.bic', e.target.value.toUpperCase())}
                    className={validationErrors['recipientInfo.bankAccount.bic'] ? 'border-red-500' : ''}
                  />
                  {validationErrors['recipientInfo.bankAccount.bic'] && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors['recipientInfo.bankAccount.bic']}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="bank-name">Bank Name</Label>
                  <Input
                    id="bank-name"
                    type="text"
                    placeholder="Deutsche Bank"
                    value={recipientInfo.bankAccount.bankName}
                    onChange={(e) => handleRecipientInfoChange('bankAccount.bankName', e.target.value)}
                    className={validationErrors['recipientInfo.bankAccount.bankName'] ? 'border-red-500' : ''}
                  />
                  {validationErrors['recipientInfo.bankAccount.bankName'] && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors['recipientInfo.bankAccount.bankName']}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="account-holder">Account Holder Name</Label>
                <Input
                  id="account-holder"
                  type="text"
                  placeholder="John Doe"
                  value={recipientInfo.bankAccount.accountHolderName}
                  onChange={(e) => handleRecipientInfoChange('bankAccount.accountHolderName', e.target.value)}
                  className={validationErrors['recipientInfo.bankAccount.accountHolderName'] ? 'border-red-500' : ''}
                />
                {validationErrors['recipientInfo.bankAccount.accountHolderName'] && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors['recipientInfo.bankAccount.accountHolderName']}</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit"
            disabled={isLoading || isProcessing}
            className="w-full"
            size="lg"
          >
            {isLoading || isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Transfer...
              </>
            ) : (
              `Send ${effectiveTransferData.sendAmount.toFixed(2)} USD`
            )}
          </Button>

          {/* Security Notice */}
          <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Secured by Circle • PCI DSS Compliant</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Enhanced PaymentForm for user-to-user transfers
export function EnhancedPaymentForm({
  transferData,
  recipientUser,
  selectedPaymentMethod,
  onSuccess,
  onBack,
  onError,
  isLoading = false
}: EnhancedPaymentFormProps) {
  // Form state
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    number: '',
    expiryMonth: 1,
    expiryYear: new Date().getFullYear(),
    cvv: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
    const matches = cleaned.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return cleaned;
    }
  };

  // Handle card details change
  const handleCardDetailsChange = (field: keyof CardDetails, value: string | number) => {
    setCardDetails(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[`cardDetails.${field}`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`cardDetails.${field}`];
        return newErrors;
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    setValidationErrors({});
    setIsProcessing(true);

    try {
      // Validate form data
      const formData = {
        cardDetails: {
          ...cardDetails,
          number: cardDetails.number.replace(/\s/g, '') // Remove spaces for validation
        }
      };

      userToUserPaymentFormSchema.parse(formData);

      // Create transfer with user-to-user data
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_URL}/api/transfers/create-user-to-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          sendAmount: transferData.sendAmount,
          sendCurrency: transferData.sendCurrency,
          receiveCurrency: transferData.receiveCurrency,
          rateId: transferData.rateId,
          cardDetails: formData.cardDetails,
          recipientUserId: recipientUser.id,
          recipientPaymentMethodId: selectedPaymentMethod.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create transfer');
      }

      const result = await response.json();
      
      // Call success callback with transfer ID
      onSuccess(result.transferId);
      
    } catch (err) {
      console.error('Transfer creation error:', err);
      
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.issues.forEach((error) => {
          const path = error.path.join('.');
          errors[path] = error.message;
        });
        setValidationErrors(errors);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create transfer';
        onError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Get authentication token (placeholder - would integrate with actual auth)
  const getAuthToken = async (): Promise<string> => {
    // This would integrate with Clerk or your auth system
    // For now, return a placeholder
    return 'mock-token';
  };


  const totalAmount = transferData.sendAmount + transferData.fees;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading || isProcessing}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Complete Payment</h1>
        <div></div> {/* Spacer for centering */}
      </div>

      {/* Transfer Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Transfer Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sender and Recipient */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sender (You) */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">From</h3>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">You</p>
                  <p className="text-sm text-gray-600">Sending via card payment</p>
                </div>
              </div>
            </div>

            {/* Recipient */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">To</h3>
              <div className="flex items-center space-x-3">
                {recipientUser.profileImageUrl ? (
                  <img
                    src={recipientUser.profileImageUrl}
                    alt={recipientUser.fullName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium">{recipientUser.fullName}</p>
                    {recipientUser.isVerified && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <Mail className="w-3 h-3" />
                    <span>{recipientUser.email}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Amount Details */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Send Amount */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">You Send</h3>
                <div className="text-2xl font-bold text-gray-900">
                  {transferData.sendAmount.toFixed(2)} {transferData.sendCurrency}
                </div>
                <div className="text-sm text-gray-600">
                  + {transferData.fees.toFixed(2)} {transferData.sendCurrency} fees
                </div>
                <div className="text-lg font-semibold border-t pt-2">
                  Total: {totalAmount.toFixed(2)} {transferData.sendCurrency}
                </div>
              </div>

              {/* Receive Amount */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">They Receive</h3>
                <div className="text-2xl font-bold text-green-600">
                  {transferData.receiveAmount.toFixed(2)} {transferData.receiveCurrency}
                </div>
                <div className="text-sm text-gray-600">
                  Exchange rate: 1 {transferData.sendCurrency} = {transferData.exchangeRate.toFixed(4)} {transferData.receiveCurrency}
                </div>
                {transferData.estimatedArrival && (
                  <div className="text-sm text-gray-600">
                    Estimated arrival: {transferData.estimatedArrival}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipient Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Recipient's Bank Account
          </CardTitle>
          <p className="text-sm text-gray-600">
            {recipientUser.fullName} will receive the money in their verified account
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-gray-500" />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium">
                  {selectedPaymentMethod.bankName || `${selectedPaymentMethod.type.replace('_', ' ')}`}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {selectedPaymentMethod.currency}
                </Badge>
                {selectedPaymentMethod.isDefault && (
                  <Badge variant="outline" className="text-xs">Default</Badge>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {selectedPaymentMethod.accountType} • {selectedPaymentMethod.country}
                {selectedPaymentMethod.lastFourDigits && (
                  <span> • ****{selectedPaymentMethod.lastFourDigits}</span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                Verified {new Date(selectedPaymentMethod.verifiedAt).toLocaleDateString()}
              </div>
            </div>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Your Payment Method
          </CardTitle>
          <p className="text-sm text-gray-600">
            Enter your card details to complete the transfer
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card Details Section */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="card-number">Card Number</Label>
                <Input
                  id="card-number"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={formatCardNumber(cardDetails.number)}
                  onChange={(e) => handleCardDetailsChange('number', e.target.value.replace(/\s/g, ''))}
                  className={validationErrors['cardDetails.number'] ? 'border-red-500' : ''}
                  maxLength={19}
                />
                {validationErrors['cardDetails.number'] && (
                  <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors['cardDetails.number']}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="expiry-month">Month</Label>
                  <Input
                    id="expiry-month"
                    type="number"
                    placeholder="MM"
                    min="1"
                    max="12"
                    value={cardDetails.expiryMonth}
                    onChange={(e) => handleCardDetailsChange('expiryMonth', parseInt(e.target.value) || 1)}
                    className={validationErrors['cardDetails.expiryMonth'] ? 'border-red-500' : ''}
                  />
                  {validationErrors['cardDetails.expiryMonth'] && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors['cardDetails.expiryMonth']}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="expiry-year">Year</Label>
                  <Input
                    id="expiry-year"
                    type="number"
                    placeholder="YYYY"
                    min={new Date().getFullYear()}
                    max={new Date().getFullYear() + 20}
                    value={cardDetails.expiryYear}
                    onChange={(e) => handleCardDetailsChange('expiryYear', parseInt(e.target.value) || new Date().getFullYear())}
                    className={validationErrors['cardDetails.expiryYear'] ? 'border-red-500' : ''}
                  />
                  {validationErrors['cardDetails.expiryYear'] && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors['cardDetails.expiryYear']}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    type="text"
                    placeholder="123"
                    maxLength={4}
                    value={cardDetails.cvv}
                    onChange={(e) => handleCardDetailsChange('cvv', e.target.value.replace(/[^0-9]/g, ''))}
                    className={validationErrors['cardDetails.cvv'] ? 'border-red-500' : ''}
                  />
                  {validationErrors['cardDetails.cvv'] && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors['cardDetails.cvv']}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit"
              disabled={isLoading || isProcessing}
              className="w-full"
              size="lg"
            >
              {isLoading || isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Transfer...
                </>
              ) : (
                `Send ${totalAmount.toFixed(2)} ${transferData.sendCurrency} to ${recipientUser.fullName}`
              )}
            </Button>

            {/* Security Notice */}
            <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Secured by Circle • PCI DSS Compliant</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}