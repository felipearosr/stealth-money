# Implementation Plan

- [x] 1. Add multi-currency support to TransferCalculator
  - Add currency dropdown selectors for send and receive currencies
  - Implement support for USD, EUR, CLP, MXN, GBP with proper formatting
  - Add currency-specific validation (min/max amounts, decimal places)
  - Update calculation API calls to support different currency pairs
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 2. Add calculator mode switcher (You Send vs Recipient Gets)
  - Create toggle component to switch between "You Send" and "Recipient Gets" modes
  - Implement calculation logic for both modes (send amount → receive amount and vice versa)
  - Update form labels and placeholders based on selected mode
  - Preserve mode selection in component state and transfer flow
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 3. Fix TransferCalculator to always show form
  - Modify TransferCalculator component to display form fields even when amount is empty
  - Add helpful placeholder text and guidance for empty states
  - Remove conditional rendering that hides the form when no calculation exists
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4. Add Continue button and navigation to TransferCalculator
  - Add prominent Continue/Next button that appears when calculation is valid
  - Implement onContinue callback prop to handle navigation to next step
  - Add loading state for the continue button during navigation
  - _Requirements: 2.1, 2.2_

- [x] 5. Add multi-currency backend API support
  - Update /api/transfers/calculate endpoint to support multiple currency pairs
  - Add currency validation and exchange rate fetching for new currencies
  - Update transfer creation endpoint to handle different destination currencies
  - Add currency configuration and limits management
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 6. Create TransferFlowContainer with multi-step navigation
  - Create main container component that manages the multi-step transfer flow
  - Implement step navigation logic (calculator → recipient → payment → status)
  - Add progress indicator component showing current step and completed steps
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 7. Create UserRecipientSelector component for user-to-user transfers
  - Build component for searching and selecting registered users as recipients
  - Implement user search by email, username, or phone number
  - Display recipient user profiles with verified payment methods
  - Add recent/frequent recipients list for quick selection
  - Show recipient's supported currencies based on their verified bank accounts
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Add user search and recipient management API endpoints
  - Create GET /api/users/search endpoint to find users by email/username/phone
  - Create GET /api/users/me/recipients endpoint to fetch user's recent recipients
  - Create POST /api/users/me/recipients endpoint to save frequently used recipients
  - Add user verification status and supported currencies in search results
  - Implement privacy controls for user discoverability
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 8.1. Create user bank account management system
  - Create GET /api/users/me/bank-accounts endpoint to fetch user's verified accounts
  - Create POST /api/users/me/bank-accounts endpoint to add new bank accounts
  - Create PUT /api/users/me/bank-accounts/:id endpoint to update account details
  - Create DELETE /api/users/me/bank-accounts/:id endpoint to remove accounts
  - Add bank account verification workflow with micro-deposits or instant verification
  - Support multiple currencies per user (USD, EUR, CLP, MXN, GBP accounts)
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 8.2. Create user onboarding flow for bank account setup
  - Build onboarding component that requires bank account setup before transfers
  - Implement step-by-step bank account addition with validation
  - Add support for different account types per currency (IBAN, CLABE, ACH, etc.)
  - Create verification status tracking and retry mechanisms
  - Prevent transfers until at least one bank account is verified
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 9. Enhance PaymentForm for user-to-user transfers
  - Add transfer summary showing sender, recipient user, amounts, and currencies
  - Display recipient's verified bank account information (masked for security)
  - Update form to only require sender's payment method (card details)
  - Show recipient user profile and selected destination currency
  - Integrate back navigation to previous step
  - Add success callback to navigate to status page after payment
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 10. Create shared state management with React Context
  - Implement TransferFlowContext for managing transfer state across components
  - Add multi-currency state management and calculator mode persistence
  - Add state persistence to localStorage for unauthenticated users
  - Implement state cleanup and expiry based on rate validity
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 11. Integrate authentication flow with user-to-user transfer process
  - Add authentication prompts when users try to proceed past calculation
  - Preserve transfer state during sign-in process
  - Pre-fill user information for authenticated users
  - Check user's bank account verification status before allowing transfers
  - Redirect to bank account setup if user hasn't verified any accounts
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 12. Update main page to use new TransferFlowContainer
  - Replace standalone TransferCalculator with TransferFlowContainer
  - Update page routing to handle multi-step flow
  - Add proper error boundaries for the transfer flow
  - _Requirements: 1.1, 2.1, 6.1_

- [ ] 13. Enhance TransferStatus with multi-currency display
  - Update status display to show correct currencies and amounts
  - Improve real-time status updates using existing webhook system
  - Add better mobile optimization for status display
  - Implement completion actions (share, repeat transfer)
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 14. Add mobile optimization and responsive design
  - Optimize all components for mobile viewport and touch interactions
  - Add swipe navigation between steps on mobile
  - Implement mobile-specific form optimizations for currency selectors
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 15. Implement comprehensive error handling
  - Add error boundaries for each step of the transfer flow
  - Implement retry mechanisms for failed API calls
  - Add user-friendly error messages with actionable guidance
  - Add currency-specific error handling and validation messages
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 16. Add form validation and user feedback
  - Implement real-time validation for all form inputs including currency-specific rules
  - Add loading states and progress indicators throughout the flow
  - Create consistent error message display patterns
  - Add currency formatting and input helpers
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 17. Create integration tests for complete multi-currency transfer flow
  - Write end-to-end tests covering the entire transfer process with different currencies
  - Test calculator mode switching and currency conversion accuracy
  - Test authentication integration and state preservation
  - Test error scenarios and recovery mechanisms
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1_

- [ ] 18. Update dashboard to integrate with new transfer flow
  - Update "New Transfer" buttons to use the new flow
  - Ensure proper navigation from dashboard to transfer flow
  - Add transfer history integration with new recipient management
  - Display multi-currency transfer history with proper formatting
  - _Requirements: 2.1, 7.3_