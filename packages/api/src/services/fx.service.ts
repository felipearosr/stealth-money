// src/services/fx.service.ts
import axios from 'axios';

const API_KEY = process.env.EXCHANGERATE_API_KEY;
const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/`;

export class FxService {
  async getRate(sourceCurrency: string, destCurrency: string): Promise<number> {
    try {
      const response = await axios.get(`${BASE_URL}${sourceCurrency}`);
      const rates = response.data.conversion_rates;

      if (!rates || !rates[destCurrency]) {
        throw new Error(`Currency not found: ${destCurrency}`);
      }

      return rates[destCurrency];
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      throw new Error('Could not retrieve exchange rate.');
    }
  }
}