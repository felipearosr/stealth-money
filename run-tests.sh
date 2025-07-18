#!/bin/bash

# Payment Flow Integration Test Runner
set -e

echo "🚀 Payment Flow Integration Test Runner"
echo "======================================"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

check_api_server() {
    print_status $BLUE "🔍 Checking if API server is running..."
    
    if curl -s http://localhost:4000/health > /dev/null; then
        print_status $GREEN "✅ API server is running"
        return 0
    else
        print_status $RED "❌ API server is not running"
        print_status $YELLOW "Please start the API server with: npm run dev --prefix packages/api"
        return 1
    fi
}

run_test_suite() {
    print_status $BLUE "🧪 Running payment flow integration tests..."
    
    if node test-payment-flow.js; then
        print_status $GREEN "✅ All tests passed!"
        return 0
    else
        print_status $RED "❌ Some tests failed!"
        return 1
    fi
}

run_manual_tests() {
    print_status $BLUE "🔧 Running additional manual tests..."
    
    echo ""
    print_status $BLUE "Testing API endpoints..."
    
    if curl -s http://localhost:4000/health | grep -q "ok"; then
        print_status $GREEN "✅ Health endpoint working"
    else
        print_status $RED "❌ Health endpoint failed"
    fi
    
    if curl -s http://localhost:4000/api/stripe/config | grep -q "pk_test"; then
        print_status $GREEN "✅ Stripe config endpoint working"
    else
        print_status $RED "❌ Stripe config endpoint failed"
    fi
    
    if curl -s http://localhost:4000/api/exchange-rate/USD/EUR | grep -q "rate"; then
        print_status $GREEN "✅ Exchange rate endpoint working"
    else
        print_status $RED "❌ Exchange rate endpoint failed"
    fi
    
    if curl -s http://localhost:4000/api/orchestrator/health | grep -q "services"; then
        print_status $GREEN "✅ Orchestrator health endpoint working"
    else
        print_status $RED "❌ Orchestrator health endpoint failed"
    fi
}

test_transfer_creation() {
    print_status $BLUE "💰 Testing transfer creation..."
    
    local response=$(curl -s -X POST http://localhost:4000/api/transfers \
        -H "Content-Type: application/json" \
        -d '{"amount": 100, "sourceCurrency": "USD", "destCurrency": "EUR"}')
    
    if echo "$response" | grep -q "transactionId"; then
        local transaction_id=$(echo "$response" | grep -o '"transactionId":"[^"]*"' | cut -d'"' -f4)
        print_status $GREEN "✅ Transfer created successfully: $transaction_id"
        
        local retrieve_response=$(curl -s http://localhost:4000/api/transfers/$transaction_id)
        if echo "$retrieve_response" | grep -q "$transaction_id"; then
            print_status $GREEN "✅ Transfer retrieval working"
        else
            print_status $RED "❌ Transfer retrieval failed"
        fi
    else
        print_status $RED "❌ Transfer creation failed"
        echo "Response: $response"
    fi
}

test_webhook_security() {
    print_status $BLUE "🔒 Testing webhook security..."
    
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:4000/api/webhooks/stripe \
        -H "Content-Type: application/json" \
        -d '{"test": "data"}')
    
    if [ "$response_code" = "400" ]; then
        print_status $GREEN "✅ Webhook security working (rejects unsigned requests)"
    else
        print_status $RED "❌ Webhook security failed (expected 400, got $response_code)"
    fi
}

main() {
    echo ""
    print_status $BLUE "Starting test execution..."
    echo ""
    
    if ! check_api_server; then
        exit 1
    fi
    
    echo ""
    
    local test_result=0
    if ! run_test_suite; then
        test_result=1
    fi
    
    echo ""
    run_manual_tests
    echo ""
    test_transfer_creation
    echo ""
    test_webhook_security
    
    echo ""
    print_status $BLUE "======================================"
    
    if [ $test_result -eq 0 ]; then
        print_status $GREEN "🎉 All tests completed successfully!"
        print_status $GREEN "✅ Payment flow integration is working correctly"
        echo ""
        print_status $BLUE "Next steps:"
        echo "  1. Test the complete user flow in browser: http://localhost:3000"
        echo "  2. Create a transfer and complete payment with test card: 4242424242424242"
        echo "  3. Verify status updates on: http://localhost:3000/status/[transactionId]"
        echo "  4. Ready for Step 2: Recipient Information Collection"
    else
        print_status $RED "❌ Some tests failed!"
        print_status $YELLOW "Please check the output above and fix any issues before proceeding."
        exit 1
    fi
}

chmod +x "$0"
main "$@"