import React from 'react';
import { ChevronLeft, CreditCard, Info } from 'lucide-react';

interface PayStepProps {
  onBack: () => void;
}

const PayStep: React.FC<PayStepProps> = ({ onBack }) => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Pay another way
        </button>
      </div>

      <div className="flex">
        <div className="flex-1 pr-8">
          <h1 className="text-2xl font-bold mb-6">Pay with your card</h1>

          <div className="bg-white border rounded-lg p-4 mb-6">
            <div className="flex items-center mb-4">
              <CreditCard className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <div className="font-medium">CLP Mastercard Debit</div>
                <div className="text-sm text-gray-600">Ending in 1353, Valid until 12/2031</div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Confirm security code (CVC/CVV)
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 pr-10"
                  placeholder="123"
                />
                <CreditCard className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  It looks like your card is not issued in the U.S and therefore, 
                  we'll need to add a fee to cover the extra processing costs. 
                  If your card isn't in USD, your bank may charge you an extra fee too.
                </div>
              </div>
            </div>
          </div>

          <button className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-4 rounded-lg">
            Pay 160 USD
          </button>
        </div>

        <div className="w-80 bg-gray-50 rounded-lg p-6">
          <h3 className="font-medium mb-4">Transfer details</h3>
          
          <div className="space-y-3 text-sm">
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
            <div className="flex justify-between font-medium text-lg">
              <span>You get</span>
              <span>143,242 CLP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Should arrive</span>
              <span>by Tuesday</span>
            </div>
          </div>

          <hr className="my-4" />

          <h3 className="font-medium mb-4">Your details</h3>
          
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
        </div>
      </div>
    </div>
  );
};

export default PayStep;
