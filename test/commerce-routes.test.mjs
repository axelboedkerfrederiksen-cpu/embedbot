import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve as resolvePath } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { state } from './helpers/runtime.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = name => new URL(`./helpers/${name}.mjs`, import.meta.url).href;
registerHooks({ resolve(specifier, context, nextResolve) {
  const mocks = { '@supabase/supabase-js': 'supabase-js', '@supabase/ssr': 'supabase-ssr', 'next/server': 'next-server', 'next/headers': 'next-headers', '@/lib/resend': 'resend' };
  if (mocks[specifier]) return { url: fixture(mocks[specifier]), shortCircuit: true };
  if (specifier.startsWith('@/')) {
    const path = resolvePath(root,specifier.slice(2));
    return { url: pathToFileURL(existsSync(`${path}.ts`) ? `${path}.ts` : `${path}/index.ts`).href, shortCircuit: true };
  }
  // Replace relative commerce HTTP and Resend imports only within application
  // modules; fixtures can re-export the original pure network security helpers.
  if (!context.parentURL?.includes('/test/helpers/')) {
    const resolved = nextResolve(specifier,context);
    if (resolved.url === new URL('../lib/commerce/http.ts',import.meta.url).href) return { url:fixture('commerce-http'),shortCircuit:true };
    if (resolved.url === new URL('../lib/resend.ts',import.meta.url).href) return { url:fixture('resend'),shortCircuit:true };
    return resolved;
  }
  return nextResolve(specifier,context);
} });
const { testDatabase } = await import('./helpers/commerce-db.ts');
const { seal } = await import('../lib/commerce/security.ts');
const { NextRequest } = await import('next/server.js');
const support = await import('../app/api/commerce/support/route.ts');
const orders = await import('../app/api/commerce/orders/route.ts');
const tickets = await import('../app/api/dashboard/tickets/route.ts');
const commerce = await import('../app/api/dashboard/commerce/route.ts');
const wooCallback = await import('../app/api/commerce/woocommerce/callback/route.ts');
let database;
process.env.COMMERCE_ENCRYPTION_KEY = randomBytes(32).toString('base64');
process.env.SUPABASE_URL = 'https://mock.invalid'; process.env.SUPABASE_SERVICE_KEY = 'mock';
process.env.COMMERCE_EMAIL_FROM = 'EmbedBot <support@example.com>'; process.env.RESEND_API_KEY = 'mock';
process.env.NEXT_PUBLIC_APP_URL = 'https://embedbot.example';
before(async () => { database = await testDatabase(); state.db = database.client; });
after(async () => { await database.pg.close(); });
const origin = 'https://embedbot.example';
const session = randomBytes(32).toString('hex');
function request(path, input, suppliedOrigin = origin) { return new NextRequest(`${origin}${path}`, { method:'POST', headers:{'Content-Type':'application/json',Origin:suppliedOrigin,'x-forwarded-for':'203.0.113.20'},body:JSON.stringify(input) }); }
async function tenant(userId = randomUUID()) {
  const id = randomUUID(); await database.pg.query('insert into businesses(id,user_id) values($1,$2)',[id,userId]); return id;
}
async function connectedTenant() {
  const businessId = await tenant(), revision = randomUUID();
  const config = {platform:'woocommerce',origin:'https://shop.example',consumerKey:`ck_${'a'.repeat(40)}`,consumerSecret:`cs_${'b'.repeat(40)}`,currency:'DKK'};
  await database.pg.query("insert into commerce_integrations(business_id,platform,shop_url,credentials,revision) values($1,'woocommerce','https://shop.example',$2,$3)",[businessId,seal(config,`credentials:${businessId}`),revision]);
  return businessId;
}
test('support HTTP flow requires explicit confirmation, rejects cross-tenant/session tokens and deduplicates retries after mail failure',async () => {
  const business_id = await tenant(); state.mails = []; state.mailError = {message:'Mock mail failure'};
  await database.pg.query('insert into commerce_settings(business_id,notification_email) values($1,$2)',[business_id,'shop@example.com']);
  const prepared = await support.POST(request('/api/commerce/support',{business_id,session,action:'prepare',contactEmail:'customer@example.com',description:'Please help me resolve this question'}));
  assert.equal(prepared.status,200); const draft = await prepared.json();
  assert.equal((await database.pg.query('select id from commerce_tickets where business_id=$1',[business_id])).rows.length,0);
  const confirm = {business_id,session,action:'confirm',confirmation:draft.confirmation,confirmed:true};
  assert.equal((await support.POST(request('/api/commerce/support',{...confirm,confirmed:false}))).status,400);
  assert.equal((await support.POST(request('/api/commerce/support',{...confirm,business_id:await tenant()}))).status,400);
  assert.equal((await support.POST(request('/api/commerce/support',{...confirm,session:randomBytes(32).toString('hex')}))).status,400);
  const created = await support.POST(request('/api/commerce/support',confirm)); assert.equal(created.status,200);
  const saved = await created.json(); assert.equal(saved.notificationStatus,'failed'); assert.ok(saved.caseNumber.startsWith('EB-'));
  const retry = await support.POST(request('/api/commerce/support',confirm)); assert.equal((await retry.json()).caseNumber,saved.caseNumber);
  assert.equal(state.mails.length,1);
  assert.equal((await database.pg.query('select id from commerce_tickets where business_id=$1',[business_id])).rows.length,1);
  state.mailError = null;
});
test('order HTTP flow sends only to canonical API email and blocks all status until code confirmation',async () => {
  const business_id = await connectedTenant(); state.jobs=[]; state.mails=[];
  let lookups=0;
  state.transport=async url => { lookups++; assert.ok(url.pathname.endsWith('/orders/123')); return {number:'123',status:'processing',billing:{email:'Customer@example.com'}}; };
  const response=await orders.POST(request('/api/commerce/orders',{business_id,session,action:'request',order:{number:'123',email:'customer@example.com'}}));
  assert.equal(response.status,200); const challenge=await response.json(); assert.equal(lookups,0); assert.equal(challenge.order,undefined);
  await state.jobs.shift()(); assert.equal(state.mails[0].message.to,'Customer@example.com');
  const code=state.mails[0].message.text.match(/\b\d{6}\b/)[0];
  assert.equal((await orders.POST(request('/api/commerce/orders',{business_id,session,action:'verify',challenge:challenge.challenge,code:'000000'}))).status,400);
  const verified=await orders.POST(request('/api/commerce/orders',{business_id,session,action:'verify',challenge:challenge.challenge,code}));
  assert.equal(verified.status,200); const details=await verified.json(); assert.equal(details.order.status,'processing'); assert.equal(details.order.contactEmail,undefined); assert.equal(lookups,2);
  assert.equal((await orders.POST(request('/api/commerce/orders',{business_id,session,action:'verify',challenge:challenge.challenge,code}))).status,400);
});
test('dashboard HTTP routes require login, enforce owner isolation and reject cross-origin writes',async () => {
  const userId=randomUUID(),own=await tenant(userId),other=await tenant();
  state.user=null;
  assert.equal((await commerce.GET(new NextRequest(`${origin}/api/dashboard/commerce?business_id=${own}`))).status,401);
  state.user={id:userId};
  assert.equal((await commerce.GET(new NextRequest(`${origin}/api/dashboard/commerce?business_id=${other}`))).status,404);
  assert.equal((await tickets.GET(new NextRequest(`${origin}/api/dashboard/tickets?business_id=${other}`))).status,404);
  assert.equal((await commerce.POST(request('/api/dashboard/commerce',{business_id:own,action:'settings',notificationEmail:'owner@example.com'},'https://attacker.example'))).status,403);
  assert.equal((await commerce.POST(request('/api/dashboard/commerce',{business_id:own,action:'settings',notificationEmail:'owner@example.com'}))).status,200);
  const result=await commerce.GET(new NextRequest(`${origin}/api/dashboard/commerce?business_id=${own}`)); assert.equal(result.status,200);
  assert.equal((await result.json()).notificationEmail,'owner@example.com');
});
test('WooCommerce authorizes read scope and receives credentials exclusively in the server callback',async () => {
  const userId=randomUUID(), business_id=await tenant(userId); state.user={id:userId}; state.jobs=[];
  const response=await commerce.POST(request('/api/dashboard/commerce',{business_id,action:'woocommerce',origin:'https://shop.example',currency:'DKK'}));
  assert.equal(response.status,200); const authorize=new URL((await response.json()).url);
  assert.equal(authorize.pathname,'/wc-auth/v1/authorize'); assert.equal(authorize.searchParams.get('scope'),'read'); assert.ok(authorize.searchParams.get('callback_url').startsWith('https://'));
  const input={user_id:authorize.searchParams.get('user_id'),consumer_key:`ck_${'a'.repeat(40)}`,consumer_secret:`cs_${'b'.repeat(40)}`,key_permissions:'read'};
  assert.equal((await wooCallback.POST(request('/api/commerce/woocommerce/callback',{...input,key_permissions:'read_write'}))).status,400);
  const accepted=await wooCallback.POST(request('/api/commerce/woocommerce/callback',input)); assert.equal(accepted.status,200);
  const pending=(await database.pg.query('select status,credentials from commerce_integrations where business_id=$1',[business_id])).rows[0]; assert.equal(pending.status,'pending'); assert.equal(pending.credentials.includes('ck_'),false);
  state.transport=async url=>url.pathname.includes('/settings/')?[{id:'woocommerce_currency',value:'DKK'}]:[];
  await state.jobs.shift()();
  const status=await commerce.GET(new NextRequest(`${origin}/api/dashboard/commerce?business_id=${business_id}`));
  const publicSetup=await status.json(); assert.equal(publicSetup.integration.status,'connected'); assert.equal(JSON.stringify(publicSetup).includes('credentials'),false);
  assert.equal((await wooCallback.POST(request('/api/commerce/woocommerce/callback',input))).status,400);
  assert.equal((await commerce.POST(request('/api/dashboard/commerce',{business_id,action:'disconnect'}))).status,200);
  assert.equal((await database.pg.query('select credentials from commerce_integrations where business_id=$1',[business_id])).rows[0].credentials,null);
});
test('order verification reports missing configuration and IP throttling fails closed',async () => {
  const business_id=await connectedTenant(); const old=process.env.COMMERCE_EMAIL_FROM; delete process.env.COMMERCE_EMAIL_FROM;
  const missing=await orders.POST(request('/api/commerce/orders',{business_id,session,action:'request',order:{number:'123',email:'customer@example.com'}})); assert.equal(missing.status,503);
  process.env.COMMERCE_EMAIL_FROM=old;
  for(let n=0;n<16;n++) await orders.POST(request('/api/commerce/orders',{business_id,session,action:'invalid'}));
  const limited=await orders.POST(request('/api/commerce/orders',{business_id,session,action:'invalid'})); assert.equal(limited.status,429);
});
