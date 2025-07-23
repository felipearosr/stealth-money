import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserRecipientSelector, UserProfile, VerifiedPaymentMethod, RecentRecipient } from '../UserRecipientSelector';

// Mock fetch globally
global.fetch = jest.fn();

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';

describe('UserRecipientSelector', () => {
  const mockTransferData = {
    sendAmount: 100,
    receiveAmount: 85,
    sendCurrency: 'USD',
    receiveCurrency: 'EUR',
    exchangeRate: 0.85,
    fees: 5,
  };

  const mockVerifiedPaymentMethod: VerifiedPaymentMethod = {
    id: 'pm-1',
    type: 'bank_account',
    currency: 'EUR',
    bankName: 'Deutsche Bank',
    accountType: 'checking',
    lastFourDigits: '1234',
    isDefault: true,
    verifiedAt: '2025-01-01T00:00:00Z',
    country: 'DE',
  };

  const mockUserProfile: UserProfile = {
    id: 'user-1',
    email: 'john@example.com',
    username: 'johndoe',
    phone: '+1234567890',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    profileImageUrl: 'https://example.com/avatar.jpg',
    isVerified: true,
    verifiedPaymentMethods: [mockVerifiedPaymentMethod],
    supportedCurrencies: ['EUR', 'USD'],
    lastActiveAt: '2025-01-20T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockRecentRecipient: RecentRecipient = {
    id: 'recent-1',
    userId: 'user-1',
    userProfile: mockUserProfile,
    lastTransferAt: '2025-01-15T00:00:00Z',
    transferCount: 3,
    totalAmountSent: 300,
    averageAmount: 100,
    preferredCurrency: 'EUR',
    isFrequent: true,
    isFavorite: false,
  };

  const defaultProps = {
    transferData: mockTransferData,
    onRecipientSelected: jest.fn(),
    onBack: jest.fn(),
    currentUserId: 'current-user-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('renders the component with transfer summary', () => {
    render(<UserRecipientSelector {...defaultProps} />);
    
    expect(screen.getByText('Send to User')).toBeInTheDocument();
    expect(screen.getByText('Transfer Summary')).toBeInTheDocument();
    expect(screen.getByText('100 USD')).toBeInTheDocument();
    expect(screen.getByText('85 EUR')).toBeInTheDocument();
  });

  it('shows recent recipients tab by default', () => {
    render(<UserRecipientSelector {...defaultProps} />);
    
    expect(screen.getByText('Recent Recipients')).toBeInTheDocument();
    expect(screen.getByText('Search Users')).toBeInTheDocument();
  });

  it('loads recent recipients on mount', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recipients: [mockRecentRecipient] }),
    });

    render(<UserRecipientSelector {...defaultProps} />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/users/me/recipients',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  it('displays recent recipients when loaded', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recipients: [mockRecentRecipient] }),
    });

    render(<UserRecipientSelector {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('3 transfers')).toBeInTheDocument();
    });
  });

  it('shows empty state when no recent recipients', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recipients: [] }),
    });

    render(<UserRecipientSelector {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No recent recipients')).toBeInTheDocument();
      expect(screen.getByText("You haven't sent money to any users yet. Use the search tab to find someone to send money to.")).toBeInTheDocument();
    });
  });

  it('switches to search tab when clicked', () => {
    render(<UserRecipientSelector {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Search Users'));
    
    expect(screen.getByPlaceholderText('Enter email, username, or phone number...')).toBeInTheDocument();
  });

  it('performs user search when typing in search input', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recipients: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [mockUserProfile], total: 1, hasMore: false }),
      });

    render(<UserRecipientSelector {...defaultProps} />);
    
    // Switch to search tab
    fireEvent.click(screen.getByText('Search Users'));
    
    // Type in search input
    const searchInput = screen.getByPlaceholderText('Enter email, username, or phone number...');
    fireEvent.change(searchInput, { target: { value: 'john@example.com' } });
    
    // Wait for debounced search
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/users/search?q=john%40example.com&currency=EUR&limit=10',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    }, { timeout: 1000 });
  });

  it('displays search results', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recipients: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [mockUserProfile], total: 1, hasMore: false }),
      });

    render(<UserRecipientSelector {...defaultProps} />);
    
    // Switch to search tab
    fireEvent.click(screen.getByText('Search Users'));
    
    // Type in search input
    const searchInput = screen.getByPlaceholderText('Enter email, username, or phone number...');
    fireEvent.change(searchInput, { target: { value: 'john' } });
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('✓ 1 verified account for EUR')).toBeInTheDocument();
    });
  });

  it('shows no results message when search returns empty', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recipients: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [], total: 0, hasMore: false }),
      });

    render(<UserRecipientSelector {...defaultProps} />);
    
    // Switch to search tab
    fireEvent.click(screen.getByText('Search Users'));
    
    // Type in search input
    const searchInput = screen.getByPlaceholderText('Enter email, username, or phone number...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
      expect(screen.getByText(/No users found matching "nonexistent"/)).toBeInTheDocument();
    });
  });

  it('selects a recipient when clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recipients: [mockRecentRecipient] }),
    });

    render(<UserRecipientSelector {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    // Click on the recipient
    fireEvent.click(screen.getByText('John Doe'));
    
    // Should show payment method selection
    await waitFor(() => {
      expect(screen.getByText('Selected Recipient')).toBeInTheDocument();
      expect(screen.getByText('Select Payment Method')).toBeInTheDocument();
      expect(screen.getByText('Deutsche Bank')).toBeInTheDocument();
    });
  });

  it('shows payment method selection for selected recipient', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recipients: [mockRecentRecipient] }),
    });

    render(<UserRecipientSelector {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    // Click on the recipient
    fireEvent.click(screen.getByText('John Doe'));
    
    await waitFor(() => {
      expect(screen.getByText('Deutsche Bank')).toBeInTheDocument();
      expect(screen.getByText('checking • EUR • DE • ****1234')).toBeInTheDocument();
      expect(screen.getByText('Default')).toBeInTheDocument();
    });
  });

  it('enables continue button when recipient and payment method are selected', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recipients: [mockRecentRecipient] }),
    });

    render(<UserRecipientSelector {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    // Initially continue button should be disabled
    expect(screen.getByText('Continue to Payment')).toBeDisabled();
    
    // Click on the recipient
    fireEvent.click(screen.getByText('John Doe'));
    
    await waitFor(() => {
      expect(screen.getByText('Deutsche Bank')).toBeInTheDocument();
    });
    
    // Click on the payment method
    fireEvent.click(screen.getByText('Deutsche Bank'));
    
    // Continue button should now be enabled
    await waitFor(() => {
      expect(screen.getByText('Continue to Payment')).not.toBeDisabled();
    });
  });

  it('calls onRecipientSelected when continue is clicked', async () => {
    const mockOnRecipientSelected = jest.fn();
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recipients: [mockRecentRecipient] }),
    });

    render(
      <UserRecipientSelector 
        {...defaultProps} 
        onRecipientSelected={mockOnRecipientSelected}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    // Click on the recipient
    fireEvent.click(screen.getByText('John Doe'));
    
    await waitFor(() => {
      expect(screen.getByText('Deutsche Bank')).toBeInTheDocument();
    });
    
    // Click on the payment method
    fireEvent.click(screen.getByText('Deutsche Bank'));
    
    // Click continue
    fireEvent.click(screen.getByText('Continue to Payment'));
    
    expect(mockOnRecipientSelected).toHaveBeenCalledWith(
      mockUserProfile,
      mockVerifiedPaymentMethod
    );
  });

  it('calls onBack when back button is clicked', () => {
    const mockOnBack = jest.fn();
    
    render(<UserRecipientSelector {...defaultProps} onBack={mockOnBack} />);
    
    fireEvent.click(screen.getByText('Back'));
    
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('shows error message when search fails', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recipients: [] }),
      })
      .mockRejectedValueOnce(new Error('Network error'));

    render(<UserRecipientSelector {...defaultProps} />);
    
    // Switch to search tab
    fireEvent.click(screen.getByText('Search Users'));
    
    // Type in search input
    const searchInput = screen.getByPlaceholderText('Enter email, username, or phone number...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(screen.getByText('Failed to search users. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows error message when loading recent recipients fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<UserRecipientSelector {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load recent recipients')).toBeInTheDocument();
    });
  });

  it('filters out current user from search results', async () => {
    const currentUserProfile = { ...mockUserProfile, id: 'current-user-1' };
    
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recipients: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          users: [mockUserProfile, currentUserProfile], 
          total: 2, 
          hasMore: false 
        }),
      });

    render(<UserRecipientSelector {...defaultProps} />);
    
    // Switch to search tab
    fireEvent.click(screen.getByText('Search Users'));
    
    // Type in search input
    const searchInput = screen.getByPlaceholderText('Enter email, username, or phone number...');
    fireEvent.change(searchInput, { target: { value: 'john' } });
    
    await waitFor(() => {
      // Should only show one result (current user filtered out)
      const johnDoeElements = screen.getAllByText('John Doe');
      expect(johnDoeElements).toHaveLength(1);
    });
  });

  it('shows warning when recipient has no compatible payment methods', async () => {
    const incompatibleUser = {
      ...mockUserProfile,
      verifiedPaymentMethods: [{
        ...mockVerifiedPaymentMethod,
        currency: 'GBP', // Different currency
      }],
      supportedCurrencies: ['GBP'],
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recipients: [{ ...mockRecentRecipient, userProfile: incompatibleUser }] }),
    });

    render(<UserRecipientSelector {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('✗ No verified accounts for EUR')).toBeInTheDocument();
    });
  });

  it('shows loading state while searching', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recipients: [] }),
      })
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(<UserRecipientSelector {...defaultProps} />);
    
    // Switch to search tab
    fireEvent.click(screen.getByText('Search Users'));
    
    // Type in search input
    const searchInput = screen.getByPlaceholderText('Enter email, username, or phone number...');
    fireEvent.change(searchInput, { target: { value: 'john' } });
    
    // Should show loading spinner
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  it('displays user verification status', async () => {
    const unverifiedUser = { ...mockUserProfile, isVerified: false };
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recipients: [{ ...mockRecentRecipient, userProfile: unverifiedUser }] }),
    });

    render(<UserRecipientSelector {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      // Verified checkmark should not be present
      expect(screen.queryByTestId('verified-icon')).not.toBeInTheDocument();
    });
  });

  it('displays supported currencies as badges', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recipients: [mockRecentRecipient] }),
    });

    render(<UserRecipientSelector {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('EUR')).toBeInTheDocument();
      expect(screen.getByText('USD')).toBeInTheDocument();
    });
  });
});