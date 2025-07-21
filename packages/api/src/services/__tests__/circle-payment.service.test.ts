import { CirclePaymentService, CardDetails, CreatePaymentRequest } from '../circle-payment.service';

// Mock the Circle SDK
jest.mock('@circle-fin/circle-sdk', () => ({
  Circle: jest.fn().mockImplementation(() => ({
    payments: {
      createPayment: jest.fn(),
      getPayment: jest.fn(),
      listPayments: jest.fn(),
      cancelPayment: jest.fn()
    }
  })),
  CircleEnvironments: {
    sandbox: 'sandbox',
    production: 'production'
  }
}));

// Mock the circle config
jest.mock('../../config/circle.config', () => ({
  circleConfig: {
    getConfig: jest.fn().mockReturnValue({
      apiKey: 'test-api-key',
      environment: 'sandbox'
    })
  }
}));

describe('CirclePaymentService', () => {
  let paymentService: CirclePaymentService;

  const mockCardDetails: CardDetails = {
    number: '4007400000000007',
    cvv: '123',
    expiry: {
      month: '12',
      year: '2025'
    },
    billingDetails: {
      name: 'John Doe',
      city: 'New York',
      country: 'US',
      line1: '123 Main St',
      postalCode: '10001'
    }
  };

  const mockPaymentRequest: CreatePaymentRequest = {
    amount: 100,
    currency: 'USD',
    cardDetails: mockCardDetails,
    description: 'Test payment'
  };

  beforeEach(() => {
    paymentService = new CirclePaymentService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a payment successfully', async () => {
      const result = await paymentService.createPayment(mockPaymentRequest);

      expect(result).toMatchObject({
        status: 'pending',
        amount: 100,
        currency: 'USD',
        description: 'Test payment'
      });
      expect(result.id).toMatch(/^payment-/);
      expect(result.createDate).toBeDefined();
      expect(result.updateDate).toBeDefined();
    });

    it('should validate card details before processing', async () => {
      const invalidRequest = {
        ...mockPaymentRequest,
        cardDetails: { ...mockCardDetails, number: '123' }
      };

      await expect(paymentService.createPayment(invalidRequest))
        .rejects.toThrow('Invalid card number');
    });
  });

  describe('getPaymentStatus', () => {
    it('should get payment status successfully', async () => {
      const result = await paymentService.getPaymentStatus('payment-123');

      expect(result).toMatchObject({
        id: 'payment-123',
        status: 'confirmed',
        amount: 100,
        currency: 'USD'
      });
      expect(result.createDate).toBeDefined();
      expect(result.updateDate).toBeDefined();
    });
  });

  describe('isPaymentConfirmed', () => {
    it('should return true for confirmed payment', async () => {
      const result = await paymentService.isPaymentConfirmed('payment-123');
      expect(result).toBe(true);
    });
  });

  describe('validateCardDetails', () => {
    it('should validate valid card details', () => {
      expect(() => paymentService.validateCardDetails(mockCardDetails)).not.toThrow();
    });

    it('should throw error for invalid card number', () => {
      const invalidCard = { ...mockCardDetails, number: '123' };
      expect(() => paymentService.validateCardDetails(invalidCard))
        .toThrow('Invalid card number');
    });

    it('should throw error for invalid CVV', () => {
      const invalidCard = { ...mockCardDetails, cvv: '12' };
      expect(() => paymentService.validateCardDetails(invalidCard))
        .toThrow('Invalid CVV');
    });

    it('should throw error for invalid expiry month', () => {
      const invalidCard = { 
        ...mockCardDetails, 
        expiry: { ...mockCardDetails.expiry, month: '13' } 
      };
      expect(() => paymentService.validateCardDetails(invalidCard))
        .toThrow('Invalid expiry month');
    });

    it('should throw error for expired card', () => {
      const invalidCard = { 
        ...mockCardDetails, 
        expiry: { ...mockCardDetails.expiry, year: '2020' } 
      };
      expect(() => paymentService.validateCardDetails(invalidCard))
        .toThrow('Card has expired');
    });

    it('should throw error for missing billing name', () => {
      const invalidCard = { 
        ...mockCardDetails, 
        billingDetails: { ...mockCardDetails.billingDetails, name: '' } 
      };
      expect(() => paymentService.validateCardDetails(invalidCard))
        .toThrow('Billing name is required');
    });

    it('should throw error for missing billing country', () => {
      const invalidCard = { 
        ...mockCardDetails, 
        billingDetails: { ...mockCardDetails.billingDetails, country: '' } 
      };
      expect(() => paymentService.validateCardDetails(invalidCard))
        .toThrow('Billing country is required');
    });
  });
});