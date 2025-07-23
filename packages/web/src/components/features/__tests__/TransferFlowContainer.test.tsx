import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransferFlowContainer } from '../TransferFlowContainer';

// Mock the API calls
global.fetch = jest.fn();

// Mock the child components to focus on flow logic
jest.mock('../TransferCalculator', () => ({
  TransferCalculator: ({ onContinue }: { onContinue: (data: any) => void }) => (
    <div data-testid="transfer-calculator">
      <button 
        onClick={() => onContinue({
          sendAmount: 100,
          receiveAmount: 85,
          exchangeRate: 0.85,
          fees: 5,
          rateId: 'test-rate-id',
          calculatorMode: 'send'
        })}
        data-testid="calculator-continue"
      >
        Continue
      </button>
    </div>
  )
}));

jest.mock('../RecipientForm', () => ({
  RecipientForm: ({ onContinue, onBack }: { onContinue: (data: any) => void, onBack: () => void }) => (
    <div data-testid="recipient-form">
      <button onClick={onBack} data-testid="recipient-back">Back</button>
      <button 
        onClick={() => onContinue({
          name: 'John Doe',
          email: 'john@example.com',
          bankAccount: {
            iban: 'DE89370400440532013000',
            bic: 'COBADEFFXXX',
            bankName: 'Test Bank',
            accountHolderName: 'John Doe',
            country: 'DE'
          }
        })}
        data-testid="recipient-continue"
      >
        Continue
      </button>
    </div>
  )
}));

jest.mock('../PaymentForm', () => ({
  PaymentForm: ({ onSubmit }: { onSubmit: (data: any) => void }) => (
    <div data-testid="payment-form">
      <button 
        onClick={() => onSubmit({
          cardDetails: {
            number: '4111111111111111',
            expiryMonth: 12,
            expiryYear: 2025,
            cvv: '123'
          },
          recipientInfo: {
            name: 'John Doe',
            email: 'john@example.com',
            bankAccount: {
              iban: 'DE89370400440532013000',
              bic: 'COBADEFFXXX',
              bankName: 'Test Bank',
              accountHolderName: 'John Doe',
              country: 'DE'
            }
          }
        })}
        data-testid="payment-submit"
      >
        Submit Payment
      </button>
    </div>
  )
}));

jest.mock('../TransferStatus', () => ({
  TransferStatus: ({ transferId }: { transferId: string }) => (
    <div data-testid="transfer-status">
      Transfer Status for ID: {transferId}
    </div>
  )
}));

jest.mock('../ProgressIndicator', () => ({
  ProgressIndicator: ({ currentStep, completedSteps }: { currentStep: string, completedSteps: string[] }) => (
    <div data-testid="progress-indicator">
      Current: {currentStep}, Completed: {completedSteps.join(', ')}
    </div>
  )
}));

describe('TransferFlowContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the calculator step initially', () => {
    render(<TransferFlowContainer />);
    
    expect(screen.getByTestId('transfer-calculator')).toBeInTheDocument();
    expect(screen.getByTestId('progress-indicator')).toHaveTextContent('Current: calculator');
  });

  it('should navigate through all steps in the correct order', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transferId: 'test-transfer-id' })
    } as Response);

    render(<TransferFlowContainer />);

    // Step 1: Calculator
    expect(screen.getByTestId('transfer-calculator')).toBeInTheDocument();
    
    // Continue from calculator
    fireEvent.click(screen.getByTestId('calculator-continue'));
    
    // Should show loading and then move to recipient step
    await waitFor(() => {
      expect(screen.getByTestId('recipient-form')).toBeInTheDocument();
    });

    // Step 2: Recipient
    expect(screen.getByTestId('progress-indicator')).toHaveTextContent('Current: recipient');
    expect(screen.getByTestId('progress-indicator')).toHaveTextContent('Completed: calculator');
    
    // Continue from recipient
    fireEvent.click(screen.getByTestId('recipient-continue'));
    
    // Should move to payment step
    await waitFor(() => {
      expect(screen.getByTestId('payment-form')).toBeInTheDocument();
    });

    // Step 3: Payment
    expect(screen.getByTestId('progress-indicator')).toHaveTextContent('Current: payment');
    expect(screen.getByTestId('progress-indicator')).toHaveTextContent('Completed: calculator, recipient');
    
    // Submit payment
    fireEvent.click(screen.getByTestId('payment-submit'));
    
    // Should move to status step
    await waitFor(() => {
      expect(screen.getByTestId('transfer-status')).toBeInTheDocument();
    });

    // Step 4: Status
    expect(screen.getByTestId('transfer-status')).toHaveTextContent('Transfer Status for ID: test-transfer-id');
    expect(screen.getByTestId('progress-indicator')).toHaveTextContent('Current: status');
  });

  it('should allow going back from recipient to calculator', async () => {
    render(<TransferFlowContainer />);

    // Move to recipient step
    fireEvent.click(screen.getByTestId('calculator-continue'));
    
    await waitFor(() => {
      expect(screen.getByTestId('recipient-form')).toBeInTheDocument();
    });

    // Go back to calculator
    fireEvent.click(screen.getByTestId('recipient-back'));
    
    expect(screen.getByTestId('transfer-calculator')).toBeInTheDocument();
    expect(screen.getByTestId('progress-indicator')).toHaveTextContent('Current: calculator');
  });

  it('should handle API errors gracefully', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    render(<TransferFlowContainer />);

    // Navigate to payment step
    fireEvent.click(screen.getByTestId('calculator-continue'));
    await waitFor(() => screen.getByTestId('recipient-form'));
    
    fireEvent.click(screen.getByTestId('recipient-continue'));
    await waitFor(() => screen.getByTestId('payment-form'));
    
    // Submit payment (should fail)
    fireEvent.click(screen.getByTestId('payment-submit'));
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/API Error/)).toBeInTheDocument();
    });
  });

  it('should call onComplete callback when transfer is completed', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transferId: 'test-transfer-id' })
    } as Response);

    const onComplete = jest.fn();
    render(<TransferFlowContainer onComplete={onComplete} />);

    // Navigate through all steps
    fireEvent.click(screen.getByTestId('calculator-continue'));
    await waitFor(() => screen.getByTestId('recipient-form'));
    
    fireEvent.click(screen.getByTestId('recipient-continue'));
    await waitFor(() => screen.getByTestId('payment-form'));
    
    fireEvent.click(screen.getByTestId('payment-submit'));
    await waitFor(() => screen.getByTestId('transfer-status'));

    // Should call onComplete with transfer ID
    expect(onComplete).toHaveBeenCalledWith('test-transfer-id');
  });
});