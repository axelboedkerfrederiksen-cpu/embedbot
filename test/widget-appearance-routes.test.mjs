import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {state} from './helpers/runtime.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
registerHooks({resolve(specifier,context,nextResolve){
 const mocks={'@supabase/supabase-js':'supabase-js','@supabase/ssr':'supabase-ssr','next/server':'next-server','next/headers':'next-headers'};
 if(mocks[specifier])return {url:new URL(`./helpers/${mocks[specifier]}.mjs`,import.meta.url).href,shortCircuit:true};
 if(specifier.startsWith('@/')){const path=resolve(root,specifier.slice(2));return {url:pathToFileURL(existsSync(`${path}.ts`)?`${path}.ts`:`${path}/index.ts`).href,shortCircuit:true};}
 return nextResolve(specifier,context);
}});
Object.assign(process.env,{SUPABASE_URL:'https://mock.invalid',SUPABASE_SERVICE_KEY:'test-secret',NEXT_PUBLIC_SUPABASE_URL:'https://mock.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'test-key'});
const {testDatabase}=await import('./helpers/commerce-db.ts');
const {NextRequest}=await import('next/server');
let draft,config;
let db,id,user;
const origin='https://embedbot.example';
const save=form=>draft.POST(new NextRequest(origin+'/api/business-draft',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({business_id:id,form})}));
const read=()=>config.GET(new NextRequest(origin+'/api/widget-config?id='+id));
before(async()=>{
 db=await testDatabase();state.db=db.client;draft=await import('../app/api/business-draft/route.ts');config=await import('../app/api/widget-config/route.ts');id=randomUUID();user=randomUUID();state.user={id:user,email:'owner@example.com'};
 for(const field of ['primary_color','secondary_color','fab_color','chat_icon_color','logo_url','logo_data_url','logo_file_name','font_choice','welcome_message'])await db.pg.exec(`alter table businesses add column if not exists ${field} text`);
 await db.pg.exec(await readFile(new URL('../sql/add_widget_style_controls.sql',import.meta.url),'utf8'));
 await db.pg.query('insert into businesses(id,user_id,name,fab_color) values($1,$2,$3,$4)',[id,user,'Brand','#ff0000']);
});
after(async()=>db?.pg.close());
test('saving branding round-trips logo, font, colors and zero-value outlines through the public API',async()=>{
 const logo='data:image/png;base64,iVBORw0KGgo=';
 const response=await save({primary_color:'#245c45',secondary_color:'#eee',chat_icon_color:'#123456',logo_data_url:logo,logo_url:'',logo_file_name:'brand.png',font_choice:'Lora',chat_outline_enabled:'true',chat_outline_width:'2.5',chat_outline_opacity:'0',widget_opacity:'85'});
 assert.equal(response.status,200,JSON.stringify(await response.json()));
 const result=await read();assert.equal(result.status,200);const value=await result.json();
 assert.equal(value.fab_color,'#123456');assert.equal(value.logo_url,logo);assert.equal(value.font_choice,'Lora');assert.equal(value.chat_outline_width,'2.5');assert.equal(value.chat_outline_opacity,'0');assert.equal(value.widget_opacity,'85');
 // A save of another section must not erase an uploaded logo.
 assert.equal((await save({name:'Updated brand'})).status,200);assert.equal((await (await read()).json()).logo_url,logo);
 assert.equal((await save({logo_data_url:'',logo_url:'',logo_file_name:''})).status,200);assert.equal((await (await read()).json()).logo_url,'');
});
test('invalid branding and another tenant cannot overwrite saved design',async()=>{
 assert.equal((await save({logo_url:'javascript:alert(1)'})).status,400);
 assert.equal((await save({chat_outline_width:'12'})).status,400);
 state.user={id:randomUUID(),email:'other@example.com'};assert.equal((await save({primary_color:'#000000'})).status,403);state.user={id:user,email:'owner@example.com'};
 assert.equal((await (await read()).json()).primary_color,'#245c45');
});
test('public config handles native boolean/numeric columns without losing false or zero',async()=>{
 await db.pg.exec("alter table businesses alter column chat_outline_enabled drop default, alter column chat_outline_enabled type boolean using chat_outline_enabled::boolean, alter column chat_outline_width drop default, alter column chat_outline_width type numeric using chat_outline_width::numeric, alter column chat_outline_opacity drop default, alter column chat_outline_opacity type numeric using chat_outline_opacity::numeric");
 await db.pg.query('update businesses set chat_outline_enabled=true,chat_outline_width=0,chat_outline_opacity=0 where id=$1',[id]);
 const data=await (await read()).json();assert.equal(data.chat_outline_enabled,'true');assert.equal(data.chat_outline_width,'0');assert.equal(data.chat_outline_opacity,'0');
});
test('older schemas retain supported styles and cannot falsely report a missing setting as saved',async()=>{
 await db.pg.exec('alter table businesses drop column logo_data_url');
 const response=await read();assert.equal(response.status,200);assert.equal((await response.json()).chat_outline_enabled,'true');
 assert.equal((await save({logo_data_url:'data:image/png;base64,aGVsbG8='})).status,200);
 assert.equal((await (await read()).json()).logo_url,'data:image/png;base64,aGVsbG8=');
 await db.pg.exec('alter table businesses drop column logo_url');
 assert.equal((await save({logo_data_url:'data:image/png;base64,aGVsbG8='})).status,500);
});
