import React from 'react';
import { CreditCard } from 'lucide-react';
import { ReviewSection } from './ReviewSection';

interface ReviewStepProps {
  onNext: () => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ onNext }) => {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">Review details</h1>

      <div className="space-y-6">
        <ReviewSection title="Payment method" onChange={() => {}}>
          <div className="flex items-center">
            <CreditCard className="w-8 h-8 text-red-500 mr-3" />
            <div>
              <div className="font-medium">Debit card •1353</div>
              <div className="text-sm text-gray-600">USD • Expires 12/31</div>
            </div>
          </div>
        </ReviewSection>

        <ReviewSection title="Transfer details" onChange={() => {}}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">You send exactly</span>
              <span className="font-medium">160 USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total fees (included)</span>
              <span className="font-medium">11.37 USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total amount we'll convert</span>
              <span className="font-medium">148.63 USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Guaranteed rate (41 hours)</span>
              <span className="font-medium">1 USD = 963.750 CLP</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>You get</span>
              <span>143,242 CLP</span>
            </div>
          </div>
        </ReviewSection>

        <ReviewSection title="Your details" onChange={() => {}}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Account holder name</span>
              <span>Felipe Matias Aros Rojas</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Bank code</span>
              <span>037</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Account number</span>
              <span>001100133071</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Recipient's RUT number (Rol Único Tributario)</span>
              <span>194016891</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Account type</span>
              <span>Demand (cuenta vista)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Recipient's phone number</span>
              <span>56998254228</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email (Optional)</span>
              <span>felipe.aros.r@gmail.com</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Bank name</span>
              <span>Banco Santander</span>
            </div>
          </div>
        </ReviewSection>

        <ReviewSection title="Schedule details" onChange={() => {}}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Sending</span>
              <span>Now</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Should arrive</span>
              <span>by Wednesday</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Repeats</span>
              <span>Never</span>
            </div>
          </div>
        </ReviewSection>

        <ReviewSection title="Reason for transfer" onChange={() => {}}>
          <div className="text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Reason</span>
              <span>Savings</span>
            </div>
          </div>
        </ReviewSection>

        <ReviewSection title="Reference (optional)">
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder=""
          />
          <p className="text-xs text-gray-500 mt-2">
            This reference will be included only with the email the recipient will receive. 
            It will not be shown on their bank statement. Please double-check beforehand 
            with your recipient if a payment without reference on the bank account statement 
            will be accepted.
          </p>
        </ReviewSection>
      </div>

      <button
        onClick={onNext}
        className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-4 rounded-lg mt-8"
      >
        Continue to payment
      </button>
    </div>
  );
};

export default ReviewStep;
