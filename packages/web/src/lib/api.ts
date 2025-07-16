// src/lib/api.ts
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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  console.log('🔧 API_URL:', API_URL);
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