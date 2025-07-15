// src/services/fx.service.mock.ts
// Mock FxService for testing without API key

export class MockFxService {
  private mockRates: Record<string, Record<string, number>> = {
    USD: {
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110.0,
      CAD: 1.25,
      AUD: 1.35,
    },
    EUR: {
      USD: 1.18,
      GBP: 0.86,
      JPY: 129.5,
      CAD: 1.47,
      AUD: 1.59,
    },
    GBP: {
      USD: 1.37,
      EUR: 1.16,
      JPY: 150.8,
      CAD: 1.71,
      AUD: 1.85,
    },
  };

  async getRate(sourceCurrency: string, destCurrency: string): Promise<number> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    if (sourceCurrency === destCurrency) {
      return 1.0;
    }

    const sourceRates = this.mockRates[sourceCurrency];
    if (!sourceRates || !sourceRates[destCurrency]) {
      throw new Error(`Currency pair not supported: ${sourceCurrency}/${destCurrency}`);
    }

    return sourceRates[destCurrency];
  }
}