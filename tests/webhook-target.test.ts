/**
 * What a webhook may point at.
 *
 * The hole this closes: anyone could register a URL and have this deployment
 * fetch it. A leaked secret is our problem; an open request forwarder makes us
 * somebody else's.
 */

import assert from 'node:assert/strict';
import { checkWebhookTarget, redactSecret } from '../lib/x402/webhook-target';

let passed = 0;
function test(name: string, fn: () => void) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

const blocked = (url: string) => assert.equal(checkWebhookTarget(url).ok, false, `allowed ${url}`);
const allowed = (url: string) => assert.equal(checkWebhookTarget(url).ok, true, `blocked ${url}`);

console.log('\nwebhook targets\n');

test('allows an ordinary public https endpoint', () => {
  allowed('https://example.com/hooks/payless');
  allowed('https://hooks.slack.com/services/T/B/X');
});

test('refuses plain http, which would put a signed payload in the clear', () => {
  blocked('http://example.com/hook');
});

test('refuses loopback and localhost', () => {
  for (const u of ['https://localhost/x', 'https://127.0.0.1/x', 'https://[::1]/x', 'https://api.localhost/x']) blocked(u);
});

test('refuses cloud metadata, the classic SSRF target', () => {
  blocked('https://169.254.169.254/latest/meta-data/');
  blocked('https://metadata.google.internal/computeMetadata/v1/');
});

test('refuses private ranges', () => {
  for (const u of [
    'https://10.0.0.5/x', 'https://192.168.1.1/x', 'https://172.16.0.1/x',
    'https://172.31.255.255/x', 'https://100.64.0.1/x', 'https://0.0.0.0/x',
  ]) blocked(u);
});

test('allows public addresses that merely look adjacent to private ones', () => {
  // 172.32 is public even though 172.16-31 is not, and getting that boundary
  // wrong would silently block legitimate customers.
  allowed('https://172.32.0.1/x');
  allowed('https://11.0.0.1/x');
});

test('refuses IPv6 private and link-local', () => {
  for (const u of ['https://[fd00::1]/x', 'https://[fe80::1]/x', 'https://[::ffff:10.0.0.1]/x']) blocked(u);
});

test('refuses bare hostnames with no public suffix', () => {
  blocked('https://intranet/x');
  blocked('https://db.internal/x');
});

test('refuses anything unparseable rather than guessing', () => {
  blocked('not a url');
  blocked('');
});

test('a secret is never returned in full', () => {
  const secret = 'whsec_0123456789abcdefghijklmnop';
  const shown = redactSecret(secret);
  assert.ok(!shown.includes('0123456789abcdef'), 'redaction leaked the middle');
  assert.ok(shown.startsWith('whse'), 'should keep a recognisable prefix');
  assert.ok(shown.endsWith('mnop'), 'should keep a recognisable suffix');
  assert.equal(redactSecret('short'), '•••••');
  assert.equal(redactSecret(undefined), '');
});

console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
