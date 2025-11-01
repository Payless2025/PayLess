/**
 * Wallet Integration Example - Payless Node.js SDK
 * This example shows how to connect a real Solana wallet
 */

const { createClient } = require('../src/index');
const { Keypair } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58');

// Create a wallet adapter for demo purposes
// In production, use @solana/wallet-adapter-react or similar
class SimpleWalletAdapter {
  constructor(keypair) {
    this.keypair = keypair;
    this.publicKey = keypair.publicKey.toBase58();
  }

  async signMessage(message) {
    return nacl.sign.detached(message, this.keypair.secretKey);
  }
}

async function main() {
  console.log('🔐 Payless SDK - Wallet Integration Example\n');
  
  // Generate a keypair for demo (in production, use real wallet)
  const keypair = Keypair.generate();
  const wallet = new SimpleWalletAdapter(keypair);
  
  console.log('Wallet Address:', wallet.publicKey);
  
  // Create client
  const client = createClient({
    walletAddress: 'RECIPIENT_WALLET_ADDRESS_HERE',
    network: 'mainnet-beta',
  });
  
  // Connect wallet
  client.connectWallet(wallet);
  
  console.log('✅ Wallet connected!\n');
  
  // Make a paid request with real wallet signature
  console.log('Making paid API request...');
  const response = await client.get('http://localhost:3000/api/data/weather');
  
  if (response.success) {
    console.log('✅ Payment successful!');
    console.log('Response:', response.data);
  } else {
    console.error('❌ Payment failed:', response.error);
  }
}

main().catch(console.error);

