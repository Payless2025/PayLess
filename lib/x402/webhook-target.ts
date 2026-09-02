/**
 * What a webhook is allowed to point at.
 *
 * Registering a URL and asking a server to fetch it is a request forgery
 * primitive. Without a check here, anyone can make this deployment send HTTP
 * requests to an address of their choosing: cloud metadata endpoints, hosts
 * inside a private network, or a third party being flooded using our address
 * and our reputation rather than theirs.
 *
 * That last one is why this matters more than it first looks. A leaked secret
 * is our problem. An open request forwarder makes us somebody else's problem.
 *
 * The check is deliberately a blocklist of destinations rather than an
 * allowlist of customers, because there are no accounts here yet. It is not
 * complete protection: a hostname that resolves to a private address only at
 * fetch time still gets through, which is why deliveries should also run
 * without following redirects.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
]);

/** Ranges that are never a legitimate webhook destination. */
function isPrivateIPv4(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  const n = parts.map((p) => Number(p));
  if (n.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return false;

  const [a, b] = n;
  if (a === 10) return true;                       // 10/8
  if (a === 127) return true;                      // loopback
  if (a === 0) return true;                        // "this network"
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true;          // 192.168/16
  if (a === 169 && b === 254) return true;          // link-local, incl. cloud metadata
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a >= 224) return true;                        // multicast and reserved
  return false;
}

function isPrivateIPv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === '::1' || h === '::') return true;
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // unique local
  if (h.startsWith('fe80')) return true;                     // link-local
  // IPv4-mapped addresses. Note that URL parsing rewrites ::ffff:10.0.0.1 into
  // ::ffff:a00:1, so matching only the dotted form would let the hex form past.
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(h);
  if (dotted) return isPrivateIPv4(dotted[1]);

  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(h);
  if (hex) {
    const high = parseInt(hex[1], 16);
    const low = parseInt(hex[2], 16);
    return isPrivateIPv4(`${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`);
  }
  return false;
}

export interface TargetCheck {
  ok: boolean;
  reason?: string;
}

/**
 * May this deployment be asked to send a request here?
 *
 * Returns a sentence rather than a boolean so the caller can say why, which
 * matters: "invalid URL" for a blocked destination sends people looking in the
 * wrong place.
 */
export function checkWebhookTarget(raw: string): TargetCheck {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'Webhook URL could not be parsed.' };
  }

  if (url.protocol !== 'https:') {
    return {
      ok: false,
      reason: 'Webhook URLs must use https. A signed payload over plain http is readable by anyone on the path.',
    };
  }

  const host = url.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith('.localhost') || host.endsWith('.internal')) {
    return { ok: false, reason: `${url.hostname} is not a routable destination.` };
  }
  if (isPrivateIPv4(host) || isPrivateIPv6(host)) {
    return {
      ok: false,
      reason: `${url.hostname} is a private or link-local address. Webhooks may only be delivered to public hosts.`,
    };
  }
  // A bare hostname with no dot is a local network name, not a public host.
  if (!host.includes('.') && !host.includes(':')) {
    return { ok: false, reason: `${url.hostname} is not a public hostname.` };
  }

  return { ok: true };
}

/**
 * A secret, shown safely.
 *
 * The owner needs to tell their webhooks apart; nobody needs the value back
 * out of an API that never had a reason to return it.
 */
export function redactSecret(secret: string | undefined): string {
  if (!secret) return '';
  if (secret.length <= 8) return '•'.repeat(secret.length);
  return `${secret.slice(0, 4)}${'•'.repeat(Math.min(secret.length - 8, 24))}${secret.slice(-4)}`;
}
