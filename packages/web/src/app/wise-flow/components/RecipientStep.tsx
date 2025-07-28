import React, { useState } from 'react';
import { ChevronLeft, Building, Mail } from 'lucide-react';

interface RecipientStepProps {
  onNext: () => void;
}

const RecipientStep: React.FC<RecipientStepProps> = ({ onNext }) => {
  const [showRecipientOptions, setShowRecipientOptions] = useState(false);

  const AddRecipientOptions = () => (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <button
          onClick={() => setShowRecipientOptions(false)}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back
        </button>
      </div>

      <h1 className="text-2xl font-bold text-center mb-8">Add a recipient</h1>

      <div className="space-y-4">
        <div className="flex items-center p-4 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
            <span className="text-green-600 font-bold text-xl">W</span>
          </div>
          <div className="flex-1">
            <div className="font-medium">Find on Wise</div>
            <div className="text-sm text-gray-600">Search by @Wisetag, email or mobile number</div>
            <div className="text-sm text-blue-600 mt-1">💫 Instant and convenient</div>
          </div>
          <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
        </div>

        <div 
          className="flex items-center p-4 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer"
          onClick={onNext}
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-4">
            <Building className="w-6 h-6 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Bank details</div>
            <div className="text-sm text-gray-600">
              Enter name, phone number, RUT number, account number and type
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
        </div>

        <div className="flex items-center p-4 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-4">
            <Mail className="w-6 h-6 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Pay by email</div>
            <div className="text-sm text-gray-600">
              We'll email your recipient to request their bank details
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
        </div>
      </div>
    </div>
  );

  if (showRecipientOptions) {
    return <AddRecipientOptions />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">WHO ARE YOU SENDING TO?</h1>
      
      <div className="text-center mb-8">
        <button
          onClick={() => setShowRecipientOptions(true)}
          className="bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-6 rounded-full"
        >
          Add recipient
        </button>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">Recents</h3>
        <div className="flex items-center p-4 bg-gray-50 rounded-lg">
          <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mr-4">
            <span className="text-lg font-medium">FR</span>
          </div>
          <div className="flex-1">
            <div className="font-medium">Felipe R.</div>
            <div className="text-sm text-gray-600">Banco Santa...</div>
          </div>
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <img src="/api/placeholder/16/16" alt="Chile flag" className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">All accounts</h3>
        <div 
          className="flex items-center p-4 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer"
          onClick={onNext}
        >
          <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mr-4">
            <span className="text-lg font-medium">FR</span>
          </div>
          <div className="flex-1">
            <div className="font-medium">Felipe Matias Aros Rojas</div>
            <div className="text-sm text-gray-600">Banco Santander ending - 3071</div>
          </div>
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <img src="/api/placeholder/16/16" alt="Chile flag" className="w-4 h-4" />
          </div>
          <ChevronLeft className="w-5 h-5 text-gray-400 ml-2 rotate-180" />
        </div>
      </div>
    </div>
  );
};

export default RecipientStep;
