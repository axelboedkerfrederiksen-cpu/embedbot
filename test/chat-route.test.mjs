import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve as resolvePath } from 'node:path';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { chatState, resetChatState } from './helpers/chat-performance.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = new URL('./helpers/chat-performance.mjs', import.meta.url).href;
const moduleFor = statement => `data:text/javascript,${encodeURIComponent(statement)}`;
registerHooks({ resolve(specifier, context, nextResolve) {
  const mocks = {
    '@supabase/supabase-js': moduleFor(`export { createClient } from ${JSON.stringify(fixture)}`),
    'openai': moduleFor(`export { OpenAI as default } from ${JSON.stringify(fixture)}`),
    '@/lib/commerce/server': moduleFor(`export { integration } from ${JSON.stringify(fixture)}`),
    '@/lib/website-crawl': moduleFor(`export { refreshProductPages } from ${JSON.stringify(fixture)}`),
    'next/server': new URL('./helpers/next-server.mjs', import.meta.url).href,
  };
  if (mocks[specifier]) return { url: mocks[specifier], shortCircuit: true };
  if (specifier.startsWith('@/')) {
    const path = resolvePath(root, specifier.slice(2));
    return { url: pathToFileURL(existsSync(`${path}.ts`) ? `${path}.ts` : `${path}/index.ts`).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
} });
process.env.SUPABASE_URL = 'https://mock.invalid';
process.env.SUPABASE_SERVICE_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.OPENAI_API_KEY = 'mock';
const { NextRequest } = await import('next/server.js');
const { POST } = await import('../app/api/chat/route.ts');
beforeEach(resetChatState);
const request = (input = {}) => new NextRequest('https://embedbot.example/api/chat', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ business_id: 'tenant-a', message: 'Hvad er jeres returpolitik?', ...input }),
});
function deferred() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
}

test('invalid requests are rejected before database or AI work', async () => {
  for (const message of ['', '  ', 123, 'x'.repeat(10001)]) {
    assert.equal((await POST(request({ message }))).status, 400);
  }
  const malformed = new NextRequest('https://embedbot.example/api/chat', { method: 'POST', body: '{' });
  assert.equal((await POST(malformed)).status, 400);
  assert.deepEqual(chatState.calls, []);
});

test('rate limits fail closed and billing and monthly limits block all AI work', async () => {
  for (const rate of [{ data: true, error: null }, { data: null, error: new Error('DB unavailable') }]) {
    resetChatState(); chatState.rate = rate;
    assert.equal((await POST(request())).status, 429);
    assert.ok(!chatState.calls.includes('consume_ai_answer'));
    assert.ok(!chatState.calls.includes('classification'));
  }
  resetChatState(); chatState.business.activated = false;
  assert.equal((await POST(request())).status, 402);
  assert.ok(!chatState.calls.includes('consume_ai_answer'));
  resetChatState(); chatState.allowance.data.allowed = false;
  assert.equal((await POST(request())).status, 429);
  assert.ok(!chatState.calls.includes('classification'));
  assert.ok(!chatState.calls.includes('embedding'));
});

test('rate verification and business lookup start together', { timeout: 1500 }, async () => {
  const bothStarted = deferred(), finish = deferred();
  let started = 0;
  chatState.read = async table => {
    if (!['enforce_chat_rate_limit', 'businesses'].includes(table)) return;
    if (++started === 2) bothStarted.release();
    await finish.promise;
  };
  const response = POST(request());
  try { await bothStarted.promise; assert.equal(started, 2); }
  finally { finish.release(); }
  assert.equal(await (await response).text(), 'Blød uld');
});

test('intent classification overlaps configuration reads and preserves answer persistence', { timeout: 1500 }, async () => {
  const classifyStarted = deferred(), finish = deferred();
  chatState.read = async table => {
    if (['integration', 'commerce_settings', 'website_sources'].includes(table)) await finish.promise;
  };
  chatState.classify = async () => { classifyStarted.release(); };
  const response = POST(request());
  try {
    await classifyStarted.promise;
    assert.ok(chatState.calls.includes('integration'));
  } finally { finish.release(); }
  assert.equal(await (await response).text(), 'Blød uld');
  assert.equal(chatState.saved.length, 1);
  assert.equal(chatState.saved[0].messages[1].content, 'Blød uld');
  assert.match(chatState.prompt.messages[0].content, /30 dages returret/);
});

test('public product refresh overlaps embedding retrieval and uses the complete imported source', { timeout: 1500 }, async () => {
  chatState.classification = { intent: 'product', language: 'da', search: { query: 'Alpaca' } };
  chatState.website.source_kind = 'url';
  chatState.website.source_name = 'https://shop.example';
  const embeddingStarted = deferred();
  chatState.refresh = async source => {
    assert.equal(source, chatState.website.content_text);
    await embeddingStarted.promise;
    return 'Alpaca: live public page';
  };
  chatState.embed = async () => { embeddingStarted.release(); };
  const response = await POST(request({ message: 'Har I Alpaca?' }));
  assert.equal(await response.text(), 'Blød uld');
  assert.match(chatState.prompt.messages[0].content, /Alpaca: live public page/);
  assert.ok(chatState.calls.indexOf('refresh') < chatState.calls.indexOf('embedding'));
});

test('progress is immediate while classification waits, and streamed text remains complete', { timeout: 1500 }, async () => {
  const finish = deferred();
  chatState.classify = async () => { await finish.promise; };
  const response = await POST(request({ stream_events: true }));
  assert.match(response.headers.get('content-type'), /ndjson/);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const first = JSON.parse(decoder.decode((await reader.read()).value));
  assert.deepEqual(first, { type: 'status', stage: 'thinking' });
  finish.release();
  let remainder = '';
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    remainder += decoder.decode(next.value, { stream: true });
  }
  const events = remainder.trim().split('\n').map(line => JSON.parse(line));
  assert.equal(events.filter(event => event.type === 'text').map(event => event.text).join(''), 'Blød uld');
  assert.equal(chatState.saved.length, 1);
});

test('obvious order and support intents avoid classification and embeddings', async () => {
  for (const [message, kind] of [['Where is my order?', 'order'], ['Kontakt mig', 'support']]) {
    resetChatState();
    const response = await POST(request({ message }));
    assert.equal((await response.json()).kind, kind);
    assert.ok(!chatState.calls.includes('classification'));
    assert.ok(!chatState.calls.includes('embedding'));
    assert.equal(chatState.saved.length, 0);
  }
});
