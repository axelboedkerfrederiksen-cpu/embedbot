import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { resolve as resolvePath } from 'node:path';
import { randomUUID,randomBytes,createHash } from 'node:crypto';
import { test,before,after } from 'node:test';
import assert from 'node:assert/strict';
import { state } from './helpers/runtime.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
registerHooks({resolve(specifier,context,nextResolve){
 const mocks={'@supabase/supabase-js':'supabase-js','@supabase/ssr':'supabase-ssr','next/server':'next-server','next/headers':'next-headers','resend':'resend'};
 if(mocks[specifier])return {url:new URL(`./helpers/${mocks[specifier]}.mjs`,import.meta.url).href,shortCircuit:true};
 if(specifier.startsWith('@/')){const path=resolvePath(root,specifier.slice(2));return {url:pathToFileURL(existsSync(`${path}.ts`)?`${path}.ts`:`${path}/index.ts`).href,shortCircuit:true};}
 return nextResolve(specifier,context);
}});
process.env.SUPABASE_URL='https://mock.invalid';process.env.SUPABASE_SERVICE_KEY='test-service-secret-with-more-than-32-characters';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://mock.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='mock';
process.env.COMMERCE_ENCRYPTION_KEY=randomBytes(32).toString('base64');
process.env.CRON_SECRET='test-cron';
process.env.RESEND_API_KEY='test-mail';process.env.NEXT_PUBLIC_APP_URL='https://mock.invalid';
const {testDatabase}=await import('./helpers/commerce-db.ts');
const privacy=await import('../app/api/dashboard/privacy/route.ts');
const legal=await import('../app/api/dashboard/legal/route.ts');
const visitor=await import('../app/api/dashboard/visitor-data/route.ts');
const accountExport=await import('../app/api/auth/export-data/route.ts');
const cleanup=await import('../app/api/cron/cleanup/route.ts');
const supportCron=await import('../app/api/cron/support/route.ts');
const trial=await import('../app/api/dashboard/trial/route.ts');
const activation=await import('../app/api/activate/route.ts');
const deletion=await import('../app/api/conversations/delete/route.ts');
const {verifyAdminSession}=await import('../lib/admin-auth.ts');
const {privacyUrl,visitorSelector}=await import('../lib/compliance/validation.ts');
const {businessInput}=await import('../lib/compliance/business-input.ts');
const {chatReference,readChatReference}=await import('../lib/compliance/chat-reference.ts');
const {TERMS,DPA}=await import('../lib/compliance/legal.ts');
const {NextRequest}=await import('next/server.js');
let db;
before(async()=>{db=await testDatabase();state.db=db.client;});
after(async()=>db?.pg.close());
const origin='https://embedbot.example';
const request=(path,input,suppliedOrigin=origin,method='POST')=>new NextRequest(origin+path,{method,headers:{Origin:suppliedOrigin,'Content-Type':'application/json'},body:JSON.stringify(input)});
async function tenant(){const id=randomUUID(),userId=randomUUID();await db.pg.query('insert into businesses(id,user_id,name,activated) values($1,$2,$3,false)',[id,userId,'Test']);state.user={id:userId,email:'owner@example.com',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString()};return id;}
async function chat(businessId,text,age='0 days'){const id=randomUUID();await db.pg.query('insert into conversations(id,business_id,messages,created_at) values($1,$2,$3,now()-$4::interval)',[id,businessId,JSON.stringify([{role:'user',content:text}]),age]);return id;}
async function ticket(businessId,email,context=[],ids=[],age='0 days'){const id=randomUUID();await db.pg.query('insert into commerce_tickets(id,business_id,submission_key,contact_email,description,context,conversation_ids,created_at) values($1,$2,$3,$4,$5,$6,$7,now()-$8::interval)',[id,businessId,randomUUID(),email,'Test support description',JSON.stringify(context),ids,age]);return id;}

