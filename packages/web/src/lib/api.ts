// src/lib/api.ts

// Types for payment processor functionality
export interface LocationData {
  country: string;
  region?: string;
  currency: string;
  timezone?: string;
}

export interface FeeStructure {
  fixedFee: number;
  percentageFee: number;
  currency: string;
}

export interface ProcessorOption {
  id: string;
  name: string;
  supportedCountries: string[];
  supportedCurrencies: string[];
  fees: FeeStructure;
  processingTime: string;
  userExperienceScore: number;
  reliability: number;
  isAvailable: boolean;
}

export interface ProcessorSelection {
  selectedProcessor: ProcessorOption;
  reason: string;
  alternatives: ProcessorOption[];
  estimatedFees: number;
}

export interface SelectionCriteria {
  prioritizeCost: boolean;
  prioritizeSpeed: boolean;
  prioritizeReliability: boolean;
  maxFeePercentage?: number;
  preferredProcessors?: string[];
}

export async function getQuote(source: string, dest: string, amount: number) {
  // NOTE: This assumes an endpoint designed for quotes. 
  // We will POST to the /api/transfers endpoint for now as a proxy.
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  const res = await fetch(`${API_URL}/api/transfers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      amount, 
      sourceCurrency: source, 
      destCurrency: dest 
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch quote');
  }

  return res.json();
}

export async function getExchangeRate(from: string, to: string) {
  console.log('🔧 All env vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC')));
  console.log('🔧 Raw env var:', process.env.NEXT_PUBLIC_API_URL);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  console.log('🔧 Final API_URL:', API_URL);
  console.log('🔧 API_URL type:', typeof API_URL);
  console.log('🔧 Making request to:', `${API_URL}/api/exchange-rate/${from}/${to}`);
  
  const res = await fetch(`${API_URL}/api/exchange-rate/${from}/${to}`);

  console.log('🔧 Response status:', res.status);
  console.log('🔧 Response ok:', res.ok);

  if (!res.ok) {
    throw new Error('Failed to fetch exchange rate');
  }

  const data = await res.json();
  console.log('🔧 Response data:', data);
  return data;
}

// Payment processor API functions
export async function getAvailableProcessors(userId: string): Promise<{
  location: LocationData;
  processors: ProcessorOption[];
  count: number;
}> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  const res = await fetch(`${API_URL}/api/transfers/processors/available/${userId}`);

  if (!res.ok) {
    throw new Error('Failed to fetch available processors');
  }

  const response = await res.json();
  return response.data;
}

export async function selectOptimalProcessor(
  userId: string,
  criteria: SelectionCriteria
): Promise<{
  location: LocationData;
  selection: ProcessorSelection;
  criteria: SelectionCriteria;
}> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  const res = await fetch(`${API_URL}/api/transfers/processors/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      ...criteria
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to select optimal processor');
  }

  const response = await res.json();
  return response.data;
}

export async function getProcessorCapabilities(country?: string, currency?: string): Promise<ProcessorOption[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  const params = new URLSearchParams();
  if (country) params.append('country', country);
  if (currency) params.append('currency', currency);
  
  const url = `${API_URL}/api/transfers/processors/capabilities${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error('Failed to fetch processor capabilities');
  }

  const response = await res.json();
  return response.data;
}

// Enhanced transfer function with processor selection
export async function createTransferWithProcessor(transferData: {
  amount: number;
  sourceCurrency: string;
  destCurrency: string;
  userId?: string;
  processorId?: string;
}) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  const res = await fetch(`${API_URL}/api/transfers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transferData),
  });

  if (!res.ok) {
    throw new Error('Failed to create transfer');
  }

  return res.json();
}