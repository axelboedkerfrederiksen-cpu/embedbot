export const chatState = {};
export function resetChatState() {
  Object.assign(chatState, {
    calls: [], saved: [], connected: null,
    business: { id: 'tenant-a', name: 'Test shop', activated: true, plan: 'starter' },
    rate: { data: false, error: null },
    allowance: { data: { allowed: true, used: 1, limit_value: 1000 }, error: null },
    website: { content_text: 'Returpolitik: 30 dages returret.', source_kind: 'html', imported_at: '2026-10-05' },
    classification: { intent: 'general', language: 'da', search: null },
    read: async () => {}, classify: async () => {}, embed: async () => {}, refresh: async () => '',
  });
}
resetChatState();

class Query {
  constructor(table) { this.table = table; }
  select() { return this; }
  eq() { return this; }
  or() { return this; }
  order() { return this; }
  limit() { return this; }
  gte() { return this; }
  insert(value) { this.value = value; return this; }
  async run() {
    chatState.calls.push(this.table);
    await chatState.read(this.table);
    if (this.table === 'businesses') return { data: chatState.business, error: null };
    if (this.table === 'website_sources') return { data: chatState.website, error: null };
    if (this.table === 'conversations') {
      chatState.saved.push(this.value);
      return { data: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }, error: null };
    }
    return { data: null, error: null };
  }
  single() { return this.run(); }
  maybeSingle() { return this.run(); }
  then(resolve, reject) { return this.run().then(resolve, reject); }
}

export function createClient() {
  return {
    from: table => new Query(table),
    async rpc(name) {
      chatState.calls.push(name);
      await chatState.read(name);
      if (name === 'enforce_chat_rate_limit') return chatState.rate;
      if (name === 'consume_ai_answer') return chatState.allowance;
      if (name === 'match_documents') return { data: [{ content: 'Dokumenteret FAQ.' }], error: null };
      throw new Error(`Unexpected RPC: ${name}`);
    },
  };
}

export class OpenAI {
  static APIError = class extends Error {};
  embeddings = { create: async () => {
    chatState.calls.push('embedding');
    await chatState.embed();
    return { data: [{ embedding: [0.1, 0.2] }] };
  } };
  chat = { completions: { create: async request => {
    if (request.response_format) {
      chatState.calls.push('classification');
      await chatState.classify();
      return { choices: [{ message: { content: JSON.stringify(chatState.classification) } }] };
    }
    chatState.calls.push('completion');
    chatState.prompt = request;
    return (async function* () {
      yield { choices: [{ delta: { content: 'Blød ' } }] };
      yield { choices: [{ delta: { content: 'uld' } }] };
    })();
  } } };
}

export async function integration() {
  chatState.calls.push('integration');
  await chatState.read('integration');
  return chatState.connected;
}
export async function refreshProductPages(...args) {
  chatState.calls.push('refresh');
  return chatState.refresh(...args);
}