test('URL validation rejects executable, credential-bearing, fragmented and whitespace URLs; generic forms cannot forge ownership or billing',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,hello','http://example.com','https://user:pass@example.com','https://example.com/#secret','https://exa mple.com','https:\\example.com'])assert.throws(()=>privacyUrl(url));
 assert.equal(privacyUrl('https://example.com/privacy'),'https://example.com/privacy');assert.equal(privacyUrl(''),null);
 assert.deepEqual(businessInput({name:'Safe',id:randomUUID(),user_id:randomUUID(),activated:'true',plan:'scale',retention_days:'1',customer_privacy_url:'x',stripe_subscription_id:'forged'}),{name:'Safe'});
 assert.throws(()=>visitorSelector('email','bad'));assert.equal(visitorSelector('email','Alice@Example.com').value,'alice@example.com');
});
test('private privacy/legal endpoints require session, owner, same-origin and exact published immutable versions',async()=>{
 const business=await tenant(),owner=state.user;state.user=null;
 assert.equal((await privacy.POST(request('/api/dashboard/privacy',{business_id:business}))).status,401);state.user=owner;
 const other=await tenant();state.user=owner;
 assert.equal((await privacy.POST(request('/api/dashboard/privacy',{business_id:other}))).status,404);
 const input={business_id:business,customerPrivacyUrl:'https://example.com/privacy',chatRetentionDays:30,ticketRetentionDays:90};
 assert.equal((await privacy.POST(request('/api/dashboard/privacy',input,'https://evil.example'))).status,403);
 assert.equal((await privacy.POST(request('/api/dashboard/privacy',{...input,customerPrivacyUrl:'javascript:alert(1)'}))).status,400);
 assert.equal((await privacy.POST(request('/api/dashboard/privacy',input))).status,200);
 const fetched=await (await privacy.GET(new NextRequest(`${origin}/api/dashboard/privacy?business_id=${business}`))).json();assert.equal(fetched.chatRetentionDays,30);
 assert.equal((await legal.POST(request('/api/dashboard/legal',{business_id:business,slug:'dpa',version:DPA.version,confirmed:true}))).status,400);
 assert.equal((await legal.POST(request('/api/dashboard/legal',{business_id:business,slug:'terms',version:'unknown',confirmed:true}))).status,400);
 const accept={business_id:business,slug:'terms',version:TERMS.version,confirmed:true};
 for(let i=0;i<2;i++)assert.equal((await legal.POST(request('/api/dashboard/legal',accept))).status,200);
 const accepts=await db.pg.query('select * from legal_acceptances where business_id=$1',[business]);assert.equal(accepts.rows.length,1);assert.equal(accepts.rows[0].accepted_by,owner.id);assert.ok(accepts.rows[0].accepted_at);
 assert.equal((await db.pg.query('select count(*)::int n from legal_acceptances where business_id=$1',[other])).rows[0].n,0);
 const forged=await db.client.rpc('accept_legal_document',{p_business_id:business,p_actor:owner.id,p_slug:'terms',p_version:TERMS.version,p_sha256:'0'.repeat(64)});assert.ok(forged.error);
 await assert.rejects(db.pg.query("update legal_document_versions set status='published' where slug='dpa'"),/create_a_new_document_version/);
 for(const doc of [TERMS,DPA]){const {sha256,...canonical}=doc;assert.equal(createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),sha256);}
});
test('trial is card-free and open-ended by default; only an agreed deadline expires; cannot restart or replace paid access',async()=>{
 const business=await tenant();const payload=request('/api/dashboard/trial',{business_id:business});assert.equal((await trial.POST(payload)).status,409);
 await legal.POST(request('/api/dashboard/legal',{business_id:business,slug:'terms',version:TERMS.version,confirmed:true}));
 const first=await trial.POST(request('/api/dashboard/trial',{business_id:business}));assert.equal(first.status,200);const end=(await first.json()).trialEndsAt;
 assert.equal((await (await trial.POST(request('/api/dashboard/trial',{business_id:business}))).json()).trialEndsAt,end);
 const saved=(await db.pg.query('select activated,subscription_status,payment_status,stripe_subscription_id,current_period_end from businesses where id=$1',[business])).rows[0];assert.equal(saved.subscription_status,'trialing');assert.equal(saved.payment_status,'unpaid');assert.equal(saved.stripe_subscription_id,null);assert.equal(saved.current_period_end,null);assert.equal(end,null);
 const {isBusinessSubscriptionActive}=await import('../lib/subscription.ts');assert.equal(isBusinessSubscriptionActive(saved),true);
 await db.pg.query("update businesses set activated_at=now()-interval '30 days' where id=$1",[business]);assert.equal((await trial.POST(request('/api/dashboard/trial',{business_id:business,agreed_trial_ends_at:new Date().toISOString()}))).status,200);assert.equal((await db.pg.query('select current_period_end from businesses where id=$1',[business])).rows[0].current_period_end,null);
 await db.pg.query("update businesses set current_period_end=now()-interval '1 second' where id=$1",[business]);assert.equal((await trial.POST(request('/api/dashboard/trial',{business_id:business}))).status,409);
 assert.equal(isBusinessSubscriptionActive({...saved,current_period_end:new Date(Date.now()-1000).toISOString()}),false);
 await db.pg.query("update businesses set stripe_subscription_id='sub_existing',payment_status='paid',subscription_status='active' where id=$1",[business]);assert.equal((await trial.POST(request('/api/dashboard/trial',{business_id:business}))).status,409);
});
test('admin activation defaults to no deadline; agreed deadline requires acknowledgement and is reflected in the email',async()=>{
 const previousIds=process.env.ADMIN_USER_IDS,previousMfa=process.env.ADMIN_REQUIRE_MFA;
 try {
  for(const hasDeadline of [false,true]) {
   const business=await tenant();process.env.ADMIN_USER_IDS=state.user.id;process.env.ADMIN_REQUIRE_MFA='false';state.aal={currentLevel:'aal1',nextLevel:'aal1'};
   await db.pg.query("update businesses set support_email='customer@example.com' where id=$1",[business]);
   await db.pg.query("insert into website_sources(business_id,source_kind,source_name,content_text,character_count) values($1,'url','Test',$2,200)",[business,'a'.repeat(200)]);
   const end=new Date(Date.now()+86400000).toISOString();
   if(hasDeadline)assert.equal((await activation.POST(request('/api/activate',{business_id:business,agreed_trial_ends_at:end}))).status,400);
   const response=await activation.POST(request('/api/activate',{business_id:business,...(hasDeadline?{agreed_trial_ends_at:end,end_date_agreed:true}:{})}));assert.equal(response.status,200);
   const saved=(await db.pg.query('select activated,current_period_end from businesses where id=$1',[business])).rows[0];assert.equal(saved.activated,true);assert.equal(saved.current_period_end?.toISOString()??null,hasDeadline?end:null);
   const html=state.mails.at(-1).message.html;assert.match(html,hasDeadline?/Som aftalt afsluttes/:/ingen aftalt automatisk slutdato/);
  }
 }finally{if(previousIds===undefined)delete process.env.ADMIN_USER_IDS;else process.env.ADMIN_USER_IDS=previousIds;if(previousMfa===undefined)delete process.env.ADMIN_REQUIRE_MFA;else process.env.ADMIN_REQUIRE_MFA=previousMfa;delete state.aal;}
});
test('visitor lookup enforces identity acknowledgement, exact email, Origin, login and tenant; deletion removes copied context atomically',async()=>{
 const a=await tenant(),user=state.user;const b=await tenant();state.user=user;
 const ca=await chat(a,'Email Alice@example.com, tak');const cb=await chat(b,'alice@example.com');await chat(a,'malice@example.com');
 const ta=await ticket(a,'alice@example.com');const tb=await ticket(b,'alice@example.com');const copied=await ticket(a,'other@example.com',[{role:'user',content:'Kopieret chat'}],[ca]);
 const input={business_id:a,action:'search',kind:'email',value:'alice@example.com',identityVerified:true};
 assert.equal((await visitor.POST(request('/api/dashboard/visitor-data',{...input,identityVerified:false}))).status,400);
 assert.equal((await visitor.POST(request('/api/dashboard/visitor-data',input,'https://evil.example'))).status,403);
 assert.equal((await visitor.POST(request('/api/dashboard/visitor-data',{...input,business_id:b}))).status,404);
 const searched=await visitor.POST(request('/api/dashboard/visitor-data',input));assert.equal(searched.status,200);const rows=(await searched.json()).records;assert.equal(rows.length,2);assert.ok(rows.some(r=>r.id===ca));assert.ok(rows.some(r=>r.id===ta));
 assert.equal((await visitor.POST(request('/api/dashboard/visitor-data',{...input,action:'delete',confirmDelete:false}))).status,400);
 const erased=await visitor.POST(request('/api/dashboard/visitor-data',{...input,action:'delete',confirmDelete:true}));assert.equal(erased.status,200);assert.equal((await erased.json()).deleted,2);
 assert.equal((await db.pg.query('select context from commerce_tickets where id=$1',[copied])).rows[0].context.length,0);
 assert.equal((await db.pg.query('select id from conversations where id=$1',[cb])).rows.length,1);assert.equal((await db.pg.query('select id from commerce_tickets where id=$1',[tb])).rows.length,1);
 const audit=(await db.pg.query('select * from compliance_audit_events where business_id=$1',[a])).rows;assert.ok(audit.some(e=>e.action==='visitor.delete'));assert.ok(!JSON.stringify(audit).includes('alice@example.com'));
});
test('reference-linked visitor export and delete cover more than 500 records before links are cleared',async()=>{
 const business=await tenant();const ref=await chat(business,'ingen email');
 await db.pg.query("insert into commerce_tickets(business_id,submission_key,contact_email,description,conversation_ids) select $1,gen_random_uuid()::text,'other@example.com','Support request',array[$2::uuid] from generate_series(1,1101)",[business,ref]);
 const input={business_id:business,kind:'conversation',value:ref,identityVerified:true};
 const result=await visitor.POST(request('/api/dashboard/visitor-data',{...input,action:'export'}));assert.equal(result.status,200);assert.equal((await result.json()).records.length,1102);
 const erased=await visitor.POST(request('/api/dashboard/visitor-data',{...input,action:'delete',confirmDelete:true}));assert.equal(erased.status,200);assert.equal((await erased.json()).deleted,1102);
 assert.equal((await db.pg.query('select count(*)::int n from commerce_tickets where business_id=$1',[business])).rows[0].n,0);
});
test('account export includes all paginated relations and archived accepts, never credentials, secrets, arbitrary auth metadata or another tenant',async()=>{
 const business=await tenant(),user=state.user;const other=await tenant();state.user={...user,user_metadata:{access_token:'AUTH_SECRET'}};
 await db.pg.query("insert into profiles(id,display_name) values($1,'Owner')",[user.id]);
 await db.pg.query("insert into conversations(business_id,messages) select $1,'[{\"role\":\"user\",\"content\":\"Paginated\"}]'::jsonb from generate_series(1,1203)",[business]);await chat(other,'OTHER_TENANT_PRIVATE');
 await ticket(business,'visitor@example.com');await db.pg.query("insert into documents(business_id,content) values($1,'Knowledge')",[business]);
 await db.pg.query("insert into support_messages(email,message) values('owner@example.com','Support')");
 await db.pg.query("insert into customer_messages(business_id,body) values($1,'Welcome')",[business]);
 await db.pg.query("insert into website_sources(business_id,source_kind,source_name,content_text,character_count) values($1,'html','index.html','Source knowledge for our business and services.',46)",[business]);
 await db.pg.query("insert into commerce_integrations(business_id,platform,shop_url,status,credentials) values($1,'woocommerce','https://shop.example','connected','ENCRYPTED_SECRET')",[business]);
 await db.pg.query("insert into commerce_settings(business_id,notification_email) values($1,'help@example.com')",[business]);
 await legal.POST(request('/api/dashboard/legal',{business_id:business,slug:'terms',version:TERMS.version,confirmed:true}));
 const response=await accountExport.GET();assert.equal(response.status,200);const result=await response.json();
 assert.equal(result.businesses.length,1);assert.equal(result.profiles.length,1);assert.equal(result.conversations.length,1203);
 for(const name of ['documents','customer_messages','commerce_tickets','website_sources','commerce_integrations','commerce_settings','accepted_documents'])assert.equal(result[name].length,1,name);
 const raw=JSON.stringify(result);for(const secret of ['ENCRYPTED_SECRET','AUTH_SECRET','OTHER_TENANT_PRIVATE','"credentials":','"submission_key":'])assert.ok(!raw.includes(secret),secret);
 state.user=null;assert.equal((await accountExport.GET()).status,401);
});
test('cleanup handles expiry, non-expiry, different tenant periods, context, proofs and separately configured messages; idempotent with durable success/failure',async()=>{
 const a=await tenant(),user=state.user;const b=await tenant();state.user=user;
 await db.pg.query('update businesses set retention_days=30 where id=$1',[a]);await db.pg.query('update businesses set retention_days=180 where id=$1',[b]);
 const expired=await chat(a,'Old','31 days'),fresh=await chat(a,'Fresh','10 days'),other=await chat(b,'Older but within tenant retention','31 days');
 const expiredTicket=await ticket(a,'a@example.com',[],[],'91 days');const freshTicket=await ticket(a,'a@example.com',[{role:'user',content:'old copy'}],[expired],'10 days');
 await db.pg.query("insert into commerce_connection_attempts(token_hash,business_id,origin,currency,revision,expires_at) values('expired',$1,'https://shop.example','DKK',$2,now()-interval '1 minute'),('fresh',$1,'https://shop.example','DKK',$2,now()+interval '1 minute')",[a,randomUUID()]);
 const challengeFresh=randomUUID();
 await db.pg.query("insert into commerce_order_challenges(id,business_id,session_hash,code_hash,order_input,integration_revision,expires_at) values(gen_random_uuid(),$1,'session','code','encrypted',$2,now()-interval '1 minute'),($3,$1,'session','code','encrypted',$2,now()+interval '1 minute')",[a,randomUUID(),challengeFresh]);
 await db.pg.query("insert into chat_rate_limits(ip_hash,updated_at) values('expired-test',now()-interval '49 hours'),('fresh-test',now())");
 await db.pg.query("insert into support_messages(email,message,created_at) values('old@example.com','old',now()-interval '11 days'),('fresh@example.com','fresh',now())");
 await db.pg.exec('update compliance_retention_config set support_message_days=10');
 const cronReq=()=>new NextRequest(`${origin}/api/cron/cleanup`,{headers:{authorization:'Bearer test-cron'}});
 assert.equal((await cleanup.GET(new NextRequest(`${origin}/api/cron/cleanup`))).status,401);
 const result=await cleanup.GET(cronReq());assert.equal(result.status,200);const counts=(await result.json()).counts;assert.ok(counts.conversations_deleted>=1);assert.ok(counts.tickets_deleted>=1);assert.equal(counts.connection_attempts_deleted,1);assert.equal(counts.challenges_deleted,1);assert.equal(counts.rate_limits_deleted,1);assert.equal(counts.ticket_contexts_cleared,1);
 assert.equal((await db.pg.query("select id from commerce_order_challenges where id=$1",[challengeFresh])).rows.length,1);
 for(const id of [fresh,other])assert.equal((await db.pg.query('select id from conversations where id=$1',[id])).rows.length,1);
 assert.equal((await db.pg.query('select id from conversations where id=$1',[expired])).rows.length,0);assert.equal((await db.pg.query('select id from commerce_tickets where id=$1',[expiredTicket])).rows.length,0);assert.deepEqual((await db.pg.query('select context from commerce_tickets where id=$1',[freshTicket])).rows[0].context,[]);
 const repeat=await cleanup.GET(cronReq());assert.equal(repeat.status,200);assert.ok(Object.values((await repeat.json()).counts).every(n=>n===0));
 const health=await (await privacy.GET(new NextRequest(`${origin}/api/dashboard/privacy?business_id=${a}`))).json();assert.ok(health.lastCleanup);
 const last=(await db.pg.query("select * from maintenance_runs where job='cleanup' order by started_at desc limit 1")).rows[0];assert.equal(last.status,'completed');assert.ok(!JSON.stringify(last).includes('example.com'));
 const old=state.db;state.db={...old,rpc:async()=>({data:null,error:new Error('PRIVATE_PERSON_DATA')})};try{assert.equal((await cleanup.GET(cronReq())).status,503);}finally{state.db=old;}
 assert.equal((await db.pg.query("select status,failure_code from maintenance_runs order by started_at desc limit 1")).rows[0].status,'failed');
});
test('agreed default expires chat and copied context at 30 days but keeps support through 90 days; explicit customer periods win',async()=>{
 const business=await tenant();
 const settings=await (await privacy.GET(new NextRequest(`${origin}/api/dashboard/privacy?business_id=${business}`))).json();
 assert.equal(settings.chatRetentionDays,30);assert.equal(settings.ticketRetentionDays,90);
 const expired=await chat(business,'lead@example.com','31 days'),fresh=await chat(business,'fresh@example.com','29 days');
 const surviving=await ticket(business,'support@example.com',[{role:'user',content:'lead@example.com'}],[expired],'40 days');
 const expiredTicket=await ticket(business,'old@example.com',[],[],'91 days');
 const other=await tenant();await db.pg.query('update businesses set retention_days=90 where id=$1',[other]);
 const preserved=await chat(other,'custom period','31 days');
 await db.pg.query('select * from public.compliance_cleanup()');
 assert.equal((await db.pg.query('select id from conversations where id=$1',[expired])).rows.length,0);
 for(const id of [fresh,preserved])assert.equal((await db.pg.query('select id from conversations where id=$1',[id])).rows.length,1);
 assert.equal((await db.pg.query('select id from commerce_tickets where id=$1',[expiredTicket])).rows.length,0);
 assert.deepEqual((await db.pg.query('select context from commerce_tickets where id=$1',[surviving])).rows[0].context,[]);
});
test('admin headers cannot impersonate users, allowlist and MFA are enforced, and authenticated actions are audited',async()=>{
 await tenant();const user=state.user;process.env.ADMIN_EMAIL='admin@example.com';process.env.ADMIN_PASSWORD='obsolete';delete process.env.ADMIN_USER_IDS;
 const req=new Request(origin+'/api/admin/businesses',{headers:{'x-admin-email':'admin@example.com','x-admin-password':'obsolete'}});
 state.user=null;assert.equal((await verifyAdminSession(req)).status,401);
 state.user={...user,email:'admin@example.com',email_confirmed_at:undefined};assert.equal((await verifyAdminSession(req)).status,403);
 state.user={...user,email:'admin@example.com'};assert.ok((await verifyAdminSession(req)).user);
 process.env.ADMIN_USER_IDS=randomUUID();assert.equal((await verifyAdminSession(req)).status,403);
 process.env.ADMIN_USER_IDS=user.id;state.aal={currentLevel:'aal1',nextLevel:'aal2'};assert.equal((await verifyAdminSession(req)).status,403);
 state.aal={currentLevel:'aal2',nextLevel:'aal2'};assert.ok((await verifyAdminSession(req)).user);
 assert.equal((await verifyAdminSession(new Request(origin+'/api/admin/businesses',{method:'POST',headers:{Origin:'https://evil.example'}}))).status,403);
 state.aal=null;delete process.env.ADMIN_USER_IDS;delete process.env.ADMIN_EMAIL;delete process.env.ADMIN_PASSWORD;
});
test('new private tables and functions deny browser roles; chat references bind tenant, nonce and authentication; owner erasure clears context',async()=>{
 const tables=['business_privacy_settings','legal_document_versions','legal_acceptances','compliance_audit_events','maintenance_runs','compliance_retention_config'];
 for(const table of tables){const row=(await db.pg.query("select relrowsecurity,has_table_privilege('anon',oid,'SELECT') anon,has_table_privilege('authenticated',oid,'INSERT') writer from pg_class where oid=$1::regclass",['public.'+table])).rows[0];assert.equal(row.relrowsecurity,true);assert.equal(row.anon,false);assert.equal(row.writer,false);}
 for(const fn of ['compliance_cleanup()','delete_visitor_data(uuid,uuid,text,text)','accept_legal_document(uuid,uuid,text,text,text)','start_embedbot_trial(uuid,uuid,text)'])assert.equal((await db.pg.query("select has_function_privilege('authenticated',$1,'EXECUTE') allowed",['public.'+fn])).rows[0].allowed,false);
 const business=await tenant(),id=await chat(business,'Chat'),nonce=randomBytes(32).toString('hex');const token=chatReference(id,business,nonce);assert.equal(readChatReference(token,business,nonce),id);assert.equal(readChatReference(token,randomUUID(),nonce),null);assert.equal(readChatReference(token,business,randomBytes(32).toString('hex')),null);assert.equal(readChatReference(token.slice(0,-2)+'XX',business,nonce),null);
 const copy=await ticket(business,'contact@example.com',[{role:'user',content:'copy'}],[id]);const result=await deletion.DELETE(request('/api/conversations/delete',{business_id:business,conversation_id:id},origin,'DELETE'));assert.equal(result.status,200);assert.deepEqual((await db.pg.query('select context from commerce_tickets where id=$1',[copy])).rows[0].context,[]);
});

