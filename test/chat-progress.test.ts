import test from 'node:test';
import assert from 'node:assert/strict';
import { chatProgressResponse } from '../lib/chat-progress.ts';

test('progress arrives before retrieval finishes and preserves Unicode split across chunks', async () => {
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  const response = chatProgressResponse(async status => {
    status('searching');
    await waiting;
    status('details');
    const bytes = new TextEncoder().encode('Blød uld');
    return new Response(new ReadableStream({start(controller) {
      controller.enqueue(bytes.slice(0, 3));
      controller.enqueue(bytes.slice(3));
      controller.close();
    }}));
  });
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  assert.match(decoder.decode((await reader.read()).value), /thinking/);
  assert.match(decoder.decode((await reader.read()).value), /searching/);
  release();
  let rest = '';
  while (true) { const next = await reader.read(); if (next.done) break; rest += decoder.decode(next.value); }
  const events = rest.trim().split('\n').map(line => JSON.parse(line));
  assert.equal(events[0].stage, 'details');
  assert.equal(events.filter(event => event.type === 'text').map(event => event.text).join(''), 'Blød uld');
});
test('structured commerce payloads and API failures remain distinct', async () => {
  for (const [status, data, type] of [[200, {kind: 'order', needsOrderInput: true}, 'result'], [429, {error: 'Rate limit'}, 'error']] as const) {
    const response = chatProgressResponse(async () => Response.json(data, {status}));
    const events = (await response.text()).trim().split('\n').map(line => JSON.parse(line));
    assert.equal(events[1].type, type);
    if (type === 'result') assert.deepEqual(events[1].data, data);
    else assert.equal(events[1].message, 'Rate limit');
  }
});
