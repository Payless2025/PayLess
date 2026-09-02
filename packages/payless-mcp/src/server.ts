/**
 * The MCP server.
 *
 * Four tools. Three of them are read-only; exactly one can move money, and that
 * one checks the budget before it signs anything.
 *
 * Note what is deliberately absent: no tool raises a limit, sets a limit, or
 * reveals the key. The model can ask for anything it likes — there is nothing
 * here that would grant it.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Budget } from './budget.js';
import { AgentWallet, PERMIT2_ADDRESS } from './wallet.js';
import { gaslessOption, toBaseUnits, type Accept } from './select.js';

const USDG = {
  address: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168' as `0x${string}`,
  decimals: 6,
  symbol: 'USDG',
};

interface Challenge {
  payment?: {
    amount?: string;
    currency?: string;
    recipient?: string;
    tokenAddress?: string;
    network?: string;
    accepts?: Accept[];
  };
}


const text = (value: unknown) => ({
  content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
});

export function createServer(opts: { budget: Budget; wallet: AgentWallet | null }) {
  const { budget, wallet } = opts;

  const server = new McpServer({ name: 'payless', version: '0.1.0' });

  server.tool(
    'quote',
    'Ask what a URL costs without paying. Returns the price and recipient if the endpoint answers 402, or reports that it is free.',
    { url: z.string().describe('The URL to price') },
    async ({ url }) => {
      const res = await fetch(url);
      if (res.status !== 402) {
        return text({ free: true, status: res.status, note: 'No payment required for this URL.' });
      }
      const body = (await res.json().catch(() => ({}))) as Challenge;
      const amount = body.payment?.amount;
      const verdict = amount ? budget.check(url, amount) : { ok: false as const, reason: 'No price in the 402.' };
      return text({
        free: false,
        amount,
        currency: body.payment?.currency,
        recipient: body.payment?.recipient,
        network: body.payment?.network,
        affordable: verdict.ok,
        ...(verdict.ok ? {} : { refusal: (verdict as any).reason }),
        budget: budget.summary(),
      });
    }
  );

  server.tool(
    'fetch_paid',
    'Fetch a URL, paying its 402 if there is one. Refuses to pay above the configured limits. Returns the response body.',
    {
      url: z.string().describe('The URL to fetch'),
      method: z.enum(['GET', 'POST']).optional().describe('HTTP method, default GET'),
      body: z.string().optional().describe('Request body for POST, as JSON text'),
    },
    async ({ url, method = 'GET', body }) => {
      const init: RequestInit = {
        method,
        ...(body ? { body, headers: { 'content-type': 'application/json' } } : {}),
      };

      const first = await fetch(url, init);
      if (first.status !== 402) {
        const payload = await first.text();
        return text({ paid: false, status: first.status, body: payload.slice(0, 20000) });
      }

      const challenge = (await first.json().catch(() => ({}))) as Challenge;
      const amount = challenge.payment?.amount;
      const to = challenge.payment?.recipient;
      const token = (challenge.payment?.tokenAddress as `0x${string}`) || USDG.address;

      if (!amount || !to) {
        return text({ paid: false, error: 'The endpoint asked for payment but did not say how much or to whom.' });
      }

      // The limit is checked here, before anything is signed. Nothing the model
      // says can move this line.
      const verdict = budget.check(url, amount);
      if (!verdict.ok) {
        return text({
          paid: false,
          refused: true,
          reason: verdict.reason,
          budget: budget.summary(),
        });
      }

      if (!wallet) {
        return text({
          paid: false,
          error:
            'No wallet configured. Set PAYLESS_AGENT_PRIVATE_KEY to let this agent pay, and fund that address with USDG on Robinhood Chain.',
        });
      }

      // Prefer signing over sending. The agent then needs no gas and does not
      // wait for its own transaction to confirm, which was three seconds a call.
      const gasless = gaslessOption(challenge.payment?.accepts as Accept[] | undefined);
      let paymentHeader: string;
      let method_used: 'signature' | 'transfer';
      let txHash: string | undefined;
      let approvalTx: string | undefined;

      if (gasless) {
        const asset = gasless.asset as `0x${string}`;
        const value = toBaseUnits(gasless.amount, USDG.decimals);

        try {
          // One approval, once, and only ever for what the budget allows. An
          // infinite approval would make the budget meaningless if the key leaked.
          const allowance = await wallet.permit2Allowance(asset);
          if (allowance < value) {
            const ceiling = toBaseUnits(String(budget.limits.maxTotal), USDG.decimals);
            approvalTx = await wallet.approvePermit2(asset, ceiling > value ? ceiling : value);
          }

          const permit = await wallet.signPermit({
            scheme: gasless.scheme === 'upto' ? 'upto' : 'exact',
            token: asset,
            amount: value,
            to: gasless.payTo,
            spender: gasless.extra!.spender!,
            facilitator: gasless.extra?.facilitator,
          });
          paymentHeader = JSON.stringify(permit);
          method_used = 'signature';
        } catch (error) {
          return text({
            paid: false,
            error: `Could not authorise payment: ${error instanceof Error ? error.message : 'unknown error'}`,
          });
        }
      } else {
        try {
          txHash = await wallet.pay({ to, amount, token, decimals: USDG.decimals });
        } catch (error) {
          return text({
            paid: false,
            error: `Payment failed: ${error instanceof Error ? error.message : 'unknown error'}`,
          });
        }
        paymentHeader = JSON.stringify({
          transactionHash: txHash,
          from: wallet.address,
          to,
          amount,
          token: challenge.payment?.currency || USDG.symbol,
          tokenAddress: token,
          chainId: challenge.payment?.network || '4663',
        });
        method_used = 'transfer';
      }

      const paid = await fetch(url, {
        ...init,
        headers: { ...(init.headers || {}), 'X-Payment': paymentHeader },
      });

      // With a signature the money moves during this request, so the hash comes
      // back on the response rather than from us.
      if (method_used === 'signature') {
        txHash = paid.headers.get('x-payment-confirmed') || undefined;
        if (paid.headers.get('x-payment-settlement') === 'failed') {
          return text({
            paid: false,
            method: 'signature',
            error: paid.headers.get('x-payment-error') || 'Settlement failed after the response was served.',
            body: (await paid.text()).slice(0, 20000),
          });
        }
      }

      // Recorded only once the money actually moved, whatever the server then says.
      // On a metered endpoint the settled amount can be well under the ceiling
      // in the challenge. Recording the ceiling would burn budget the agent
      // never spent; the response header carries what was actually taken.
      const settledHeader = paid.headers.get('x-payment-settled-amount');
      const settled = Number(settledHeader);
      budget.record({
        at: Date.now(),
        host: new URL(url).host,
        url,
        amount: Number.isFinite(settled) && settled > 0 ? settled : Number(amount),
        txHash: txHash ?? '',
      });

      const payload = await paid.text();
      return text({
        paid: true,
        method: method_used,
        ...(method_used === 'signature'
          ? { gas: 'none — the facilitator broadcast and paid for it' }
          : {}),
        ...(approvalTx
          ? { permit2Approval: approvalTx, note: 'One-time approval. Later payments cost no gas at all.' }
          : {}),
        amount,
        currency: challenge.payment?.currency || USDG.symbol,
        txHash,
        ...(txHash ? { explorer: `https://robinhoodchain.blockscout.com/tx/${txHash}` } : {}),
        status: paid.status,
        body: payload.slice(0, 20000),
        budget: budget.summary(),
      });
    }
  );

  server.tool(
    'budget_status',
    'How much of the spending allowance is left, and what has been spent so far.',
    {},
    async () => text({ ...budget.summary(), history: budget.history.slice(-20) })
  );

  server.tool(
    'wallet_status',
    'The agent wallet address and its balances. Never returns the private key.',
    {},
    async () => {
      if (!wallet) return text({ configured: false, note: 'No PAYLESS_AGENT_PRIVATE_KEY set — this agent cannot pay.' });
      try {
        return text({ configured: true, ...(await wallet.balances(USDG.address)) });
      } catch (error) {
        return text({
          configured: true,
          address: wallet.address,
          error: `Could not read balances: ${error instanceof Error ? error.message : 'unknown'}`,
        });
      }
    }
  );

  return server;
}
