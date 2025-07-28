import React from 'react';
import { ChevronRight } from 'lucide-react';

interface InfoRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  rightContent?: React.ReactNode;
}

export const InfoRow: React.FC<InfoRowProps> = ({ icon, title, subtitle, rightContent }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center">
        <div className="bg-gray-200 rounded-full p-2 mr-4">
          {icon}
        </div>
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-sm text-gray-600">{subtitle}</div>
        </div>
      </div>
      <div>{rightContent}</div>
    </div>
  );
};
