import test from "node:test";
import assert from "node:assert/strict";
import type OpenAI from "openai";
import { commerceCopy } from "../lib/commerce/chat.ts";

test("built-in languages and invalid codes need no translation request", async () => {
  const unavailable = {} as OpenAI;
  assert.match((await commerceCopy(unavailable, "da")).productsFound, /webshoppen/);
  assert.match((await commerceCopy(unavailable, "en")).productsFound, /shop/);
  assert.equal((await commerceCopy(unavailable, "invalid code")).productsFound, (await commerceCopy(unavailable, "en")).productsFound);
});

test("concurrent translations share one request, later calls reuse it and callers cannot mutate cached labels", async () => {
  const english = await commerceCopy({} as OpenAI, "en");
  let calls = 0;
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const client = { chat: { completions: { create: async () => {
    calls++;
    await wait;
    return { choices: [{ message: { content: JSON.stringify({ ...english, productsFound: "Produkte gefunden", unexpected: "discard" }) } }] };
  } } } } as unknown as OpenAI;
  const first = commerceCopy(client, "de");
  const second = commerceCopy(client, "de");
  assert.equal(calls, 1);
  release();
  const [a, b] = await Promise.all([first, second]);
  a.productsFound = "changed";
  assert.equal(b.productsFound, "Produkte gefunden");
  const cached = await commerceCopy(client, "de");
  assert.equal(cached.productsFound, "Produkte gefunden");
  assert.equal("unexpected" in cached, false);
  assert.equal(calls, 1);
});

test("failed or incomplete translations fall back to English and can be retried", async () => {
  const english = await commerceCopy({} as OpenAI, "en");
  let calls = 0;
  const client = { chat: { completions: { create: async () => {
    calls++;
    if (calls === 1) throw new Error("temporarily unavailable");
    return { choices: [{ message: { content: JSON.stringify(calls === 2 ? { productsFound: "incomplete" } : { ...english, productsFound: "Produits trouvés" }) } }] };
  } } } } as unknown as OpenAI;
  assert.deepEqual(await commerceCopy(client, "fr"), english);
  assert.deepEqual(await commerceCopy(client, "fr"), english);
  assert.equal((await commerceCopy(client, "fr")).productsFound, "Produits trouvés");
  assert.equal(calls, 3);
});
