import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8');
const { onRequest } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('requires an explicitly configured HTTPS Render origin', async () => {
  for (const origin of ['', 'http://app.onrender.com', 'https://attacker.example',
    'https://app.onrender.com/other', 'https://user:pass@app.onrender.com']) {
    const response = await onRequest({ request: new Request('https://linfish.pages.dev/api/test'), env: { BACKEND_ORIGIN: origin } });
    assert.equal(response.status, 503);
  }
});

test('forwards method, query, cookie, authorization and body without following redirects', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async (request, options) => {
      assert.equal(request.url, 'https://example.onrender.com/api/auth/login?source=shop');
      assert.equal(request.method, 'POST');
      assert.equal(request.headers.get('cookie'), 'linfish.refresh=example');
      assert.equal(request.headers.get('authorization'), 'Bearer example');
      assert.equal(request.headers.get('host'), null);
      assert.equal(request.headers.get('x-forwarded-host'), null);
      assert.equal(await request.text(), '{"test":true}');
      assert.equal(options.redirect, 'manual');
      return new Response('ok', { status: 200, headers: { 'set-cookie': 'linfish.refresh=new; Path=/api/auth; HttpOnly; Secure; SameSite=Strict' } });
    };
    const request = new Request('https://linfish.pages.dev/api/auth/login?source=shop', {
      method: 'POST', headers: { cookie: 'linfish.refresh=example', authorization: 'Bearer example', host: 'linfish.pages.dev', 'x-forwarded-host': 'attacker.example' }, body: '{"test":true}',
    });
    const response = await onRequest({ request, env: { BACKEND_ORIGIN: 'https://example.onrender.com' } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /linfish\.refresh=new/);
  } finally { globalThis.fetch = previous; }
});

test('returns a useful error when the upstream is unavailable', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error('network unavailable'); };
    const response = await onRequest({ request: new Request('https://linfish.pages.dev/api/catalog/products'), env: { BACKEND_ORIGIN: 'https://example.onrender.com' } });
    assert.equal(response.status, 502);
  } finally { globalThis.fetch = previous; }
});
