"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  User, 
  Mail, 
  Phone, 
  CreditCard, 
  Clock, 
  Star,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Users
} from "lucide-react";
import { 
  isValidChileanUser, 
  formatChileanUserDisplay,
  isChileanUsernamePattern 
} from "@/lib/chilean-utils";

// Types for user-to-user transfers
export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  profileImageUrl?: string;
  isVerified: boolean;
  verifiedPaymentMethods: VerifiedPaymentMethod[];
  supportedCurrencies: string[];
  lastActiveAt?: string;
  createdAt: string;
}

export interface VerifiedPaymentMethod {
  id: string;
  type: 'bank_account' | 'mobile_wallet' | 'debit_card';
  currency: string;
  bankName?: string;
  accountType?: string;
  lastFourDigits?: string;
  isDefault: boolean;
  verifiedAt: string;
  country: string;
}

export interface RecentRecipient {
  id: string;
  userId: string;
  userProfile: UserProfile;
  lastTransferAt: string;
  transferCount: number;
  totalAmountSent: number;
  averageAmount: number;
  preferredCurrency: string;
  isFrequent: boolean;
  isFavorite: boolean;
}

export interface UserSearchResult {
  users: UserProfile[];
  total: number;
  hasMore: boolean;
}

export interface UserRecipientSelectorProps {
  transferData: {
    sendAmount: number;
    receiveAmount: number;
    sendCurrency: string;
    receiveCurrency: string;
    exchangeRate: number;
    fees: number;
  };
  onRecipientSelected: (recipient: UserProfile, paymentMethod: VerifiedPaymentMethod) => void;
  onBack: () => void;
  currentUserId?: string;
  isLoading?: boolean;
}

