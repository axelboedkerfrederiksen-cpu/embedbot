// Local-only fixture: real dashboard component, API handlers and SQL; synthetic
// authentication and an in-memory database. Never load .env or contact vendors.
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';
import { state } from './runtime.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const buildTool=process.argv[2];
if (!buildTool) throw new Error('Pass the absolute path to an installed esbuild module.');
registerHooks({resolve(specifier,context,nextResolve){
 const mocks={'@supabase/supabase-js':'supabase-js','@supabase/ssr':'supabase-ssr','next/server':'next-server','next/headers':'next-headers','resend':'resend'};
 if(mocks[specifier])return {url:new URL(`./${mocks[specifier]}.mjs`,import.meta.url).href,shortCircuit:true};
 if(specifier.startsWith('@/')){const path=resolve(root,specifier.slice(2));return {url:pathToFileURL(existsSync(`${path}.ts`)?`${path}.ts`:`${path}/index.ts`).href,shortCircuit:true};}
 return nextResolve(specifier,context);
}});
Object.assign(process.env,{
 SUPABASE_URL:'https://mock.invalid',NEXT_PUBLIC_SUPABASE_URL:'https://mock.invalid',
 SUPABASE_SERVICE_KEY:'synthetic-test-service-key-more-than-32-characters',NEXT_PUBLIC_SUPABASE_ANON_KEY:'mock',
 COMMERCE_ENCRYPTION_KEY:randomBytes(32).toString('base64'),CRON_SECRET:'synthetic-test-cron',
 NEXT_PUBLIC_APP_URL:'http://localhost:4317',RESEND_API_KEY:'synthetic-test-mail',
 STRIPE_SECRET_KEY:'',OPENAI_API_KEY:'',
});
// App fetch fails closed. Supabase/Auth/mail use mocks; Stripe is unconfigured.
globalThis.fetch=async()=>{throw new Error('Network disabled in privacy fixture');};
const {testDatabase}=await import('./commerce-db.ts');
const db=await testDatabase();state.db=db.client;
const userId=randomUUID(),businessId=randomUUID(),otherId=randomUUID(),otherUserId=randomUUID();
state.user={id:userId,email:'fixture-owner@example.com',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString()};
db.client.auth={admin:{async deleteUser(id){await db.pg.query('delete from auth.users where id=$1',[id]);state.user=null;return {error:null};}}};
await db.pg.query('insert into businesses(id,user_id,name) values($1,$2,$3),($4,$5,$6)',[businessId,userId,'Synthetic webshop A',otherId,otherUserId,'Synthetic webshop B']);
const ids={fresh:randomUUID(),expired:randomUUID(),other:randomUUID(),ticket:randomUUID(),expiredTicket:randomUUID(),otherTicket:randomUUID()};
for(const [id,business,content,age] of [[ids.fresh,businessId,'visitor@example.com synthetic current chat','1 day'],[ids.expired,businessId,'synthetic expired chat','31 days'],[ids.other,otherId,'OTHER_TENANT_MUST_SURVIVE','1 day']]){
 await db.pg.query('insert into conversations(id,business_id,messages,created_at) values($1,$2,$3,now()-$4::interval)',[id,business,JSON.stringify([{role:'user',content}]),age]);
}
for(const [id,business,refs,age] of [[ids.ticket,businessId,[ids.fresh,ids.expired],'89 days'],[ids.expiredTicket,businessId,[],'91 days'],[ids.otherTicket,otherId,[ids.other],'1 day']]){
 await db.pg.query('insert into commerce_tickets(id,business_id,submission_key,contact_email,description,context,conversation_ids,created_at) values($1,$2,$3,$4,$5,$6,$7,now()-$8::interval)',[id,business,randomUUID(),'visitor@example.com','Synthetic ticket',JSON.stringify([{role:'user',content:'Synthetic copied chat'}]),refs,age]);
}
await db.pg.query("insert into commerce_integrations(business_id,platform,shop_url,status,credentials) values($1,'woocommerce','https://shop.example','connected','SYNTHETIC_SECRET_MUST_NOT_EXPORT')",[businessId]);
const privacy=await import('../../app/api/dashboard/privacy/route.ts');
const legal=await import('../../app/api/dashboard/legal/route.ts');
const visitor=await import('../../app/api/dashboard/visitor-data/route.ts');
const accountExport=await import('../../app/api/auth/export-data/route.ts');
const accountDelete=await import('../../app/api/auth/delete-account/route.ts');
const cleanup=await import('../../app/api/cron/cleanup/route.ts');
const {NextRequest}=await import('next/server.js');
const {build}=await import(pathToFileURL(buildTool).href);
const directory=await mkdtemp(join(tmpdir(),'embedbot-privacy-browser-'));
await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import PrivacyPanel from './app/dashboard/privacy-panel.tsx';createRoot(document.getElementById('root')).render(<PrivacyPanel businessId="${businessId}" businessName="Synthetic webshop A" demo={false}/>);`,resolveDir:root,loader:'jsx'},bundle:true,outfile:join(directory,'bundle.js'),alias:{'@':root},jsx:'automatic',loader:{'.module.css':'local-css'},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'fixture-link',setup(builder){builder.onResolve({filter:/^next\/link$/},()=>({path:'next-link',namespace:'fixture'}));builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`import React from 'react';export default function Link(props){return React.createElement('a',props);}`,resolveDir:root,loader:'js'}));}}]});
const routes={'/api/dashboard/privacy':privacy,'/api/dashboard/legal':legal,'/api/dashboard/visitor-data':visitor,'/api/auth/export-data':accountExport,'/api/auth/delete-account':accountDelete};
const trace=[];
async function status(){
 const count=async(table,id)=>Number((await db.pg.query(`select count(*)::int n from ${table} where id=$1`,[id])).rows[0].n);
 const ticket=(await db.pg.query('select context,conversation_ids from commerce_tickets where id=$1',[ids.ticket])).rows[0];
 return {businessId,otherId,expiredChat:await count('conversations',ids.expired),freshChat:await count('conversations',ids.fresh),expiredTicket:await count('commerce_tickets',ids.expiredTicket),retainedTicket:await count('commerce_tickets',ids.ticket),ticketContext:ticket?.context??null,ticketReferences:ticket?.conversation_ids??null,otherChat:await count('conversations',ids.other),otherTicket:await count('commerce_tickets',ids.otherTicket),ownerBusiness:await count('businesses',businessId),otherBusiness:await count('businesses',otherId),authUser:await count('auth.users',userId),trace};
}
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost:4317');
  if(req.headers.host!=='localhost:4317'){res.writeHead(403);res.end();return;}
  if(url.pathname==='/bundle.js'||url.pathname==='/bundle.css'){res.setHeader('Content-Type',url.pathname.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(join(directory,url.pathname.slice(1))));return;}
  if(url.pathname==='/__test/status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(await status()));return;}
  if(url.pathname==='/__test/cleanup'&&req.method==='POST'){
   if(req.headers.origin!==url.origin){res.writeHead(403);res.end();return;}
   const result=await cleanup.POST(new NextRequest(url.origin+'/api/cron/cleanup',{method:'POST',headers:{authorization:'Bearer synthetic-test-cron'}}));
   trace.push({path:'/api/cron/cleanup',status:result.status});res.writeHead(result.status,{'Content-Type':'application/json'});res.end(await result.text());return;
  }
  const route=routes[url.pathname];
  if(route?.[req.method]){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const result=await route[req.method](new NextRequest(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}));
   trace.push({path:url.pathname,method:req.method,status:result.status});res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());return;
  }
  if(url.pathname==='/'){
   res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html lang="da"><head><meta charset="utf-8"><title>EmbedBot — isoleret privatlivstest</title><link rel="stylesheet" href="/bundle.css"><style>body{margin:0;background:#f5f6fa;color:#172033;font-family:Arial,sans-serif}main{max-width:1100px;margin:30px auto;padding:24px}#fixture{border:2px solid #5268df;background:white;padding:20px;margin-bottom:24px}button,input,select{font:inherit}</style></head><body><main><section id="fixture"><h1>Isoleret test · kun kunstige data</h1><p>Produktets privatlivspanel og API'er bruger en midlertidig database. Ingen kundedata eller leverandørforbindelser.</p><button onclick="fetch('/__test/cleanup',{method:'POST'}).then(r=>r.json()).then(r=>document.getElementById('test-result').textContent=JSON.stringify(r))">Test oprydning</button><button onclick="fetch('/api/auth/delete-account',{method:'POST',headers:{'x-confirm-deletion':'yes-delete-my-account'}}).then(r=>r.json()).then(r=>document.getElementById('test-result').textContent=JSON.stringify(r))">Test kontosletning</button><output id="test-result"></output></section><div id="root"></div></main><script defer src="/bundle.js"></script></body></html>`);return;
  }
  res.writeHead(404);res.end('Not part of this isolated fixture');
 }catch(error){console.error(error);res.writeHead(500);res.end('Fixture failed');}
});
server.listen(4317,'127.0.0.1',()=>console.log('Isolated privacy fixture: http://localhost:4317'));
async function stop(){server.close();await db.pg.close();await rm(directory,{recursive:true,force:true});process.exit(0);}
process.once('SIGINT',stop);process.once('SIGTERM',stop);
