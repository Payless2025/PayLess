/**
 * Basic Usage Example - Payless Node.js SDK
 */

const { createClient } = require('../src/index');

// Initialize the Payless client
const client = createClient({
  walletAddress: 'YOUR_RECIPIENT_WALLET_ADDRESS', // Your Solana wallet address
  network: 'mainnet-beta',
});

// Example 1: Make a simple GET request to a free endpoint
async function getFreeEndpoint() {
  console.log('Example 1: Free endpoint');
  
  const response = await client.get('http://localhost:3000/api/health');
  
  if (response.success) {
    console.log('✅ Success:', response.data);
  } else {
    console.error('❌ Error:', response.error);
  }
}

// Example 2: Make a request to a paid endpoint (auto payment)
async function getPaidEndpoint() {
  console.log('\nExample 2: Paid endpoint with automatic payment');
  
  const response = await client.get('http://localhost:3000/api/data/weather', {
    paymentAmount: '0.01', // Optional: specify amount explicitly
  });
  
  if (response.success) {
    console.log('✅ Success:', response.data);
  } else {
    console.error('❌ Error:', response.error);
  }
}

// Example 3: Make a POST request with body
async function postWithBody() {
  console.log('\nExample 3: POST request with body');
  
  const response = await client.post(
    'http://localhost:3000/api/ai/chat',
    {
      message: 'Hello, how are you?',
      model: 'gpt-3.5-turbo',
    }
  );
  
  if (response.success) {
    console.log('✅ Success:', response.data);
  } else {
    console.error('❌ Error:', response.error);
  }
}

// Example 4: Get API info
async function getApiInfo() {
  console.log('\nExample 4: Get API information');
  
  const response = await client.getApiInfo();
  
  if (response.success) {
    console.log('✅ API Info:', response.data);
  } else {
    console.error('❌ Error:', response.error);
  }
}

// Run all examples
async function main() {
  console.log('🚀 Payless Node.js SDK Examples\n');
  console.log('='.repeat(50));
  
  try {
    await getFreeEndpoint();
    await getPaidEndpoint();
    await postWithBody();
    await getApiInfo();
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ Examples completed!');
}

main();

