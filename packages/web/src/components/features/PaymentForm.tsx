"use client";

import { useState } from "react";
import { z } from "zod";
import { CreditCard, User, Building, MapPin, Loader2, Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Validation schemas
const cardDetailsSchema = z.object({
  number: z.string().min(13, 'Card number must be at least 13 digits').max(19, 'Card number cannot exceed 19 digits'),
  expiryMonth: z.number().min(1, 'Invalid month').max(12, 'Invalid month'),
  expiryYear: z.number().min(new Date().getFullYear(), 'Card has expired').max(new Date().getFullYear() + 20, 'Invalid year'),
  cvv: z.string().min(3, 'CVV must be at least 3 digits').max(4, 'CVV cannot exceed 4 digits')
});

const recipientInfoSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().email('Invalid email address'),
  bankAccount: z.object({
    iban: z.string().min(15, 'IBAN must be at least 15 characters').max(34, 'IBAN cannot exceed 34 characters'),
    bic: z.string().min(8, 'BIC must be at least 8 characters').max(11, 'BIC cannot exceed 11 characters'),
    bankName: z.string().min(2, 'Bank name must be at least 2 characters').max(100, 'Bank name cannot exceed 100 characters'),
    accountHolderName: z.string().min(2, 'Account holder name must be at least 2 characters').max(100, 'Account holder name cannot exceed 100 characters'),
    country: z.literal('DE').refine(() => true, { message: 'Only German bank accounts are supported' })
  })
});

const paymentFormSchema = z.object({
  cardDetails: cardDetailsSchema,
  recipientInfo: recipientInfoSchema
});

// Types
interface CardDetails {
  number: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
}

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

interface PaymentFormProps {
  sendAmount: number;
  receiveAmount: number;
  exchangeRate: number;
  fees: number;
  rateId: string;
  onSubmit: (data: PaymentData) => void;
  isLoading?: boolean;
}

export function PaymentForm({ 
  sendAmount, 
  receiveAmount, 
  exchangeRate, 
  fees, 
  rateId,
  onSubmit,
  isLoading = false
}: PaymentFormProps) {
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
        },
        recipientInfo: {
          ...recipientInfo,
          bankAccount: {
            ...recipientInfo.bankAccount,
            iban: recipientInfo.bankAccount.iban.replace(/\s/g, '') // Remove spaces for validation
          }
        }
      };

      paymentFormSchema.parse(formData);

      // Call onSubmit with validated data
      onSubmit(formData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.issues.forEach((error) => {
          const path = error.path.join('.');
          errors[path] = error.message;
        });
        setValidationErrors(errors);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const totalAmount = sendAmount + fees;

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
            <span className="font-medium">${sendAmount.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between">
            <span>Fees:</span>
            <span className="font-medium">${fees.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1">
            <span>Total to pay:</span>
            <span className="font-bold">${totalAmount.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Recipient gets:</span>
            <span className="font-bold">€{receiveAmount.toFixed(2)} EUR</span>
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
              `Send ${sendAmount.toFixed(2)} USD`
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