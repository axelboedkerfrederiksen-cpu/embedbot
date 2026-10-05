import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { localShopifyTestSettings, localShopifyTestConfig, localTestEncryptionKey } from "../lib/commerce/local-test.ts";
import { encryptionKey } from "../lib/commerce/security.ts";
import type { shopJson } from "../lib/commerce/http.ts";

const envKeys = ["NODE_ENV", "SHOPIFY_LOCAL_TEST_DOMAIN", "SHOPIFY_LOCAL_TEST_BUSINESS_ID", "SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET", "SUPABASE_SERVICE_KEY", "COMMERCE_ENCRYPTION_KEY"];
async function withTestEnvironment(work: (businessId: string) => Promise<void>) {
  const previous = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  const businessId = randomUUID();
  Object.assign(process.env, { NODE_ENV: "development", SHOPIFY_LOCAL_TEST_DOMAIN: "local-test.myshopify.com", SHOPIFY_LOCAL_TEST_BUSINESS_ID: businessId, SHOPIFY_CLIENT_ID: randomUUID(), SHOPIFY_CLIENT_SECRET: randomUUID(), SUPABASE_SERVICE_KEY: randomUUID() });
  delete process.env.COMMERCE_ENCRYPTION_KEY;
  try { await work(businessId); }
  finally { for (const key of envKeys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; } }
}

test("local Shopify test is restricted to development and exactly one bot", async () => withTestEnvironment(async businessId => {
  assert.equal(localShopifyTestSettings(businessId)?.domain, "local-test.myshopify.com");
  assert.equal(localShopifyTestSettings(randomUUID()), null);
  assert.equal(await localShopifyTestConfig(randomUUID()), null);
  assert.equal(encryptionKey().length, 32);
  const key = localTestEncryptionKey();
  process.env.SHOPIFY_LOCAL_TEST_BUSINESS_ID = randomUUID();
  assert.notEqual(localTestEncryptionKey(), key);
  Object.assign(process.env, { NODE_ENV: "production" });
  assert.equal(localShopifyTestSettings(), null);
  assert.equal(localTestEncryptionKey(), undefined);
  assert.throws(() => encryptionKey());
  assert.equal(await localShopifyTestConfig(process.env.SHOPIFY_LOCAL_TEST_BUSINESS_ID!), null);
}));

test("local Shopify tokens stay in memory, share concurrent requests and renew before expiry", async () => withTestEnvironment(async businessId => {
  let calls = 0;
  const transport = (async (url, headers, body) => {
    calls++;
    assert.equal(url.href, "https://local-test.myshopify.com/admin/oauth/access_token");
    assert.equal((body as URLSearchParams).get("grant_type"), "client_credentials");
    return { access_token: `test-token-${calls}`, expires_in: 120, scope: "read_products,read_inventory,read_orders" };
  }) as typeof shopJson;
  const configs = await Promise.all([localShopifyTestConfig(businessId, transport, 1000), localShopifyTestConfig(businessId, transport, 1000)]);
  assert.equal(calls, 1);
  configs[0]!.adminToken = "mutated";
  assert.equal((await localShopifyTestConfig(businessId, transport, 1001))!.adminToken, "test-token-1");
  assert.equal((await localShopifyTestConfig(businessId, transport, 62000))!.adminToken, "test-token-2");
  assert.equal(calls, 2);
  assert.equal(process.env.COMMERCE_ENCRYPTION_KEY, undefined);
}));

test("local Shopify access rejects writes, missing permissions and expired tokens", async () => withTestEnvironment(async businessId => {
  for (const token of [
    { access_token: "test", expires_in: 86400, scope: "read_products,read_inventory,read_orders,write_orders" },
    { access_token: "test", expires_in: 86400, scope: "read_products,read_inventory" },
    { access_token: "test", expires_in: 0, scope: "read_products,read_inventory,read_orders" },
  ]) {
    await assert.rejects(localShopifyTestConfig(businessId, (async () => token) as typeof shopJson, 1000));
  }
}));
