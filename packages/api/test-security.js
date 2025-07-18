#!/usr/bin/env node

/**
 * Security testing script for the Stealth Money API
 * Tests rate limiting, input validation, and security features
 */

const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '.env') });

const API_URL = process.env.API_URL || 'http://localhost:4000';
const API_KEY = process.env.API_KEY;

async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: await response.json().catch(() => ({}))
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message
    };
  }
}

async function testRateLimit() {
  console.log('Testing Rate Limiting...\n');
  
  const requests = [];
  const startTime = Date.now();
  
  // Make 15 rapid requests to test rate limiting
  for (let i = 0; i < 15; i++) {
    requests.push(makeRequest('/health'));
  }
  
  const results = await Promise.all(requests);
  const endTime = Date.now();
  
  const successCount = results.filter(r => r.status === 200).length;
  const rateLimitedCount = results.filter(r => r.status === 429).length;
  
  console.log('Rate Limiting Test Results:');
  console.log(`  Total requests: ${results.length}`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Rate limited: ${rateLimitedCount}`);
  console.log(`  Time taken: ${endTime - startTime}ms`);
  
  if (rateLimitedCount > 0) {
    console.log('  Status: PASS - Rate limiting is working');
  } else {
    console.log('  Status: INFO - No rate limiting detected (may be disabled in dev mode)');
  }
  
  console.log();
}

async function testInputValidation() {
  console.log('Testing Input Validation...\n');
  
  const testCases = [
    {
      name: 'Invalid amount (negative)',
      data: { amount: -100, sourceCurrency: 'USD', destCurrency: 'EUR' }
    },
    {
      name: 'Invalid currency (too long)',
      data: { amount: 100, sourceCurrency: 'INVALID', destCurrency: 'EUR' }
    },
    {
      name: 'Missing required fields',
      data: { amount: 100 }
    },
    {
      name: 'XSS attempt in recipient name',
      data: { 
        amount: 100, 
        sourceCurrency: 'USD', 
        destCurrency: 'EUR',
        recipientName: '<script>alert("xss")</script>'
      }
    }
  ];
  
  console.log('Input Validation Test Results:');
  
  for (const testCase of testCases) {
    const result = await makeRequest('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCase.data)
    });
    
    const isBlocked = result.status === 400;
    console.log(`  ${testCase.name}: ${isBlocked ? 'PASS' : 'FAIL'} (${result.status})`);
  }
  
  console.log();
}

async function testAPIKeyAuth() {
  console.log('Testing API Key Authentication...\n');
  
  // Test without API key
  const withoutKey = await makeRequest('/api/test-orchestrator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId: 'test' })
  });
  
  // Test with API key (if configured)
  let withKey = { status: 'N/A', data: { message: 'No API key configured' } };
  if (API_KEY) {
    withKey = await makeRequest('/api/test-orchestrator', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({ transactionId: 'test' })
    });
  }
  
  console.log('API Key Authentication Test Results:');
  console.log(`  Without API key: ${withoutKey.status === 401 ? 'PASS' : 'INFO'} (${withoutKey.status})`);
  console.log(`  With API key: ${withKey.status !== 401 ? 'PASS' : 'FAIL'} (${withKey.status})`);
  
  if (!API_KEY) {
    console.log('  Note: API_KEY not configured - authentication may be disabled in dev mode');
  }
  
  console.log();
}

async function testSecurityHeaders() {
  console.log('Testing Security Headers...\n');
  
  const result = await makeRequest('/health');
  const headers = result.headers;
  
  const securityHeaders = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'x-download-options': 'noopen',
    'x-dns-prefetch-control': 'off',
    'referrer-policy': 'no-referrer'
  };
  
  console.log('Security Headers Test Results:');
  
  for (const [header, expectedValue] of Object.entries(securityHeaders)) {
    const actualValue = headers[header];
    const isPresent = actualValue === expectedValue;
    console.log(`  ${header}: ${isPresent ? 'PASS' : 'FAIL'} (${actualValue || 'missing'})`);
  }
  
  // Check for request ID
  const hasRequestId = !!headers['x-request-id'];
  console.log(`  x-request-id: ${hasRequestId ? 'PASS' : 'FAIL'} (${headers['x-request-id'] || 'missing'})`);
  
  console.log();
}

async function testTransferCreationRateLimit() {
  console.log('Testing Transfer Creation Rate Limiting...\n');
  
  const requests = [];
  const startTime = Date.now();
  
  // Make 5 rapid transfer creation requests
  for (let i = 0; i < 5; i++) {
    requests.push(makeRequest('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 100,
        sourceCurrency: 'USD',
        destCurrency: 'EUR'
      })
    }));
  }
  
  const results = await Promise.all(requests);
  const endTime = Date.now();
  
  const successCount = results.filter(r => r.status === 201).length;
  const rateLimitedCount = results.filter(r => r.status === 429).length;
  const validationErrors = results.filter(r => r.status === 400).length;
  
  console.log('Transfer Creation Rate Limiting Test Results:');
  console.log(`  Total requests: ${results.length}`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Rate limited: ${rateLimitedCount}`);
  console.log(`  Validation errors: ${validationErrors}`);
  console.log(`  Time taken: ${endTime - startTime}ms`);
  
  if (rateLimitedCount > 0) {
    console.log('  Status: PASS - Transfer rate limiting is working');
  } else {
    console.log('  Status: INFO - No transfer rate limiting detected');
  }
  
  console.log();
}

async function runAllTests() {
  console.log('Stealth Money API Security Test Suite\n');
  console.log(`Testing API at: ${API_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Key configured: ${API_KEY ? 'Yes' : 'No'}\n`);
  
  try {
    await testRateLimit();
    await testInputValidation();
    await testAPIKeyAuth();
    await testSecurityHeaders();
    await testTransferCreationRateLimit();
    
    console.log('Security test suite completed!');
    console.log('\nNote: Some tests may show INFO status in development mode');
    console.log('For full security testing, run in production mode with proper configuration');
    
  } catch (error) {
    console.error('Test suite failed:', error.message);
    process.exit(1);
  }
}

// Add fetch polyfill for Node.js < 18
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

runAllTests();