test('account erasure cascades private relations, preserves the other tenant and records minimal audit; integration audits contain no credentials',async()=>{
 const business=await tenant(),user=state.user;const other=await tenant();state.user=user;
 const keep=await chat(other,'Keep other tenant');await chat(business,'Erase account');await ticket(business,'erase@example.com');
 await db.pg.query("insert into commerce_integrations(business_id,platform,shop_url,status,credentials) values($1,'woocommerce','https://shop.example','connected','DO_NOT_LOG_SECRET')",[business]);
 await db.pg.query("insert into commerce_settings(business_id,notification_email) values($1,'erase@example.com')",[business]);
 await privacy.POST(request('/api/dashboard/privacy',{business_id:business,customerPrivacyUrl:'https://shop.example/privacy',chatRetentionDays:90,ticketRetentionDays:90}));
 await legal.POST(request('/api/dashboard/legal',{business_id:business,slug:'terms',version:TERMS.version,confirmed:true}));
 const audits=(await db.pg.query('select * from compliance_audit_events where business_id=$1',[business])).rows;
 assert.ok(audits.some(a=>a.action==='integration.create'));assert.ok(audits.some(a=>a.action==='integration.settings'));assert.ok(!JSON.stringify(audits).includes('DO_NOT_LOG_SECRET'));assert.ok(!JSON.stringify(audits).includes('erase@example.com'));
 const result=await db.client.rpc('delete_embedbot_account_data',{target_user_id:user.id,target_email:user.email});assert.equal(result.error,null);assert.equal(result.data[0].deleted_businesses,1);
 for(const table of ['conversations','commerce_tickets','commerce_integrations','commerce_settings','business_privacy_settings','legal_acceptances'])assert.equal((await db.pg.query(`select count(*)::int n from ${table} where business_id=$1`,[business])).rows[0].n,0,table);
 assert.equal((await db.pg.query('select id from conversations where id=$1',[keep])).rows.length,1);
 await db.pg.query('delete from auth.users where id=$1',[user.id]);
 assert.ok((await db.pg.query("select id from compliance_audit_events where action='account.delete' and actor_user_id is null")).rows.length>0);
});
test('account deletion HTTP route requires confirmation, origin and login; missing billing configuration preserves all data',async()=>{
 const route=await import('../app/api/auth/delete-account/route.ts');
 const business=await tenant(),user=state.user;
 const req=(confirmed=true,requestOrigin=origin)=>new NextRequest(origin+'/api/auth/delete-account',{method:'POST',headers:{Origin:requestOrigin,...(confirmed?{'x-confirm-deletion':'yes-delete-my-account'}:{})}});
 assert.equal((await route.POST(req(false))).status,400);
 assert.equal((await route.POST(req(true,'https://evil.example'))).status,403);
 state.user=null;assert.equal((await route.POST(req())).status,401);state.user=user;
 const previous=process.env.STRIPE_SECRET_KEY;delete process.env.STRIPE_SECRET_KEY;
 try{
  await db.pg.query("update businesses set stripe_subscription_id='sub_synthetic' where id=$1",[business]);
  assert.equal((await route.POST(req())).status,503);
  assert.equal((await db.pg.query('select id from businesses where id=$1',[business])).rows.length,1);
  assert.equal((await db.pg.query('select id from auth.users where id=$1',[user.id])).rows.length,1);
 }finally{if(previous!==undefined)process.env.STRIPE_SECRET_KEY=previous;}
});
test('account deletion HTTP route clears own data and synthetic Auth user while preserving another tenant',async()=>{
 const route=await import('../app/api/auth/delete-account/route.ts');
 const business=await tenant(),user=state.user;const other=await tenant();state.user=user;
 const keep=await chat(other,'Other tenant');await chat(business,'Own account');
 const originalAuth=db.client.auth;
 db.client.auth={admin:{async deleteUser(id){await db.pg.query('delete from auth.users where id=$1',[id]);return {error:null};}}};
 try{
  const result=await route.POST(new NextRequest(origin+'/api/auth/delete-account',{method:'POST',headers:{Origin:origin,'x-confirm-deletion':'yes-delete-my-account'}}));
  assert.equal(result.status,200);assert.equal((await result.json()).deleted.deleted_businesses,1);
  assert.equal((await db.pg.query('select id from businesses where id=$1',[business])).rows.length,0);
  assert.equal((await db.pg.query('select id from auth.users where id=$1',[user.id])).rows.length,0);
  assert.equal((await db.pg.query('select id from conversations where id=$1',[keep])).rows.length,1);
 }finally{db.client.auth=originalAuth;}
});
test('generic business endpoint rejects cross-origin/cross-tenant changes and cannot forge id, user, billing, activation or retention',async()=>{
 const route=await import('../app/api/business-draft/route.ts');
 const business=await tenant(),user=state.user;const other=await tenant();state.user=user;
 const form={name:'Updated safe content',id:other,user_id:randomUUID(),activated:'true',subscription_status:'active',payment_status:'paid',plan:'scale',retention_days:'1'};
 assert.equal((await route.POST(request('/api/business-draft',{business_id:business,form},'https://evil.example'))).status,403);
 assert.equal((await route.POST(request('/api/business-draft',{business_id:other,form}))).status,403);
 const saved=await route.POST(request('/api/business-draft',{business_id:business,form}));assert.equal(saved.status,200,JSON.stringify(await saved.json()));
 const row=(await db.pg.query('select id,user_id,name,activated,subscription_status,payment_status,plan,retention_days from businesses where id=$1',[business])).rows[0];assert.equal(row.user_id,user.id);assert.equal(row.name,'Updated safe content');assert.equal(row.activated,false);assert.equal(row.subscription_status,null);assert.equal(row.payment_status,null);assert.equal(row.plan,null);assert.equal(row.retention_days,30);
});

test('support retry scheduler rejects missing auth and records query failures without marking a failed job successful',async()=>{
 const req=()=>new NextRequest(origin+'/api/cron/support',{headers:{authorization:'Bearer test-cron'}});
 assert.equal((await supportCron.GET(new NextRequest(origin+'/api/cron/support'))).status,401);
 assert.equal((await supportCron.GET(req())).status,200);
 const old=state.db;state.db={...old,from(table){const query=old.from(table);if(table==='commerce_tickets')query.run=async()=>({data:null,error:new Error('PRIVATE_SERVER_DETAILS')});return query;}};
 try{assert.equal((await supportCron.GET(req())).status,503);}finally{state.db=old;}
 const rows=(await db.pg.query("select status,failure_code from maintenance_runs where job='support' order by started_at desc")).rows;assert.equal(rows.length,2);assert.ok(rows.some(row=>row.status==='completed'));assert.equal(rows.find(row=>row.status==='failed')?.failure_code,'job_failed');
});
