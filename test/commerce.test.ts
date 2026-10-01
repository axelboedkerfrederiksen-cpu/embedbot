import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import { testDatabase } from "./helpers/commerce-db.ts";
import { encryptionKey, seal, unseal, digest, shopifyHmac } from "../lib/commerce/security.ts";
import { requestOrderCode, verifiedOrder, type VerificationContext } from "../lib/commerce/orders.ts";
import { persistTicket, supportDraft, submissionKey, validConfirmation } from "../lib/commerce/support.ts";
import { notifyTicket } from "../lib/commerce/mail.ts";
import { shopifyAdapter } from "../lib/commerce/shopify.ts";
import { wooCommerceAdapter } from "../lib/commerce/woocommerce.ts";
import { cachedProducts } from "../lib/commerce/index.ts";
import { cleanQuery, safeUrl, validOrderInput, type CommerceAdapter } from "../lib/commerce/types.ts";
import { shopifyTokenConfig, freshShopifyConfig } from "../lib/commerce/shopify-tokens.ts";
import { publicAddress, type shopJson } from "../lib/commerce/http.ts";
import { readFile } from "node:fs/promises";

process.env.COMMERCE_ENCRYPTION_KEY = randomBytes(32).toString("base64");
let database: Awaited<ReturnType<typeof testDatabase>>;
before(async () => { database = await testDatabase(); });
after(async () => { await database.pg.close(); });
async function tenant() { const id = randomUUID(); await database.pg.query("insert into public.businesses(id) values ($1)", [id]); return id; }
const adapter = (changes: Partial<CommerceAdapter> = {}): CommerceAdapter => ({ productsEnabled: true, ordersEnabled: true, testConnection: async () => {}, searchProducts: async () => ({ products: [], more: false }), lookupOrder: async () => ({ status: "FULFILLED", contactEmail: "Canonical@example.com", shipments: [{ shippedAt: null, trackingUrl: "https://carrier.example/track" }] }), ...changes });
async function verification(mock = adapter()) {
  const ctx: VerificationContext = { db: database.client, businessId: await tenant(), sessionHash: digest(randomUUID()), revision: randomUUID(), adapter: mock };
  const jobs: (() => Promise<void>)[] = [];
  let code = "";
  const request = await requestOrderCode(ctx, { number: "123", email: "canonical@example.com" }, async (email, value) => { assert.equal(email, "Canonical@example.com"); code = value; }, job => jobs.push(job));
  return { ctx, request, jobs, get code() { return code; } };
}
test("credentials use authenticated encryption, tenant binding and a required 256-bit key", () => {
  const first = seal({ secret: "credential" }, "credentials:tenant-a");
  assert.notEqual(first, seal({ secret: "credential" }, "credentials:tenant-a"));
  assert.equal(first.includes("credential"), false);
  assert.deepEqual(unseal(first, "credentials:tenant-a"), { secret: "credential" });
  assert.throws(() => unseal(first, "credentials:tenant-b"));
  assert.throws(() => unseal(first.slice(0,-3) + "AAA", "credentials:tenant-a"));
  assert.throws(() => encryptionKey("short"));
});
test("Shopify callbacks reject forged HMACs and duplicate parameters", () => {
  const params = new URLSearchParams({ code: "code", shop: "shop.myshopify.com", state: "nonce", timestamp: "123" });
  const message = [...params].sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}=${v}`).join("&");
  params.set("hmac", createHmac("sha256","secret").update(message).digest("hex"));
  assert.equal(shopifyHmac(params,"secret"), true);
  assert.equal(shopifyHmac(params,"other"), false);
  params.append("shop","evil.myshopify.com"); assert.equal(shopifyHmac(params,"secret"), false);
});
test("unverified request returns no order data and defers all existence-dependent work", async () => {
  let lookups = 0;
  const ready = await verification(adapter({ lookupOrder: async () => { lookups++; return null; } }));
  assert.equal(lookups, 0); assert.equal(ready.request.expiresIn, 600);
  assert.equal(JSON.stringify(ready.request).includes("FULFILLED"), false);
  assert.equal(await verifiedOrder(ready.ctx, ready.request.challenge, "123456"), null);
  await ready.jobs[0](); assert.equal(lookups, 1); assert.equal(ready.code, "");
});
test("correct code grants one lookup in the bound session and returns only minimal order data", async () => {
  const ready = await verification(); await ready.jobs[0]();
  assert.equal(await verifiedOrder({ ...ready.ctx, sessionHash: "other" },ready.request.challenge,ready.code),null);
  assert.equal(await verifiedOrder({ ...ready.ctx, businessId: await tenant() },ready.request.challenge,ready.code),null);
  assert.equal(await verifiedOrder({ ...ready.ctx, revision: randomUUID() },ready.request.challenge,ready.code),null);
  const order = await verifiedOrder(ready.ctx,ready.request.challenge,ready.code);
  assert.equal(order?.status,"FULFILLED"); assert.equal("contactEmail" in order!, false);
  assert.equal(await verifiedOrder(ready.ctx,ready.request.challenge,ready.code),null);
  const row = (await database.pg.query<{ order_input: string | null }>("select order_input from public.commerce_order_challenges where id=$1",[ready.request.challenge])).rows[0];
  assert.equal(row.order_input, null);
});
test("code expires and five failed attempts block even the correct code", async () => {
  const ready = await verification(); await ready.jobs[0]();
  for (let n=0;n<5;n++) assert.equal(await verifiedOrder(ready.ctx,ready.request.challenge,"000000"),null);
  assert.equal(await verifiedOrder(ready.ctx,ready.request.challenge,ready.code),null);
  const expired = await verification(); await expired.jobs[0]();
  await database.pg.query("update public.commerce_order_challenges set expires_at=now()-interval '1 second' where id=$1",[expired.request.challenge]);
  assert.equal(await verifiedOrder(expired.ctx,expired.request.challenge,expired.code),null);
});
test("API failure, missing order and mail failure produce the same request response shape", async () => {
  const failed = await verification(adapter({ lookupOrder: async () => { throw new Error("API failed"); } })); await failed.jobs[0]();
  const absent = await verification(adapter({ lookupOrder: async () => null })); await absent.jobs[0]();
  assert.equal(failed.request.text,absent.request.text);
  const jobs: (() => Promise<void>)[] = [];
  const ctx = (await verification()).ctx;
  const result = await requestOrderCode(ctx,{ number:"123",email:"canonical@example.com" },async()=>{ throw new Error("Mail failed"); },job=>jobs.push(job));
  await jobs[0]();
  assert.equal(result.text,absent.request.text);
  assert.equal((await database.pg.query<{ order_input: string | null }>("select order_input from public.commerce_order_challenges where id=$1",[result.challenge])).rows[0].order_input,null);
});
test("support confirmation is scoped to tenant, session, expiry and immutable summary", () => {
  const draft = supportDraft({ contactEmail:" CUSTOMER@example.com ",description:"Please help with my order",orderNumber:"#123",context:[{ role:"system",content:"unsafe" },{ role:"user",content:"Help me" }] })!;
  assert.equal(draft.contactEmail,"customer@example.com"); assert.equal(draft.context.length,1);
  assert.equal(supportDraft({ contactEmail:"invalid",description:"x" }),null);
  const confirmation = { businessId:"a",sessionHash:"s",draft,key:"k",expires:2000 };
  assert.equal(validConfirmation(confirmation,"a","s",1000),true);
  assert.equal(validConfirmation(confirmation,"b","s",1000),false);
  assert.equal(validConfirmation(confirmation,"a","other",1000),false);
  assert.equal(validConfirmation(confirmation,"a","s",2000),false);
  assert.equal(submissionKey("a","s",draft),submissionKey("a","s",{...draft,context:[]}));
  assert.notEqual(submissionKey("a","s",draft),submissionKey("b","s",draft));
});
test("a confirmed support case survives mail failure, retries once and deduplicates repeated submissions", async () => {
  const businessId = await tenant();
  const draft = supportDraft({ contactEmail:"customer@example.com",description:"Please help with my purchase" })!;
  const key = submissionKey(businessId,"session",draft);
  const [saved,duplicate] = await Promise.all([persistTicket(database.client,businessId,key,draft,"shop@example.com"),persistTicket(database.client,businessId,key,draft,"shop@example.com")]);
  assert.equal(saved.id,duplicate.id); assert.equal(saved.case_number,duplicate.case_number);
  await notifyTicket(database.client,saved.id,businessId,async () => { throw new Error("Mail failed"); },true);
  let row = (await database.pg.query<{ notification_status: string }>("select notification_status from public.commerce_tickets where id=$1",[saved.id])).rows[0];
  assert.equal(row.notification_status,"failed");
  let sent = 0;
  const sender = async () => { sent++; return "provider-id"; };
  await Promise.all([notifyTicket(database.client,saved.id,businessId,sender,true),notifyTicket(database.client,saved.id,businessId,sender,true)]);
  assert.equal(sent,1);
  row = (await database.pg.query<{ notification_status: string }>("select notification_status from public.commerce_tickets where id=$1",[saved.id])).rows[0];
  assert.equal(row.notification_status,"sent");
  await persistTicket(database.client,businessId,key,{...draft,description:"Different text"},"other@example.com");
  assert.equal((await database.pg.query<{ description: string }>("select description from public.commerce_tickets where id=$1",[saved.id])).rows[0].description,draft.description);
  await notifyTicket(database.client,saved.id,businessId,sender,true); assert.equal(sent,1);
});
test("missing mail configuration preserves ticket and retry outside provider dedup window never sends", async () => {
  const businessId = await tenant(), draft = supportDraft({ contactEmail:"customer@example.com",description:"Please help with this issue" })!;
  const saved = await persistTicket(database.client,businessId,"key",draft,"shop@example.com");
  let sent = 0; const sender = async () => { sent++; return "id"; };
  await notifyTicket(database.client,saved.id,businessId,sender,false);
  assert.equal((await database.pg.query<{ notification_status:string }>("select notification_status from public.commerce_tickets where id=$1",[saved.id])).rows[0].notification_status,"not_configured");
  await database.pg.query("update public.commerce_tickets set notification_first_attempt_at=now()-interval '24 hours' where id=$1",[saved.id]);
  await notifyTicket(database.client,saved.id,businessId,sender,true); assert.equal(sent,0);
  await notifyTicket(database.client,saved.id,await tenant(),sender,true); assert.equal(sent,0);
});
test("new tables deny browser roles, functions are service-only, and deleting a bot removes its data", async () => {
  const rights = await database.pg.query<{ allowed:boolean }>("select has_table_privilege('authenticated','public.commerce_integrations','SELECT') as allowed");
  assert.equal(rights.rows[0].allowed,false);
  assert.equal((await database.pg.query<{ allowed:boolean }>("select has_function_privilege('anon','public.consume_commerce_challenge(uuid,uuid,text,text,uuid)','EXECUTE') as allowed")).rows[0].allowed,false);
  const businessId = await tenant();
  await persistTicket(database.client,businessId,"case",supportDraft({contactEmail:"customer@example.com",description:"An unresolved question"})!,null);
  await database.pg.query("delete from public.businesses where id=$1",[businessId]);
  assert.equal((await database.pg.query("select id from public.commerce_tickets where business_id=$1",[businessId])).rows.length,0);
  const sql = await readFile(new URL("../sql/add_embedbot_commerce.sql",import.meta.url),"utf8");
  const migration = await readFile(new URL("../supabase/migrations/20261001173453_embedbot_commerce.sql",import.meta.url),"utf8");
  assert.equal(sql,migration);
});
test("product cache isolates tenants/revisions, expires after 30 seconds and never serves stale data after errors", async () => {
  let calls = 0; const mock = adapter({ searchProducts: async () => { calls++; if (calls >= 5) throw new Error("API failed"); return { products: [],more:false }; } });
  const query = { query:"shirt" };
  await cachedProducts("tenant-a","rev-1",mock,query,1000); await cachedProducts("tenant-a","rev-1",mock,query,2000); assert.equal(calls,1);
  await cachedProducts("tenant-b","rev-1",mock,query,2000); await cachedProducts("tenant-a","rev-2",mock,query,2000); assert.equal(calls,3);
  const result = await cachedProducts("tenant-a","rev-1",mock,query,31000); assert.equal(calls,4); assert.equal(result.cacheSeconds,30);
  await assert.rejects(cachedProducts("tenant-a","rev-1",mock,query,62000));
});
test("SSRF protections reject loopback, private IPv4, local IPv6 and credential-bearing URLs", () => {
  for (const ip of ["127.0.0.1","10.0.0.1","192.168.1.1","169.254.169.254","::1","::ffff:127.0.0.1","fc00::1"]) assert.equal(publicAddress(ip),false,ip);
  assert.equal(publicAddress("8.8.8.8"),true); assert.equal(safeUrl("https://secret@shop.example"),null);
  assert.equal(safeUrl("javascript:alert(1)"),null); assert.equal(validOrderInput({number:'123" OR *',email:"x@y.dk"}),null);
  assert.equal(cleanQuery({query:"shirt",minPrice:100,maxPrice:10}),null);
});
test("Shopify maps variants, stock and tracking without exposing credentials in results", async () => {
  const transport = async <T>(url: URL, headers: Record<string,string>, body?: unknown): Promise<T> => {
    assert.equal(url.protocol,"https:"); assert.equal(headers["X-Shopify-Access-Token"],"secret");
    const query = (body as {query:string}).query;
    if (query.includes("OrderStatus")) return { data:{ orders:{ nodes:[{ name:"#123",email:"customer@example.com",cancelledAt:null,displayFulfillmentStatus:"FULFILLED",fulfillments:[{status:"SUCCESS",inTransitAt:"2026-10-01T10:00:00Z",trackingInfo:[{url:"https://carrier.example/123",number:"track123",company:"Carrier"}]}] }] } } } as T;
    return { data:{ shop:{currencyCode:"DKK"},products:{pageInfo:{hasNextPage:false},nodes:[{ id:"p1",title:"Shirt",description:"Cotton",onlineStoreUrl:"https://shop.example/shirt",status:"ACTIVE",totalInventory:4,variants:{pageInfo:{hasNextPage:false},nodes:[{id:"v1",title:"M",price:"199.00",inventoryQuantity:4,inventoryPolicy:"DENY",inventoryItem:{tracked:true},selectedOptions:[{name:"Size",value:"M"}]}]}}] } } } as T;
  };
  const shop = shopifyAdapter({platform:"shopify",domain:"shop.myshopify.com",adminToken:"secret"},transport);
  const products = await shop.searchProducts({query:"Shirt"});
  assert.equal(products.products[0].variants[0].stock,4); assert.equal(products.products[0].variants[0].options[0].value,"M");
  assert.equal(JSON.stringify(products).includes("secret"),false);
  assert.equal(await shop.lookupOrder({number:"123",email:"other@example.com"}),null);
  const order = await shop.lookupOrder({number:"123",email:"customer@example.com"}); assert.equal(order?.shipments[0].trackingNumber,"track123");
  await assert.rejects(shop.searchProducts({query:"Shirt",currency:"USD"}));
});
test("WooCommerce maps variants/stock and never invents tracking in core orders", async () => {
  const transport = async <T>(url:URL, headers:Record<string,string>): Promise<T> => {
    assert.ok(headers.Authorization.startsWith("Basic ")); assert.equal(url.searchParams.has("consumer_secret"),false);
    if (url.pathname.includes("variations")) return [{id:2,price:"150",stock_status:"instock",stock_quantity:2,attributes:[{name:"Size",option:"M"}]}] as T;
    if (url.pathname.includes("orders")) return {number:"123",status:"processing",billing:{email:"customer@example.com"}} as T;
    return [{id:1,name:"Shirt",short_description:"<p>Cotton</p>",permalink:"https://shop.example/shirt",price:"150",stock_status:"instock",stock_quantity:null,status:"publish",type:"variable"}] as T;
  };
  const shop = wooCommerceAdapter({platform:"woocommerce",origin:"https://shop.example",consumerKey:`ck_${"a".repeat(40)}`,consumerSecret:`cs_${"b".repeat(40)}`,currency:"DKK"},transport);
  const result = await shop.searchProducts({query:"shirt"}); assert.equal(result.products[0].variants[0].stock,2);
  assert.deepEqual((await shop.lookupOrder({number:"123",email:"customer@example.com"}))?.shipments,[]);
  assert.equal(await shop.lookupOrder({number:"123",email:"other@example.com"}),null);
  await assert.rejects(shop.searchProducts({query:"shirt",currency:"USD"}));
});
test("expiring Shopify tokens refresh under a lease and reject write scopes", async () => {
  const response = { access_token:"old",refresh_token:"refresh",expires_in:3600,refresh_token_expires_in:7776000,scope:"read_products,read_inventory,read_orders" };
  const config = shopifyTokenConfig("shop.myshopify.com",response,1000);
  assert.equal(config.expiresAt,3601000);
  assert.throws(()=>shopifyTokenConfig("shop.myshopify.com",{...response,scope:"read_products,read_inventory,write_orders"}));
  const businessId = await tenant(), revision = randomUUID();
  await database.pg.query("insert into public.commerce_integrations(business_id,platform,shop_url,credentials,revision) values($1,'shopify','https://shop.myshopify.com',$2,$3)",[businessId,seal(config,`credentials:${businessId}`),revision]);
  process.env.SHOPIFY_CLIENT_ID = "client"; process.env.SHOPIFY_CLIENT_SECRET = "secret";
  let calls = 0;
  const transport = async <T>(_url: URL,_headers:Record<string,string>,body?:unknown):Promise<T> => { calls++; assert.equal((body as URLSearchParams).get("grant_type"),"refresh_token"); return {...response,access_token:"new",refresh_token:"rotated"} as T; };
  const fresh = await freshShopifyConfig(database.client,businessId,revision,config,transport as typeof shopJson,4000000);
  assert.equal(calls,1); assert.equal(fresh?.adminToken,"new");
  const encrypted = (await database.pg.query<{credentials:string}>("select credentials from public.commerce_integrations where business_id=$1",[businessId])).rows[0].credentials;
  assert.equal(unseal<{refreshToken:string}>(encrypted,`credentials:${businessId}`).refreshToken,"rotated");
  delete process.env.SHOPIFY_CLIENT_ID; delete process.env.SHOPIFY_CLIENT_SECRET;
});
