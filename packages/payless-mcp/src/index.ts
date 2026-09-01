/**
 * payless-mcp — let an agent pay for APIs, within a limit it cannot exceed.
 *
 * Configure in your MCP client:
 *
 *   {
 *     "mcpServers": {
 *       "payless": {
 *         "command": "npx",
 *         "args": ["-y", "payless-mcp"],
 *         "env": {
 *           "PAYLESS_AGENT_PRIVATE_KEY": "0x…",
 *           "PAYLESS_MAX_PER_CALL": "0.10",
 *           "PAYLESS_MAX_TOTAL": "1.00"
 *         }
 *       }
 *     }
 *   }
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { budgetFromEnv } from './budget.js';
import { walletFromEnv } from './wallet.js';

export { createServer } from './server.js';
export { Budget, budgetFromEnv, type BudgetLimits, type Spend } from './budget.js';
export { AgentWallet, walletFromEnv, ROBINHOOD_CHAIN } from './wallet.js';

async function main() {
  const budget = budgetFromEnv();

  let wallet = null;
  try {
    wallet = walletFromEnv();
  } catch (error) {
    // A bad key must not start a half-working server that silently cannot pay.
    console.error(`[payless-mcp] ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  // stderr, never stdout: stdout is the MCP transport.
  console.error(
    `[payless-mcp] wallet ${wallet ? wallet.address : 'not configured'} · ` +
      `limits ${budget.limits.maxPerCall}/call, ${budget.limits.maxTotal} total` +
      (budget.limits.allowedHosts.length ? ` · hosts ${budget.limits.allowedHosts.join(',')}` : '')
  );

  const server = createServer({ budget, wallet });
  await server.connect(new StdioServerTransport());
}

// Only run when executed directly, so the module stays importable for tests.
if (process.argv[1] && /payless-mcp|dist[/\\]index\.js/.test(process.argv[1])) {
  main().catch((error) => {
    console.error('[payless-mcp] fatal:', error);
    process.exit(1);
  });
}
