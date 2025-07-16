// src/services/fx.service.ts
import axios from 'axios';
import { MockFxService } from './fx.service.mock';

const API_KEY = process.env.EXCHANGERATE_API_KEY;
const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/`;

export class FxService {
  private mockService = new MockFxService();

  async getRate(sourceCurrency: string, destCurrency: string): Promise<number> {
    // Use mock service if no API key is provided or API key is placeholder
    if (!API_KEY || API_KEY === 'your_api_key_here') {
      console.log('🧪 Using mock exchange rates (no API key configured)');
      return this.mockService.getRate(sourceCurrency, destCurrency);
    }

    try {
      const response = await axios.get(`${BASE_URL}${sourceCurrency}`);
      const rates = response.data.conversion_rates;

      if (!rates || !rates[destCurrency]) {
        throw new Error(`Currency not found: ${destCurrency}`);
      }

      console.log(`✅ Real exchange rate: ${sourceCurrency}/${destCurrency} = ${rates[destCurrency]}`);
      return rates[destCurrency];
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      console.log('🔄 Falling back to mock exchange rates');
      // Fallback to mock service if API fails
      return this.mockService.getRate(sourceCurrency, destCurrency);
    }
  }
}