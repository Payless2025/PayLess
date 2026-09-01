/**
 * A collector that signs with a local private key.
 *
 * This is deliberately not imported by the web app. The key it needs can pull
 * from every subscriber who has approved us, and a web process that never holds
 * it cannot leak it. Run it from `scripts/collect.mjs`, in its own process, with
 * its own environment.
 *
 * The interface is the same one a KMS or Turnkey signer would implement, so
 * moving the key somewhere better later touches this file and nothing else.
 *
 * One subtlety worth stating: `onBroadcast` is awaited before the receipt is,
 * which means the hash is durable before we start waiting on the chain. Get that
 * ordering wrong and a crash between send and receipt leaves a transfer nobody
 * knows about — which the next run would helpfully send again.
 */

import { createPublicClient, createWalletClient, http, getAddress, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ROBINHOOD_RPC_URL, ROBINHOOD_CHAIN_ID } from '../chains/config';
import { ERC20_TRANSFER_FROM_ABI, type Collector, type CollectRequest, type CollectResult } from './collector';

export const ROBINHOOD_VIEM_CHAIN: Chain = {
  id: Number(ROBINHOOD_CHAIN_ID),
  name: 'Robinhood Chain',
  network: 'robinhood',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [ROBINHOOD_RPC_URL] },
    public: { http: [ROBINHOOD_RPC_URL] },
  },
} as Chain;

/**
 * A misconfiguration, as opposed to a runtime fault.
 *
 * Worth its own type because these are printed without a stack trace: the
 * operator needs the sentence, not the call site, and a stack in front of the
 * message is how a clear error becomes an ignored one.
 */
export class ConfigError extends Error {}

export class KeyCollector implements Collector {
  readonly address: `0x${string}`;
  private account;
  private pub;
  private wallet;

  constructor(privateKey: string, rpcUrl: string = ROBINHOOD_RPC_URL) {
    const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
      throw new ConfigError('PAYLESS_COLLECTOR_PRIVATE_KEY must be a 32-byte hex private key.');
    }
    this.account = privateKeyToAccount(key as `0x${string}`);
    this.address = this.account.address;
    const transport = http(rpcUrl);
    this.pub = createPublicClient({ chain: ROBINHOOD_VIEM_CHAIN, transport });
    this.wallet = createWalletClient({
      account: this.account,
      chain: ROBINHOOD_VIEM_CHAIN,
      transport,
    });
  }

  async collect(req: CollectRequest): Promise<CollectResult> {
    const { plan, payer, recipient, value } = req;

    let txHash: `0x${string}`;
    try {
      txHash = await this.wallet.writeContract({
        address: plan.token,
        abi: ERC20_TRANSFER_FROM_ABI,
        functionName: 'transferFrom',
        args: [getAddress(payer), getAddress(recipient), value],
      });
    } catch (error) {
      // Nothing was broadcast, so the caller may safely release the period.
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'transferFrom could not be sent',
      };
    }

    // Durable before we wait. See the note at the top of this file.
    if (req.onBroadcast) await req.onBroadcast(txHash);

    try {
      const receipt = await this.pub.waitForTransactionReceipt({ hash: txHash, timeout: 120_000 });
      if (receipt.status !== 'success') {
        return { status: 'failed', txHash, error: 'transferFrom reverted on chain' };
      }
      return { status: 'collected', txHash };
    } catch (error) {
      // Broadcast but unconfirmed. Reported with the hash so the period stays
      // claimed and the next run resolves it from the chain.
      return {
        status: 'in-flight',
        txHash,
        error: error instanceof Error ? error.message : 'Receipt not seen in time',
      };
    }
  }

  /**
   * The allowance belongs to whoever signs, so this key must be the address the
   * site tells subscribers to approve. If it is not, every collection reverts
   * with an unhelpful error — better to say so before signing anything.
   */
  assertIsSpender(advertised: string) {
    if (getAddress(advertised as `0x${string}`) !== getAddress(this.address)) {
      throw new ConfigError(
        `This collector signs as ${this.address}, but subscribers are told to approve ${advertised}. ` +
          'transferFrom spends the signer\'s allowance, so the two must match. ' +
          'Set PAYLESS_COLLECTOR_ADDRESS to this key\'s address, or give the worker the key for the advertised one.'
      );
    }
  }

  /** What the collector can actually take from one payer right now. */
  async collectable(token: `0x${string}`, payer: `0x${string}`): Promise<bigint> {
    const abi = [
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
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ] as const;

    const [allowance, balance] = await Promise.all([
      this.pub.readContract({ address: token, abi, functionName: 'allowance', args: [payer, this.address] }),
      this.pub.readContract({ address: token, abi, functionName: 'balanceOf', args: [payer] }),
    ]);
    return (allowance as bigint) < (balance as bigint) ? (allowance as bigint) : (balance as bigint);
  }
}

/**
 * Build a collector from the environment, or null when no key is present.
 *
 * Returning null rather than throwing is deliberate: a deployment with no
 * collector is a supported state, not an error.
 */
export function collectorFromEnv(env = process.env): KeyCollector | null {
  const key = env.PAYLESS_COLLECTOR_PRIVATE_KEY;
  if (!key) return null;
  return new KeyCollector(key, env.ROBINHOOD_RPC_URL || ROBINHOOD_RPC_URL);
}
