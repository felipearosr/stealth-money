"use client";

import { UserRecipientSelectorDemo } from "@/components/features/UserRecipientSelectorDemo";

export default function TestUserRecipientPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            User-to-User Transfer Demo
          </h1>
          <p className="text-gray-600">
            Demonstration of the UserRecipientSelector component for user-to-user transfers
          </p>
        </div>
        
        <UserRecipientSelectorDemo />
      </div>
    </div>
  );
}