import React from 'react';

interface ReviewSectionProps {
  title: string;
  onChange?: () => void;
  children: React.ReactNode;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({ title, onChange, children }) => {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">{title}</h3>
        {onChange && <button className="text-blue-600" onClick={onChange}>Change</button>}
      </div>
      {children}
    </div>
  );
};
