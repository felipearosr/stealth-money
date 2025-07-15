// src/app/page.tsx
import { TransferCalculator } from "@/components/features/TransferCalculator";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <h1 className="text-4xl font-bold mb-8">Stealth Money</h1>
      <TransferCalculator />
    </main>
  );
}
