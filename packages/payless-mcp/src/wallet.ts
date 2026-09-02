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

export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const;
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
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/** The EIP-712 shapes Permit2 signs. Both witnesses, since the schemes differ. */
const PERMIT_TYPES = {
  exact: {
    PermitWitnessTransferFrom: [
      { name: 'permitted', type: 'TokenPermissions' },
      { name: 'spender', type: 'address' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'witness', type: 'Witness' },
    ],
    TokenPermissions: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    Witness: [
      { name: 'to', type: 'address' },
      { name: 'validAfter', type: 'uint256' },
    ],
  },
  upto: {
    PermitWitnessTransferFrom: [
      { name: 'permitted', type: 'TokenPermissions' },
      { name: 'spender', type: 'address' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'witness', type: 'Witness' },
    ],
    TokenPermissions: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    Witness: [
      { name: 'to', type: 'address' },
      { name: 'facilitator', type: 'address' },
      { name: 'validAfter', type: 'uint256' },
    ],
  },
} as const;

export interface SignedPermit {
  scheme: 'exact' | 'upto';
  owner: string;
  permitted: { token: string; amount: string };
  nonce: string;
  deadline: string;
  witness: { to: string; validAfter: string; facilitator?: string };
  signature: string;
}

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

  /** What Permit2 may currently pull on this agent's behalf. */
  async permit2Allowance(token: `0x${string}`): Promise<bigint> {
    return (await this.pub.readContract({
      address: token,
      abi: ERC20,
      functionName: 'allowance',
      args: [this.address, PERMIT2_ADDRESS],
    })) as bigint;
  }

  /**
   * Approve Permit2, once, so later payments need no transaction at all.
   *
   * Deliberately not an infinite approval. The agent approves what its budget
   * allows and no more, so the standing exposure of this wallet never exceeds
   * what it was allowed to spend anyway. An unlimited approval would quietly
   * make the budget meaningless the moment the key leaked.
   */
  async approvePermit2(token: `0x${string}`, amount: bigint): Promise<string> {
    const hash = await this.wallet.writeContract({
      address: token,
      abi: ERC20,
      functionName: 'approve',
      args: [PERMIT2_ADDRESS, amount],
    });
    const receipt = await this.pub.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error(`approve ${hash} reverted`);
    return hash;
  }

  /**
   * Sign an authorisation. No transaction, no gas, no waiting for a block.
   *
   * The facilitator broadcasts this and pays for it. Note what the signature
   * pins: the destination, the token, the ceiling, and for `upto` the one
   * facilitator allowed to choose the final amount. None of those can be
   * changed by whoever relays it.
   */
  async signPermit(params: {
    scheme: 'exact' | 'upto';
    token: `0x${string}`;
    amount: bigint;
    to: string;
    spender: string;
    facilitator?: string;
    validAfter?: bigint;
    ttlSeconds?: number;
  }): Promise<SignedPermit> {
    const { scheme, token, amount, to, spender } = params;
    if (scheme === 'upto' && !params.facilitator) {
      throw new Error('An upto authorisation has to name the facilitator allowed to settle it.');
    }

    // Unordered nonces: any unused value works, so a timestamp cannot collide
    // with itself across restarts the way a counter would.
    const nonce = BigInt(Date.now()) * BigInt(1000) + BigInt(Math.floor(Math.random() * 1000));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + (params.ttlSeconds ?? 600));
    const validAfter = params.validAfter ?? BigInt(0);

    const witness =
      scheme === 'upto'
        ? { to: getAddress(to), facilitator: getAddress(params.facilitator!), validAfter }
        : { to: getAddress(to), validAfter };

    const signature = await this.account.signTypedData({
      domain: { name: 'Permit2', chainId: ROBINHOOD_CHAIN.id, verifyingContract: PERMIT2_ADDRESS },
      types: PERMIT_TYPES[scheme] as any,
      primaryType: 'PermitWitnessTransferFrom',
      message: {
        permitted: { token: getAddress(token), amount },
        spender: getAddress(spender),
        nonce,
        deadline,
        witness,
      } as any,
    });

    return {
      scheme,
      owner: this.address,
      permitted: { token: getAddress(token), amount: amount.toString() },
      nonce: nonce.toString(),
      deadline: deadline.toString(),
      witness: {
        to: getAddress(to),
        validAfter: validAfter.toString(),
        ...(scheme === 'upto' ? { facilitator: getAddress(params.facilitator!) } : {}),
      },
      signature,
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