export function UserRecipientSelector({
  transferData,
  onRecipientSelected,
  onBack,
  currentUserId,
  isLoading = false
}: UserRecipientSelectorProps) {
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Recent recipients state
  const [recentRecipients, setRecentRecipients] = useState<RecentRecipient[]>([]);
  const [isLoadingRecents, setIsLoadingRecents] = useState(false);
  const [recentsError, setRecentsError] = useState<string | null>(null);
  
  // Selected recipient state
  const [selectedRecipient, setSelectedRecipient] = useState<UserProfile | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<VerifiedPaymentMethod | null>(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'search' | 'recent'>('recent');

  // Load recent recipients on component mount
  useEffect(() => {
    if (currentUserId) {
      loadRecentRecipients();
    }
  }, [currentUserId]);

  // Debounced search effect
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        performUserSearch(searchQuery.trim());
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError(null);
    }
  }, [searchQuery]);

  // Load recent recipients
  const loadRecentRecipients = useCallback(async () => {
    if (!currentUserId) return;
    
    setIsLoadingRecents(true);
    setRecentsError(null);
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_URL}/api/users/me/recipients`, {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load recent recipients');
      }

      const data = await response.json();
      setRecentRecipients(data.recipients || []);
    } catch (error) {
      console.error('Error loading recent recipients:', error);
      setRecentsError('Failed to load recent recipients');
      setRecentRecipients([]);
    } finally {
      setIsLoadingRecents(false);
    }
  }, [currentUserId]);

  // Perform user search
  const performUserSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    setSearchError(null);
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const searchParams = new URLSearchParams({
        q: query,
        currency: transferData.receiveCurrency,
        limit: '10'
      });

      // Add Chilean user filtering for CLP transfers
      if (transferData.receiveCurrency === 'CLP') {
        searchParams.append('country', 'CL');
      }
      
      const response = await fetch(`${API_URL}/api/users/search?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const data: UserSearchResult = await response.json();
      
      // Filter out current user from results and ensure Chilean users have verified CLP accounts
      const filteredUsers = data.users.filter(user => {
        if (user.id === currentUserId) return false;
        
        // For CLP transfers, ensure user has verified Chilean bank account
        if (transferData.receiveCurrency === 'CLP') {
          return user.verifiedPaymentMethods.some(method => 
            method.currency === 'CLP' && method.country === 'CL'
          );
        }
        
        return true;
      });
      
      setSearchResults(filteredUsers);
      setHasSearched(true);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchError('Failed to search users. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [transferData.receiveCurrency, currentUserId]);

  // Get authentication token from Clerk
  const getAuthToken = async (): Promise<string> => {
    if (typeof window === 'undefined') return '';
    
    try {
      // Get token from Clerk auth context
      const token = sessionStorage.getItem('__clerk_token') || 
                   localStorage.getItem('__clerk_token') ||
                   'mock-token'; // Fallback for development
      return token;
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      return 'mock-token';
    }
  };

  // Handle recipient selection
  const handleRecipientClick = (recipient: UserProfile) => {
    setSelectedRecipient(recipient);
    
    // Auto-select the default payment method for the target currency
    const compatibleMethods = recipient.verifiedPaymentMethods.filter(
      method => method.currency === transferData.receiveCurrency
    );
    
    const defaultMethod = compatibleMethods.find(method => method.isDefault) || compatibleMethods[0];
    
    if (defaultMethod) {
      setSelectedPaymentMethod(defaultMethod);
    }
  };

  // Handle payment method selection
  const handlePaymentMethodSelect = (method: VerifiedPaymentMethod) => {
    setSelectedPaymentMethod(method);
  };

  // Handle continue with selected recipient
  const handleContinue = () => {
    if (selectedRecipient && selectedPaymentMethod) {
      onRecipientSelected(selectedRecipient, selectedPaymentMethod);
    }
  };

  // Render user profile card
  const renderUserProfile = (user: UserProfile, isRecent = false, recentData?: RecentRecipient) => {
    const compatibleMethods = user.verifiedPaymentMethods.filter(
      method => method.currency === transferData.receiveCurrency
    );
    
    const isSelected = selectedRecipient?.id === user.id;
    
    // Use Chilean formatting for CLP transfers
    const isChileanTransfer = transferData.receiveCurrency === 'CLP';
    const displayInfo = isChileanTransfer ? formatChileanUserDisplay(user) : null;
    
    return (
      <Card 
        key={user.id} 
        className={`cursor-pointer transition-all hover:shadow-md ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
        }`}
        onClick={() => handleRecipientClick(user)}
      >
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            {/* Profile Image or Avatar */}
            <div className="flex-shrink-0">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={displayInfo?.displayName || user.fullName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
              )}
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {displayInfo?.displayName || user.fullName}
                </h3>
                {user.isVerified && (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
                {isRecent && recentData?.isFavorite && (
                  <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                )}
              </div>
              
              {/* Subtitle with username or email */}
              {(displayInfo?.subtitle || user.email || user.username) && (
                <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                  {displayInfo?.subtitle ? (
                    <span className="truncate">{displayInfo.subtitle}</span>
                  ) : (
                    <>
                      {user.email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      )}
                      {user.username && (
                        <div className="flex items-center space-x-1">
                          <span>@{user.username}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {/* Recent transfer info */}
              {isRecent && recentData && (
                <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Last: {new Date(recentData.lastTransferAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    {recentData.transferCount} transfer{recentData.transferCount !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
              
              {/* Chilean-specific badges or regular currency badges */}
              <div className="flex flex-wrap gap-1 mb-2">
                {isChileanTransfer && displayInfo?.badges ? (
                  displayInfo.badges.map((badge, index) => (
                    <Badge 
                      key={index}
                      variant={badge.includes('CLP') ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {badge}
                    </Badge>
                  ))
                ) : (
                  user.supportedCurrencies.map(currency => (
                    <Badge 
                      key={currency} 
                      variant={currency === transferData.receiveCurrency ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {currency}
                    </Badge>
                  ))
                )}
              </div>
              
              {/* Compatible payment methods */}
              {compatibleMethods.length > 0 ? (
                <div className="text-xs text-green-600">
                  ✓ {compatibleMethods.length} verified account{compatibleMethods.length !== 1 ? 's' : ''} for {transferData.receiveCurrency}
                  {isChileanTransfer && (
                    <span className="ml-1">(Chilean bank)</span>
                  )}
                </div>
              ) : (
                <div className="text-xs text-red-600">
                  ✗ No verified accounts for {transferData.receiveCurrency}
                  {isChileanTransfer && (
                    <span className="ml-1">(Need Chilean bank account)</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render payment method selection
  const renderPaymentMethodSelection = () => {
    if (!selectedRecipient) return null;
    
    const compatibleMethods = selectedRecipient.verifiedPaymentMethods.filter(
      method => method.currency === transferData.receiveCurrency
    );
    
    if (compatibleMethods.length === 0) {
      return (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">No Compatible Payment Methods</span>
            </div>
            <p className="text-red-600 text-sm mt-1">
              {selectedRecipient.fullName} doesn't have any verified accounts that can receive {transferData.receiveCurrency}.
            </p>
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Select Payment Method</CardTitle>
          <p className="text-xs text-gray-600">
            Choose how {selectedRecipient.fullName} should receive the {transferData.receiveCurrency}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {compatibleMethods.map(method => (
            <div
              key={method.id}
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                selectedPaymentMethod?.id === method.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handlePaymentMethodSelect(method)}
            >
              <div className="flex items-center space-x-3">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">
                      {method.bankName || `${method.type.replace('_', ' ')}`}
                    </span>
                    {method.isDefault && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {method.accountType} • {method.currency} • {method.country}
                    {method.lastFourDigits && ` • ****${method.lastFourDigits}`}
                  </div>
                  <div className="text-xs text-gray-400">
                    Verified {new Date(method.verifiedAt).toLocaleDateString()}
                  </div>
                </div>
                {selectedPaymentMethod?.id === method.id && (
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Send to User</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Send {transferData.sendAmount} {transferData.sendCurrency} to a registered user
          </p>
        </CardHeader>
      </Card>

      {/* Transfer Summary */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2">Transfer Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">You Send:</span>
              <span className="font-medium">{transferData.sendAmount} {transferData.sendCurrency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">They Receive:</span>
              <span className="font-medium">{transferData.receiveAmount} {transferData.receiveCurrency}</span>
            </div>
            <div className="flex justify-between col-span-2">
              <span className="text-gray-600">Exchange Rate:</span>
              <span className="font-medium">1 {transferData.sendCurrency} = {transferData.exchangeRate.toFixed(4)} {transferData.receiveCurrency}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'recent'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setActiveTab('recent')}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Recent Recipients
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'search'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setActiveTab('search')}
        >
          <Search className="w-4 h-4 inline mr-2" />
          Search Users
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'search' && (
          <>
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="user-search">
                {transferData.receiveCurrency === 'CLP' 
                  ? 'Search Chilean users by username, email, or phone' 
                  : 'Search by email, username, or phone'
                }
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="user-search"
                  placeholder={
                    transferData.receiveCurrency === 'CLP'
                      ? "Enter username, email, or phone number..."
                      : "Enter email, username, or phone number..."
                  }
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
              {transferData.receiveCurrency === 'CLP' && (
                <p className="text-xs text-gray-500">
                  Only showing Chilean users with verified CLP bank accounts
                </p>
              )}
            </div>

            {/* Search Results */}
            {searchError && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    <span>{searchError}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {hasSearched && !isSearching && searchResults.length === 0 && !searchError && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-600">
                    {transferData.receiveCurrency === 'CLP' 
                      ? `No Chilean users found matching "${searchQuery}" with verified CLP bank accounts. Try a different search term.`
                      : `No users found matching "${searchQuery}". Try a different search term.`
                    }
                  </p>
                </CardContent>
              </Card>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Search Results ({searchResults.length})
                </h3>
                {searchResults.map(user => renderUserProfile(user))}
              </div>
            )}
          </>
        )}

        {activeTab === 'recent' && (
          <>
            {recentsError && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    <span>{recentsError}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {isLoadingRecents ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Loading recent recipients...</p>
                </CardContent>
              </Card>
            ) : recentRecipients.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No recent recipients</h3>
                  <p className="text-gray-600 mb-4">
                    You haven't sent money to any users yet. Use the search tab to find someone to send money to.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('search')}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search Users
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Recent Recipients ({recentRecipients.length})
                </h3>
                {recentRecipients.map(recent => 
                  renderUserProfile(recent.userProfile, true, recent)
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Method Selection */}
      {selectedRecipient && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Selected Recipient</h3>
          {renderUserProfile(selectedRecipient)}
          {renderPaymentMethodSelection()}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <Button
          onClick={handleContinue}
          disabled={!selectedRecipient || !selectedPaymentMethod || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Continue to Payment
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}