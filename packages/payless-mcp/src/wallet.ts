/**
 * The agent's wallet.
 *
 * The key is read from the environment of this process and never leaves it. It
 * is not a tool input, it is not in any tool's output, and it is never shown to
 * the model — an agent cannot leak a secret it was never handed.
 *
 * This is the agent operator's own key, funded with a small amount on purpose.
 * Treat it as pocket money, not as a treasury: whatever is in this wallet is
 * what a confused or manipulated agent could conceivably spend, bounded further
 * by the budget in budget.ts.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  formatUnits,
  parseUnits,
  getAddress,
  type Chain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const ROBINHOOD_CHAIN: Chain = {
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.chain.robinhood.com'] },
    public: { http: ['https://rpc.mainnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' },
  },
};

const ERC20 = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

export class AgentWallet {
  readonly address: `0x${string}`;
  private account;
  private pub;
  private wallet;

  constructor(privateKey: string, rpcUrl = ROBINHOOD_CHAIN.rpcUrls.default.http[0]) {
    const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error('PAYLESS_AGENT_PRIVATE_KEY must be a 32-byte hex private key.');
    }
    this.account = privateKeyToAccount(key as `0x${string}`);
    this.address = this.account.address;
    const transport = http(rpcUrl);
    this.pub = createPublicClient({ chain: ROBINHOOD_CHAIN, transport });
    this.wallet = createWalletClient({ account: this.account, chain: ROBINHOOD_CHAIN, transport });
  }

  async balances(token: `0x${string}`) {
    const [eth, raw, decimals, symbol] = await Promise.all([
      this.pub.getBalance({ address: this.address }),
      this.pub.readContract({ address: token, abi: ERC20, functionName: 'balanceOf', args: [this.address] }),
      this.pub.readContract({ address: token, abi: ERC20, functionName: 'decimals' }),
      this.pub.readContract({ address: token, abi: ERC20, functionName: 'symbol' }),
    ]);
    const dp = Number(decimals);
    return {
      address: this.address,
      gas: { symbol: 'ETH', balance: formatEther(eth) },
      token: { symbol: symbol as string, address: token, decimals: dp, balance: formatUnits(raw as bigint, dp) },
    };
  }

  /** Send the transfer and wait for it, because an unmined receipt buys nothing. */
  async pay(params: { to: string; amount: string; token: `0x${string}`; decimals: number }) {
    const hash = await this.wallet.writeContract({
      address: params.token,
      abi: ERC20,
      functionName: 'transfer',
      args: [getAddress(params.to), parseUnits(params.amount as `${number}`, params.decimals)],
    });
    const receipt = await this.pub.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') {
      throw new Error(`Transfer ${hash} reverted on chain.`);
    }
    return hash;
  }
}

export function walletFromEnv(env = process.env): AgentWallet | null {
  const key = env.PAYLESS_AGENT_PRIVATE_KEY;
  if (!key) return null;
  return new AgentWallet(key, env.PAYLESS_RPC_URL || undefined);
}
