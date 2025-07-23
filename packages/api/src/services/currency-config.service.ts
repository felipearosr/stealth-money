/**
 * Currency Configuration Service
 * Manages supported currencies, validation, and limits
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
  isActive: boolean; // Whether currency is currently supported
}

export interface CurrencyPair {
  from: string;
  to: string;
  isSupported: boolean;
  minAmount: number;
  maxAmount: number;
  estimatedArrival: {
    min: number;
    max: number;
    unit: 'minutes' | 'hours' | 'days';
  };
}

export class CurrencyConfigService {
  private static readonly SUPPORTED_CURRENCIES: Record<string, SupportedCurrency> = {
    USD: {
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      flag: '🇺🇸',
      countries: ['United States'],
      minAmount: 1,
      maxAmount: 50000,
      decimalPlaces: 2,
      isActive: true
    },
    EUR: {
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      flag: '🇪🇺',
      countries: ['Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Belgium', 'Austria', 'Portugal', 'Finland', 'Ireland', 'Luxembourg', 'Slovenia', 'Slovakia', 'Estonia', 'Latvia', 'Lithuania', 'Malta', 'Cyprus'],
      minAmount: 1,
      maxAmount: 45000,
      decimalPlaces: 2,
      isActive: true
    },
    GBP: {
      code: 'GBP',
      name: 'British Pound',
      symbol: '£',
      flag: '🇬🇧',
      countries: ['United Kingdom'],
      minAmount: 1,
      maxAmount: 40000,
      decimalPlaces: 2,
      isActive: true
    },
    CLP: {
      code: 'CLP',
      name: 'Chilean Peso',
      symbol: '$',
      flag: '🇨🇱',
      countries: ['Chile'],
      minAmount: 800,
      maxAmount: 40000000,
      decimalPlaces: 0,
      isActive: true
    },
    MXN: {
      code: 'MXN',
      name: 'Mexican Peso',
      symbol: '$',
      flag: '🇲🇽',
      countries: ['Mexico'],
      minAmount: 20,
      maxAmount: 1000000,
      decimalPlaces: 2,
      isActive: true
    },
    CAD: {
      code: 'CAD',
      name: 'Canadian Dollar',
      symbol: 'C$',
      flag: '🇨🇦',
      countries: ['Canada'],
      minAmount: 1,
      maxAmount: 65000,
      decimalPlaces: 2,
      isActive: true
    },
    AUD: {
      code: 'AUD',
      name: 'Australian Dollar',
      symbol: 'A$',
      flag: '🇦🇺',
      countries: ['Australia'],
      minAmount: 1,
      maxAmount: 75000,
      decimalPlaces: 2,
      isActive: true
    },
    JPY: {
      code: 'JPY',
      name: 'Japanese Yen',
      symbol: '¥',
      flag: '🇯🇵',
      countries: ['Japan'],
      minAmount: 100,
      maxAmount: 5500000,
      decimalPlaces: 0,
      isActive: true
    },
    CHF: {
      code: 'CHF',
      name: 'Swiss Franc',
      symbol: 'CHF',
      flag: '🇨🇭',
      countries: ['Switzerland'],
      minAmount: 1,
      maxAmount: 45000,
      decimalPlaces: 2,
      isActive: true
    },
    SEK: {
      code: 'SEK',
      name: 'Swedish Krona',
      symbol: 'kr',
      flag: '🇸🇪',
      countries: ['Sweden'],
      minAmount: 10,
      maxAmount: 500000,
      decimalPlaces: 2,
      isActive: true
    },
    NOK: {
      code: 'NOK',
      name: 'Norwegian Krone',
      symbol: 'kr',
      flag: '🇳🇴',
      countries: ['Norway'],
      minAmount: 10,
      maxAmount: 520000,
      decimalPlaces: 2,
      isActive: true
    },
    DKK: {
      code: 'DKK',
      name: 'Danish Krone',
      symbol: 'kr',
      flag: '🇩🇰',
      countries: ['Denmark'],
      minAmount: 7,
      maxAmount: 340000,
      decimalPlaces: 2,
      isActive: true
    },
    PLN: {
      code: 'PLN',
      name: 'Polish Zloty',
      symbol: 'zł',
      flag: '🇵🇱',
      countries: ['Poland'],
      minAmount: 4,
      maxAmount: 200000,
      decimalPlaces: 2,
      isActive: true
    },
    CZK: {
      code: 'CZK',
      name: 'Czech Koruna',
      symbol: 'Kč',
      flag: '🇨🇿',
      countries: ['Czech Republic'],
      minAmount: 25,
      maxAmount: 1150000,
      decimalPlaces: 2,
      isActive: true
    },
    HUF: {
      code: 'HUF',
      name: 'Hungarian Forint',
      symbol: 'Ft',
      flag: '🇭🇺',
      countries: ['Hungary'],
      minAmount: 350,
      maxAmount: 18000000,
      decimalPlaces: 0,
      isActive: true
    },
    BRL: {
      code: 'BRL',
      name: 'Brazilian Real',
      symbol: 'R$',
      flag: '🇧🇷',
      countries: ['Brazil'],
      minAmount: 5,
      maxAmount: 250000,
      decimalPlaces: 2,
      isActive: true
    },
    ARS: {
      code: 'ARS',
      name: 'Argentine Peso',
      symbol: '$',
      flag: '🇦🇷',
      countries: ['Argentina'],
      minAmount: 350,
      maxAmount: 17500000,
      decimalPlaces: 2,
      isActive: true
    },
    COP: {
      code: 'COP',
      name: 'Colombian Peso',
      symbol: '$',
      flag: '🇨🇴',
      countries: ['Colombia'],
      minAmount: 4000,
      maxAmount: 200000000,
      decimalPlaces: 0,
      isActive: true
    },
    PEN: {
      code: 'PEN',
      name: 'Peruvian Sol',
      symbol: 'S/',
      flag: '🇵🇪',
      countries: ['Peru'],
      minAmount: 4,
      maxAmount: 185000,
      decimalPlaces: 2,
      isActive: true
    },
    CNY: {
      code: 'CNY',
      name: 'Chinese Yuan',
      symbol: '¥',
      flag: '🇨🇳',
      countries: ['China'],
      minAmount: 7,
      maxAmount: 350000,
      decimalPlaces: 2,
      isActive: true
    },
    INR: {
      code: 'INR',
      name: 'Indian Rupee',
      symbol: '₹',
      flag: '🇮🇳',
      countries: ['India'],
      minAmount: 80,
      maxAmount: 4000000,
      decimalPlaces: 2,
      isActive: true
    },
    KRW: {
      code: 'KRW',
      name: 'South Korean Won',
      symbol: '₩',
      flag: '🇰🇷',
      countries: ['South Korea'],
      minAmount: 1300,
      maxAmount: 65000000,
      decimalPlaces: 0,
      isActive: true
    },
    SGD: {
      code: 'SGD',
      name: 'Singapore Dollar',
      symbol: 'S$',
      flag: '🇸🇬',
      countries: ['Singapore'],
      minAmount: 1,
      maxAmount: 67000,
      decimalPlaces: 2,
      isActive: true
    },
    THB: {
      code: 'THB',
      name: 'Thai Baht',
      symbol: '฿',
      flag: '🇹🇭',
      countries: ['Thailand'],
      minAmount: 35,
      maxAmount: 1750000,
      decimalPlaces: 2,
      isActive: true
    },
    MYR: {
      code: 'MYR',
      name: 'Malaysian Ringgit',
      symbol: 'RM',
      flag: '🇲🇾',
      countries: ['Malaysia'],
      minAmount: 5,
      maxAmount: 235000,
      decimalPlaces: 2,
      isActive: true
    },
    IDR: {
      code: 'IDR',
      name: 'Indonesian Rupiah',
      symbol: 'Rp',
      flag: '🇮🇩',
      countries: ['Indonesia'],
      minAmount: 15000,
      maxAmount: 750000000,
      decimalPlaces: 0,
      isActive: true
    },
    PHP: {
      code: 'PHP',
      name: 'Philippine Peso',
      symbol: '₱',
      flag: '🇵🇭',
      countries: ['Philippines'],
      minAmount: 55,
      maxAmount: 2750000,
      decimalPlaces: 2,
      isActive: true
    },
    VND: {
      code: 'VND',
      name: 'Vietnamese Dong',
      symbol: '₫',
      flag: '🇻🇳',
      countries: ['Vietnam'],
      minAmount: 24000,
      maxAmount: 1200000000,
      decimalPlaces: 0,
      isActive: true
    },
    ZAR: {
      code: 'ZAR',
      name: 'South African Rand',
      symbol: 'R',
      flag: '🇿🇦',
      countries: ['South Africa'],
      minAmount: 18,
      maxAmount: 900000,
      decimalPlaces: 2,
      isActive: true
    },
    TRY: {
      code: 'TRY',
      name: 'Turkish Lira',
      symbol: '₺',
      flag: '🇹🇷',
      countries: ['Turkey'],
      minAmount: 28,
      maxAmount: 1400000,
      decimalPlaces: 2,
      isActive: true
    }
  };

  // Send currencies (currently only USD)
  private static readonly SEND_CURRENCIES = ['USD'] as const;

  // Receive currencies (all supported except USD)
  private static readonly RECEIVE_CURRENCIES = [
    'EUR', 'GBP', 'CLP', 'MXN', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 
    'PLN', 'CZK', 'HUF', 'BRL', 'ARS', 'COP', 'PEN', 'CNY', 'INR', 'KRW', 'SGD', 
    'THB', 'MYR', 'IDR', 'PHP', 'VND', 'ZAR', 'TRY'
  ] as const;

  /**
   * Get all supported currencies
   */
  static getSupportedCurrencies(): Record<string, SupportedCurrency> {
    return { ...this.SUPPORTED_CURRENCIES };
  }

  /**
   * Get currency by code
   */
  static getCurrency(code: string): SupportedCurrency | null {
    return this.SUPPORTED_CURRENCIES[code.toUpperCase()] || null;
  }

  /**
   * Get supported send currencies
   */
  static getSendCurrencies(): string[] {
    return [...this.SEND_CURRENCIES];
  }

  /**
   * Get supported receive currencies
   */
  static getReceiveCurrencies(): string[] {
    return [...this.RECEIVE_CURRENCIES];
  }

  /**
   * Check if currency is supported for sending
   */
  static isSendCurrencySupported(code: string): boolean {
    return this.SEND_CURRENCIES.includes(code.toUpperCase() as any);
  }

  /**
   * Check if currency is supported for receiving
   */
  static isReceiveCurrencySupported(code: string): boolean {
    return this.RECEIVE_CURRENCIES.includes(code.toUpperCase() as any);
  }

  /**
   * Check if currency pair is supported
   */
  static isCurrencyPairSupported(fromCurrency: string, toCurrency: string): boolean {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    
    return this.isSendCurrencySupported(from) && this.isReceiveCurrencySupported(to);
  }

  /**
   * Get currency pair configuration
   */
  static getCurrencyPair(fromCurrency: string, toCurrency: string): CurrencyPair | null {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    
    if (!this.isCurrencyPairSupported(from, to)) {
      return null;
    }

    const fromCurrencyConfig = this.getCurrency(from);
    const toCurrencyConfig = this.getCurrency(to);

    if (!fromCurrencyConfig || !toCurrencyConfig) {
      return null;
    }

    // Use the more restrictive limits
    const minAmount = Math.max(fromCurrencyConfig.minAmount, toCurrencyConfig.minAmount);
    const maxAmount = Math.min(fromCurrencyConfig.maxAmount, toCurrencyConfig.maxAmount);

    // Estimated arrival times based on destination currency
    const estimatedArrival = this.getEstimatedArrival(to);

    return {
      from,
      to,
      isSupported: true,
      minAmount,
      maxAmount,
      estimatedArrival
    };
  }

  /**
   * Validate amount for currency
   */
  static validateAmount(amount: number, currencyCode: string): string | null {
    const currency = this.getCurrency(currencyCode);
    if (!currency) {
      return `Unsupported currency: ${currencyCode}`;
    }

    if (!currency.isActive) {
      return `Currency ${currencyCode} is currently not available`;
    }

    if (amount < currency.minAmount) {
      return `Amount must be at least ${this.formatCurrency(currency.minAmount, currencyCode)}`;
    }

    if (amount > currency.maxAmount) {
      return `Amount cannot exceed ${this.formatCurrency(currency.maxAmount, currencyCode)}`;
    }

    // Validate decimal places
    const decimalPlaces = this.getDecimalPlaces(amount);
    if (decimalPlaces > currency.decimalPlaces) {
      return `Amount cannot have more than ${currency.decimalPlaces} decimal places for ${currencyCode}`;
    }

    return null;
  }

  /**
   * Validate currency pair for transfer
   */
  static validateCurrencyPair(fromCurrency: string, toCurrency: string, amount: number): string | null {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // Check if currencies are the same
    if (from === to) {
      return 'Send and receive currencies cannot be the same';
    }

    // Check if pair is supported
    if (!this.isCurrencyPairSupported(from, to)) {
      return `Currency pair ${from} to ${to} is not supported`;
    }

    // Validate send amount
    const sendValidation = this.validateAmount(amount, from);
    if (sendValidation) {
      return sendValidation;
    }

    // Check pair-specific limits
    const pair = this.getCurrencyPair(from, to);
    if (!pair) {
      return `Currency pair ${from} to ${to} configuration not found`;
    }

    if (amount < pair.minAmount) {
      return `Amount must be at least ${this.formatCurrency(pair.minAmount, from)} for ${from} to ${to} transfers`;
    }

    if (amount > pair.maxAmount) {
      return `Amount cannot exceed ${this.formatCurrency(pair.maxAmount, from)} for ${from} to ${to} transfers`;
    }

    return null;
  }

  /**
   * Format currency amount with proper symbol and decimal places
   */
  static formatCurrency(amount: number, currencyCode: string): string {
    const currency = this.getCurrency(currencyCode);
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
  static formatNumberInput(value: string, currencyCode: string): string {
    const currency = this.getCurrency(currencyCode);
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
   * Get currency display name with flag
   */
  static getCurrencyDisplayName(currencyCode: string): string {
    const currency = this.getCurrency(currencyCode);
    if (!currency) {
      return currencyCode;
    }

    return `${currency.flag} ${currency.code} - ${currency.name}`;
  }

  /**
   * Get estimated arrival time for destination currency
   */
  private static getEstimatedArrival(toCurrency: string): {
    min: number;
    max: number;
    unit: 'minutes' | 'hours' | 'days';
  } {
    // Different arrival times based on destination currency and region
    switch (toCurrency) {
      // European currencies - fast SEPA transfers
      case 'EUR':
        return { min: 2, max: 5, unit: 'minutes' };
      case 'GBP':
        return { min: 5, max: 10, unit: 'minutes' };
      case 'CHF':
        return { min: 5, max: 15, unit: 'minutes' };
      case 'SEK':
      case 'NOK':
      case 'DKK':
        return { min: 10, max: 30, unit: 'minutes' };
      case 'PLN':
      case 'CZK':
      case 'HUF':
        return { min: 30, max: 60, unit: 'minutes' };
      
      // North American currencies
      case 'CAD':
        return { min: 15, max: 45, unit: 'minutes' };
      
      // Asia-Pacific currencies
      case 'AUD':
        return { min: 30, max: 90, unit: 'minutes' };
      case 'JPY':
        return { min: 1, max: 3, unit: 'hours' };
      case 'SGD':
        return { min: 30, max: 90, unit: 'minutes' };
      case 'CNY':
        return { min: 2, max: 6, unit: 'hours' };
      case 'INR':
        return { min: 1, max: 4, unit: 'hours' };
      case 'KRW':
        return { min: 2, max: 5, unit: 'hours' };
      case 'THB':
      case 'MYR':
      case 'PHP':
        return { min: 1, max: 3, unit: 'hours' };
      case 'IDR':
      case 'VND':
        return { min: 2, max: 6, unit: 'hours' };
      
      // Latin American currencies
      case 'MXN':
        return { min: 10, max: 30, unit: 'minutes' };
      case 'BRL':
        return { min: 1, max: 3, unit: 'hours' };
      case 'ARS':
      case 'COP':
      case 'PEN':
        return { min: 2, max: 8, unit: 'hours' };
      case 'CLP':
        return { min: 1, max: 2, unit: 'hours' };
      
      // Other currencies
      case 'ZAR':
        return { min: 1, max: 4, unit: 'hours' };
      case 'TRY':
        return { min: 30, max: 120, unit: 'minutes' };
      
      default:
        return { min: 1, max: 4, unit: 'hours' };
    }
  }

  /**
   * Get number of decimal places in a number
   */
  private static getDecimalPlaces(num: number): number {
    const str = num.toString();
    if (str.indexOf('.') !== -1) {
      return str.split('.')[1].length;
    }
    return 0;
  }

  /**
   * Get all supported currency pairs
   */
  static getSupportedCurrencyPairs(): CurrencyPair[] {
    const pairs: CurrencyPair[] = [];
    
    for (const sendCurrency of this.SEND_CURRENCIES) {
      for (const receiveCurrency of this.RECEIVE_CURRENCIES) {
        const pair = this.getCurrencyPair(sendCurrency, receiveCurrency);
        if (pair) {
          pairs.push(pair);
        }
      }
    }
    
    return pairs;
  }

  /**
   * Health check for currency configuration
   */
  static healthCheck(): {
    status: string;
    supportedCurrencies: number;
    supportedPairs: number;
    sendCurrencies: string[];
    receiveCurrencies: string[];
  } {
    const supportedCurrencies = Object.keys(this.SUPPORTED_CURRENCIES).length;
    const supportedPairs = this.getSupportedCurrencyPairs().length;
    
    return {
      status: 'healthy',
      supportedCurrencies,
      supportedPairs,
      sendCurrencies: this.getSendCurrencies(),
      receiveCurrencies: this.getReceiveCurrencies()
    };
  }
}