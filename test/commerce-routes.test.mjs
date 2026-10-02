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
  const mocks = { '@supabase/supabase-js': 'supabase-js', '@supabase/ssr': 'supabase-ssr', 'next/server': 'next-server', 'next/headers': 'next-headers', '@/lib/resend': 'resend', 'resend': 'resend', '@/lib/website-crawl': 'website-crawl', '@/lib/website-source': 'website-source' };
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
const { seal, unseal } = await import('../lib/commerce/security.ts');
const { NextRequest } = await import('next/server.js');
const support = await import('../app/api/commerce/support/route.ts');
const orders = await import('../app/api/commerce/orders/route.ts');
const tickets = await import('../app/api/dashboard/tickets/route.ts');
const commerce = await import('../app/api/dashboard/commerce/route.ts');
const wooCallback = await import('../app/api/commerce/woocommerce/callback/route.ts');
const websiteSource = await import('../app/api/dashboard/website-source/route.ts');
const ingest = await import('../app/api/ingest/route.ts');
const previews = await import('../app/api/product-preview/route.ts');
const { websiteIngestToken } = await import('../lib/website-ingest-token.ts');
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
test('support-only chatbot saves confirmed requests without a shop key or mail provider',async () => {
  const business_id=await tenant(),other=await tenant();
  const oldKey=process.env.COMMERCE_ENCRYPTION_KEY,oldService=process.env.SUPABASE_SERVICE_KEY,oldMail=process.env.RESEND_API_KEY;
  delete process.env.COMMERCE_ENCRYPTION_KEY; delete process.env.RESEND_API_KEY;
  process.env.SUPABASE_SERVICE_KEY=randomBytes(32).toString('base64');
  try {
    assert.throws(() => seal({consumerSecret:'private'},`credentials:${business_id}`));
    const prepare=await support.POST(request('/api/commerce/support',{business_id,session,action:'prepare',contactEmail:'customer@example.com',description:'Jeg vil gerne tale med Axel om en Enterprise-aftale.'}));
    assert.equal(prepare.status,200);
    const draft=await prepare.json();
    assert.equal((await database.pg.query('select id from commerce_tickets where business_id=$1',[business_id])).rows.length,0);
    const input={business_id,session,action:'confirm',confirmation:draft.confirmation,confirmed:true};
    assert.equal((await support.POST(request('/api/commerce/support',{...input,business_id:other}))).status,400);
    assert.equal((await support.POST(request('/api/commerce/support',{...input,session:randomBytes(32).toString('hex')}))).status,400);
    assert.equal((await support.POST(request('/api/commerce/support',{...input,confirmed:false}))).status,400);
    const response=await support.POST(request('/api/commerce/support',input));
    assert.equal(response.status,200);const saved=await response.json();
    assert.match(saved.caseNumber,/^EB-/);assert.equal(saved.notificationStatus,'not_configured');
    assert.equal((await support.POST(request('/api/commerce/support',input))).status,200);
    assert.equal((await database.pg.query('select id from commerce_tickets where business_id=$1',[business_id])).rows.length,1);
  } finally { process.env.COMMERCE_ENCRYPTION_KEY=oldKey;process.env.SUPABASE_SERVICE_KEY=oldService;process.env.RESEND_API_KEY=oldMail; }
});
test('support mail reuses the app sender when no commerce sender override is configured',async () => {
  const business_id=await tenant(),oldFrom=process.env.COMMERCE_EMAIL_FROM;
  delete process.env.COMMERCE_EMAIL_FROM; state.mails=[];state.mailError=null;
  try {
    await database.pg.query('insert into commerce_settings(business_id,notification_email) values($1,$2)',[business_id,'owner@example.com']);
    const prepared=await support.POST(request('/api/commerce/support',{business_id,session,action:'prepare',contactEmail:'customer@example.com',description:'Please help me with this question'}));
    const draft=await prepared.json();
    const saved=await support.POST(request('/api/commerce/support',{business_id,session,action:'confirm',confirmation:draft.confirmation,confirmed:true}));
    assert.equal(saved.status,200);assert.equal((await saved.json()).notificationStatus,'sent');
    assert.equal(state.mails.length,1);assert.equal(state.mails[0].message.from,'EmbedBot <axel@embedbot.dk>');
    assert.equal(state.mails[0].message.to,'owner@example.com');assert.equal(state.mails[0].message.replyTo,'customer@example.com');
  } finally { process.env.COMMERCE_EMAIL_FROM=oldFrom; }
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
test('support badge counts all new cases for the owner and decreases after status changes',async () => {
  const userId=randomUUID(),business_id=await tenant(userId),other=await tenant();
  state.user={id:userId};
  await database.pg.query("insert into commerce_tickets(business_id,submission_key,contact_email,description,status) select $1,'badge-' || n,'customer@example.com','Please help me with my question','new' from generate_series(1,105) n",[business_id]);
  await database.pg.query("insert into commerce_tickets(business_id,submission_key,contact_email,description,status) values($1,'closed','customer@example.com','A completed customer question','closed'),($2,'other','customer@example.com','A different business question','new')",[business_id,other]);
  const url=`${origin}/api/dashboard/tickets?business_id=${business_id}&summary=1`;
  assert.deepEqual(await (await tickets.GET(new NextRequest(url))).json(),{newCount:105});
  assert.equal((await tickets.GET(new NextRequest(`${origin}/api/dashboard/tickets?business_id=${other}&summary=1`))).status,404);
  const id=(await database.pg.query("select id from commerce_tickets where business_id=$1 and status='new' limit 1",[business_id])).rows[0].id;
  assert.equal((await tickets.POST(request('/api/dashboard/tickets',{business_id,id,action:'status',status:'in_progress'}))).status,200);
  assert.deepEqual(await (await tickets.GET(new NextRequest(url))).json(),{newCount:104});
  state.user=null;assert.equal((await tickets.GET(new NextRequest(url))).status,401);
});
test('notification email saves without a commerce key and retains ownership, validation and throttling',async () => {
  const userId=randomUUID(),business_id=await tenant(userId),other=await tenant();
  state.user={id:userId};
  const savedKey=process.env.COMMERCE_ENCRYPTION_KEY;
  delete process.env.COMMERCE_ENCRYPTION_KEY;
  try {
    const input={business_id,action:'settings',notificationEmail:' Owner@Example.com '};
    assert.equal((await commerce.POST(request('/api/dashboard/commerce',{...input,business_id:other}))).status,404);
    assert.equal((await commerce.POST(request('/api/dashboard/commerce',input,'https://evil.example'))).status,403);
    assert.equal((await commerce.POST(request('/api/dashboard/commerce',{...input,notificationEmail:'invalid'}))).status,400);
    assert.equal((await commerce.POST(request('/api/dashboard/commerce',input))).status,200);
    assert.equal((await database.pg.query('select notification_email from commerce_settings where business_id=$1',[business_id])).rows[0].notification_email,'owner@example.com');
    for(let n=0;n<12;n++) assert.equal((await commerce.POST(request('/api/dashboard/commerce',input))).status,200);
    assert.equal((await commerce.POST(request('/api/dashboard/commerce',input))).status,429);
  } finally { process.env.COMMERCE_ENCRYPTION_KEY=savedKey; }
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
  const business_id=await connectedTenant(); const old=process.env.RESEND_API_KEY; delete process.env.RESEND_API_KEY;
  const missing=await orders.POST(request('/api/commerce/orders',{business_id,session,action:'request',order:{number:'123',email:'customer@example.com'}})); assert.equal(missing.status,503);
  process.env.RESEND_API_KEY=old;
  for(let n=0;n<16;n++) await orders.POST(request('/api/commerce/orders',{business_id,session,action:'invalid'}));
  const limited=await orders.POST(request('/api/commerce/orders',{business_id,session,action:'invalid'})); assert.equal(limited.status,429);
});
test('HTML upload is owner-only, needs no commerce key, stores only text and isolates replacement/removal per bot', async () => {
  const userId=randomUUID(),business_id=await tenant(userId),other=await tenant();
  state.user={id:userId};
  const savedKey=process.env.COMMERCE_ENCRYPTION_KEY; delete process.env.COMMERCE_ENCRYPTION_KEY;
  try {
    const input={business_id,action:'html',filename:'index.html',html:'<h1>Vores HTML-butik</h1><p>Håndlavede lamper med to års garanti.</p><script>secret()</script>'};
    assert.equal((await websiteSource.POST(request('/api/dashboard/website-source',{...input,business_id:other}))).status,404);
    assert.equal((await websiteSource.POST(request('/api/dashboard/website-source',input,'https://evil.example'))).status,403);
    assert.equal((await websiteSource.POST(request('/api/dashboard/website-source',input))).status,200);
    const stored=(await database.pg.query('select * from website_sources where business_id=$1',[business_id])).rows[0];
    assert.equal(stored.content_text.includes('secret'),false); assert.equal(stored.content_text.includes('<'),false);
    assert.ok(stored.content_text.includes('to års garanti'));
    const status=await websiteSource.GET(new NextRequest(`${origin}/api/dashboard/website-source?business_id=${business_id}`));
    const summary=await status.json(); assert.equal(summary.source.source_name,'index.html'); assert.equal(summary.source.content_text,undefined);
    assert.equal((await websiteSource.POST(request('/api/dashboard/website-source',{...input,filename:'script.js'}))).status,400);
    assert.equal((await websiteSource.POST(request('/api/dashboard/website-source',{...input,html:'<p>Opdateret viden om butikkens services.</p>'}))).status,200);
    assert.equal((await database.pg.query('select * from website_sources where business_id=$1',[business_id])).rows.length,1);
    await database.pg.exec('set role authenticated');
    await assert.rejects(database.pg.query('select * from website_sources'));
    await database.pg.exec('reset role');
    assert.equal((await websiteSource.POST(request('/api/dashboard/website-source',{business_id,action:'disconnect'}))).status,200);
    assert.equal((await database.pg.query('select * from website_sources where business_id=$1',[business_id])).rows.length,0);
  } finally { process.env.COMMERCE_ENCRYPTION_KEY=savedKey; }
});
test('onboarding WooCommerce authorization returns to setup and arbitrary return URLs are ignored',async()=>{
  const userId=randomUUID(),business_id=await tenant(userId);state.user={id:userId};
  const input={business_id,action:'woocommerce',origin:'https://shop.example',currency:'DKK',returnTo:'setup'};
  const response=await commerce.POST(request('/api/dashboard/commerce',input));assert.equal(response.status,200);
  const authorize=new URL((await response.json()).url),back=new URL(authorize.searchParams.get('return_url'));
  assert.equal(back.pathname,'/setup');assert.equal(back.searchParams.get('business_id'),business_id);
  const safe=await commerce.POST(request('/api/dashboard/commerce',{...input,returnTo:'https://evil.example'}));
  assert.equal(new URL(new URL((await safe.json()).url).searchParams.get('return_url')).pathname,'/dashboard');
});
test('Shopify binds the onboarding return destination and bot to encrypted server state',async()=>{
  const userId=randomUUID(),business_id=await tenant(userId);state.user={id:userId};
  process.env.SHOPIFY_CLIENT_ID='mock-client';process.env.SHOPIFY_CLIENT_SECRET='mock-secret';
  const response=await commerce.POST(request('/api/dashboard/commerce',{business_id,action:'shopify',domain:'mock.myshopify.com',returnTo:'setup'}));
  assert.equal(response.status,200);
  const encrypted=decodeURIComponent(response.headers.get('set-cookie').match(/commerce_oauth=([^;]+)/)[1]);
  const stateToken=unseal(encrypted,'shopify-oauth');
  assert.equal(stateToken.returnTo,'setup');assert.equal(stateToken.businessId,business_id);assert.equal(stateToken.userId,userId);
  assert.ok(stateToken.expires>Date.now());
});
test('a local HTML source activates without a website fetch and still requires confirmed billing',async()=>{
  await database.pg.exec(`alter table businesses add column subscription_status text, add column payment_status text, add column stripe_subscription_id text, add column subscription_updated_at timestamptz, add column activated_at timestamptz`);
  const business_id=await tenant();
  await database.pg.query('update businesses set activated=false,support_email=$2,name=$3 where id=$1',[business_id,'owner@example.com','HTML shop']);
  await database.pg.query("insert into website_sources(business_id,source_kind,source_name,content_text,character_count) values($1,'html','index.html','Indhold om vores butik og dens services.',40)",[business_id]);
  const {activateBusinessAndSendEmail}=await import('../lib/business-activation.ts');
  assert.equal((await activateBusinessAndSendEmail(business_id)).status,402);
  const savedFetch=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('Unexpected external website request')};state.mails=[];state.mailError=null;
  try {
    const result=await activateBusinessAndSendEmail(business_id,{paymentConfirmed:true,subscriptionStatus:'active',paymentStatus:'paid'});
    assert.equal(result.success,true,JSON.stringify(result));assert.equal(state.mails.length,1);
    assert.equal((await database.pg.query('select activated from businesses where id=$1',[business_id])).rows[0].activated,true);
  } finally {globalThis.fetch=savedFetch;}
});

test('URL import crawls product pages and saves isolated source knowledge; internal ingestion is authenticated',async () => {
  const userId=randomUUID(),business_id=await tenant(userId),other=await tenant();
  state.user={id:userId};
  await database.pg.query('update businesses set website_url=$1 where id=$2',['https://shop.example/',business_id]);
  let reads=0;
  state.websiteReader=async url=>{
    reads++;
    if(url.endsWith('.xml'))throw new Error('no sitemap');
    return {url,html:new URL(url).pathname==='/' ? '<html><body><h1>Vores butik</h1><p>Vi sælger kreativt tilbehør.</p><a href="/products/project-14">Project 14 Pindeetui</a></body></html>' : '<html><body><h1>Project 14 Pindeetui</h1><p>Et etui til strikkepinde.</p></body></html>'};
  };
  try {
    const input={business_id,action:'url',url:'https://shop.example/'};
    assert.equal((await websiteSource.POST(request('/api/dashboard/website-source',{...input,business_id:other}))).status,404);
    assert.equal(reads,0);
    const imported=await websiteSource.POST(request('/api/dashboard/website-source',input));
    assert.equal(imported.status,200);
    assert.equal((await imported.json()).pages,2);
    const stored=(await database.pg.query('select * from website_sources where business_id=$1',[business_id])).rows[0];
    assert.match(stored.content_text,/https:\/\/shop.example\/products\/project-14/);
    assert.equal(stored.source_kind,'url');
    assert.equal((await database.pg.query('select * from website_sources where business_id=$1',[other])).rows.length,0);
    state.user=null;
    const before=reads;
    assert.equal((await ingest.POST(request('/api/ingest',{business_id,url:input.url}))).status,401);
    assert.equal(reads,before);
    const signed=new NextRequest(`${origin}/api/ingest`,{method:'POST',headers:{'Content-Type':'application/json','x-website-ingest-token':websiteIngestToken(business_id)},body:JSON.stringify({business_id,url:input.url})});
    assert.equal((await ingest.POST(signed)).status,200);
    const bad=new NextRequest(`${origin}/api/ingest`,{method:'POST',headers:{'Content-Type':'application/json','x-website-ingest-token':websiteIngestToken(business_id)},body:JSON.stringify({business_id,url:'https://evil.example/'})});
    assert.equal((await ingest.POST(bad)).status,400);
    const count=reads;
    const crossTenant=new NextRequest(`${origin}/api/ingest`,{method:'POST',headers:{'Content-Type':'application/json','x-website-ingest-token':websiteIngestToken(business_id)},body:JSON.stringify({business_id:other,url:input.url})});
    assert.equal((await ingest.POST(crossTenant)).status,403);
    assert.equal(reads,count);
  } finally {state.websiteReader=null;state.user=null;}
});

test('public product previews are restricted to the chatbot website, cache images and omit price/stock data',async()=>{
  const business_id=await tenant();
  await database.pg.query('update businesses set website_url=$1 where id=$2',['https://shop.example/',business_id]);
  let reads=0;
  state.websiteReader=async(url,options)=>{
    reads++;assert.equal(options.origin,'https://shop.example');
    return {url,html:'<html><body><h1>Project 14</h1><script type="application/ld+json">{"@type":"Product","name":"Project 14","image":"https://cdn.example/p14.jpg","offers":{"price":"699","availability":"https://schema.org/InStock"}}</script></body></html>'};
  };
  const req=url=>new NextRequest(`${origin}/api/product-preview?business_id=${business_id}&url=${encodeURIComponent(url)}`);
  try{
    assert.equal((await previews.GET(req('https://evil.example/products/p14'))).status,400);
    assert.equal((await previews.GET(req('http://shop.example/products/p14'))).status,400);
    assert.equal(reads,0);
    const response=await previews.GET(req('https://shop.example/products/p14'));assert.equal(response.status,200);
    const data=await response.json();assert.deepEqual(data.product,{name:'Project 14',url:'https://shop.example/products/p14',image:'https://cdn.example/p14.jpg'});
    assert.equal((await previews.GET(req('https://shop.example/products/p14'))).status,200);assert.equal(reads,1);
    await database.pg.query('update businesses set is_deleted=true where id=$1',[business_id]);
    assert.equal((await previews.GET(req('https://shop.example/products/p14'))).status,404);
    assert.equal(reads,1);
  }finally{state.websiteReader=null;}
});
