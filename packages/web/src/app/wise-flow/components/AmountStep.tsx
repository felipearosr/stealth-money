import React from 'react';
import { ChevronDown, Clock, CreditCard, Info, ChevronLeft, FileText } from 'lucide-react';
import { InfoRow } from './InfoRow';

interface AmountStepProps {
  onNext: () => void;
}

const AmountStep: React.FC<AmountStepProps> = ({ onNext }) => {
  return (
    <div className="w-full max-w-2xl mx-auto">

      <div className="space-y-6">
        <div>
          <p className="text-sm text-gray-500 mb-2">You send exactly</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2 mr-4">
              <img src="https://hatscripts.github.io/circle-flags/flags/us.svg" alt="USD" className="w-6 h-6 mr-2" />
              <span className="font-medium">USD</span>
              <ChevronDown className="w-4 h-4 ml-2" />
            </div>
            <input type="text" defaultValue="160" className="text-6xl font-light text-green-600 bg-transparent border-none outline-none w-full text-right" />
          </div>
        </div>

        <div className="relative flex items-center">
          <div className="flex-grow border-t border-gray-200"></div>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-white px-2">
            <div className="w-8 h-8 border-2 border-gray-300 rounded-full flex items-center justify-center">-</div>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-2">Recipient gets</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2 mr-4">
              <img src="https://hatscripts.github.io/circle-flags/flags/cl.svg" alt="CLP" className="w-6 h-6 mr-2" />
              <span className="font-medium">CLP</span>
              <ChevronDown className="w-4 h-4 ml-2" />
            </div>
            <input type="text" defaultValue="143,242" className="text-6xl font-light bg-transparent border-none outline-none w-full text-right" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <CreditCard className="w-5 h-5 text-red-500 mr-2" />
              <div>
                <div className="font-medium">Paying with</div>
                <div className="text-sm text-gray-600">Debit card •1353</div>
                <div className="text-xs text-gray-500">USD • Expires 10/31</div>
              </div>
            </div>
            <button className="text-green-600 font-medium">Change</button>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <Info className="w-4 h-4 mr-2" />
            There's a cheaper way to pay — change your payment method to save
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-gray-500 mr-2" />
              <div>
                <div className="font-medium">Arrives</div>
                <div className="text-sm text-gray-600">by Wednesday</div>
              </div>
            </div>
            <button className="text-green-600 font-medium">Schedule</button>
          </div>
        </div>

        <InfoRow 
          icon={<FileText className="w-5 h-5 text-gray-500" />}
          title="Total fees"
          subtitle="Included in USD amount"
          rightContent={
            <div className="flex items-center text-green-600 font-medium">
              <span className="underline">11.37 USD</span>
              <ChevronLeft className="w-4 h-4 rotate-180 inline" />
            </div>
          }
        />
      </div>

      <button
        onClick={onNext}
        className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-4 rounded-lg mt-8"
      >
        Add recipient
      </button>

      <div className="text-center mt-4">
        <button className="text-gray-600 underline">Get help</button>
      </div>
    </div>
  );
};

export default AmountStep;
