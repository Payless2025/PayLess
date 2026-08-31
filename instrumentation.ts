/**
 * Runs once when the server starts.
 *
 * Replay protection and subscription accounting default to per-instance maps.
 * That is correct on one long-lived server and wrong on serverless, so this
 * swaps in the shared Redis-backed stores when they are configured — and says
 * so plainly in the logs when they are not.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { installSharedStores } = await import('./lib/x402/stores/redis');
  const status = await installSharedStores();

  if (status.configured && !status.reachable) {
    // Configured but unreachable means someone intended protection and is not
    // getting it. Loud is the right volume.
    console.error(
      '[payless] Falling back to per-instance stores. Replay protection is NOT ' +
        'shared across instances until Upstash is reachable.'
    );
  }
}
