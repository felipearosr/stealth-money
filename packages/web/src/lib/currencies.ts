/**
 * Currency configuration for multi-currency support
 */

export interface SupportedCurrency {
  code: string; // ISO 4217 currency code
  name: string; // Full currency name
  symbol: string; // Currency symbol
  flag: string; // Country flag emoji
  countries: string[]; // Countries that use this currency
  minAmount: number; // Minimum transfer amount
  maxAmount: number; // Maximum transfer amount
  decimalPlaces: number; // Number of decimal places
}

export const SUPPORTED_CURRENCIES: Record<string, SupportedCurrency> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
    countries: ['United States'],
    minAmount: 1,
    maxAmount: 50000,
    decimalPlaces: 2
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    countries: ['Germany', 'France', 'Spain', 'Italy'],
    minAmount: 1,
    maxAmount: 45000,
    decimalPlaces: 2
  },
  CLP: {
    code: 'CLP',
    name: 'Chilean Peso',
    symbol: '$',
    flag: '🇨🇱',
    countries: ['Chile'],
    minAmount: 800,
    maxAmount: 40000000,
    decimalPlaces: 0
  },
  MXN: {
    code: 'MXN',
    name: 'Mexican Peso',
    symbol: '$',
    flag: '🇲🇽',
    countries: ['Mexico'],
    minAmount: 20,
    maxAmount: 1000000,
    decimalPlaces: 2
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    flag: '🇬🇧',
    countries: ['United Kingdom'],
    minAmount: 1,
    maxAmount: 40000,
    decimalPlaces: 2
  }
};

// Send currencies (USD for international, CLP for Chilean domestic)
export const SEND_CURRENCIES = ['USD', 'CLP'] as const;

// Receive currencies (all supported except USD, plus CLP for domestic)
export const RECEIVE_CURRENCIES = ['EUR', 'CLP', 'MXN', 'GBP'] as const;

export type SendCurrency = typeof SEND_CURRENCIES[number];
export type ReceiveCurrency = typeof RECEIVE_CURRENCIES[number];

/**
 * Format currency amount with proper symbol and decimal places
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  if (!currency) {
    return amount.toString();
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces,
  }).format(amount);
}

/**
 * Format number input based on currency decimal places
 */
export function formatNumberInput(value: string, currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  if (!currency) {
    return value;
  }

  // Remove any non-numeric characters except decimal point
  const cleaned = value.replace(/[^\d.]/g, '');
  
  // Ensure only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts[1];
  }
  
  // Limit decimal places based on currency
  if (currency.decimalPlaces === 0) {
    // No decimal places allowed
    return parts[0];
  } else if (parts[1] && parts[1].length > currency.decimalPlaces) {
    return parts[0] + '.' + parts[1].substring(0, currency.decimalPlaces);
  }
  
  return cleaned;
}

/**
 * Validate amount based on currency limits
 */
export function validateAmount(amount: number, currencyCode: string): string | null {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  if (!currency) {
    return 'Unsupported currency';
  }

  if (amount < currency.minAmount) {
    return `Amount must be at least ${formatCurrency(currency.minAmount, currencyCode)}`;
  }

  if (amount > currency.maxAmount) {
    return `Amount cannot exceed ${formatCurrency(currency.maxAmount, currencyCode)}`;
  }

  return null;
}

/**
 * Get currency display name with flag
 */
export function getCurrencyDisplayName(currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  if (!currency) {
    return currencyCode;
  }

  return `${currency.flag} ${currency.code} - ${currency.name}`;
}