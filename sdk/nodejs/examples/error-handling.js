/**
 * Error Handling Example - Payless Node.js SDK
 * Demonstrates how to handle various error scenarios
 */

const { createClient } = require('../src/index');

const client = createClient({
  walletAddress: 'YOUR_WALLET_ADDRESS',
  network: 'mainnet-beta',
});

// Example 1: Handle 402 Payment Required
async function handlePaymentRequired() {
  console.log('Example 1: Handle 402 Payment Required');
  
  const response = await client.get('http://localhost:3000/api/premium/content');
  
  if (!response.success && response.status === 402) {
    console.log('⚠️  Payment required for this endpoint');
    console.log('Error:', response.error);
  }
}

// Example 2: Handle Invalid Endpoint
async function handleInvalidEndpoint() {
  console.log('\nExample 2: Handle Invalid Endpoint');
  
  const response = await client.get('http://localhost:3000/api/nonexistent');
  
  if (!response.success) {
    console.log(`❌ Error ${response.status}:`, response.error);
  }
}

// Example 3: Handle Network Errors
async function handleNetworkError() {
  console.log('\nExample 3: Handle Network Errors');
  
  const response = await client.get('http://invalid-domain-that-does-not-exist.com/api/test');
  
  if (!response.success) {
    console.log('❌ Network error:', response.error);
    console.log('Status code:', response.status); // Will be 0 for network errors
  }
}

// Example 4: Handle Validation Errors
async function handleValidationError() {
  console.log('\nExample 4: Handle Validation Errors');
  
  const response = await client.post('http://localhost:3000/api/ai/chat', {
    // Missing required fields
  });
  
  if (!response.success) {
    console.log('❌ Validation error:', response.error);
    console.log('Status:', response.status);
  }
}

// Example 5: Proper Error Handling Pattern
async function properErrorHandling() {
  console.log('\nExample 5: Proper Error Handling Pattern');
  
  try {
    const response = await client.get('http://localhost:3000/api/data/weather');
    
    if (response.success) {
      console.log('✅ Success:', response.data);
      return response.data;
    } else {
      // Handle specific error codes
      switch (response.status) {
        case 402:
          console.error('Payment required. Please ensure wallet is connected.');
          break;
        case 404:
          console.error('Endpoint not found.');
          break;
        case 500:
          console.error('Server error. Please try again later.');
          break;
        default:
          console.error('Request failed:', response.error);
      }
      return null;
    }
  } catch (error) {
    console.error('Unexpected error:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚨 Payless SDK - Error Handling Examples\n');
  console.log('='.repeat(50));
  
  await handlePaymentRequired();
  await handleInvalidEndpoint();
  await handleNetworkError();
  await handleValidationError();
  await properErrorHandling();
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ Error handling examples completed!');
}

main().catch(console.error);

