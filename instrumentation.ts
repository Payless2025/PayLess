/**
 * Boot-time visibility only.
 *
 * The stores install themselves lazily in whichever process serves a request —
 * see lib/x402/spent-store.ts. This hook does not install anything; it exists so
 * a deployment without a shared ledger says so in the logs instead of running
 * quietly unprotected.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const shared =
    (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
    (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN);

  if (shared) {
    console.log('[payless] Shared ledger configured — replay protection survives scale-out.');
  } else {
    console.warn(
      '[payless] No UPSTASH_REDIS_REST_URL/TOKEN. Replay protection and subscription ' +
        'periods are per-instance: correct on one server, wrong on serverless, where a ' +
        'payment could be spent once per warm instance. Check /api/info → integrity.'
    );
  }
}
