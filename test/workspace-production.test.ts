import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testDatabase } from './helpers/commerce-db.ts';
import { emptyWorkspace,settingsOnly,conversationFromRow } from '../lib/workspace/production-model.ts';
import { productionStore } from '../lib/workspace/production-store.ts';
import { publicWorkspaceConfig } from '../lib/workspace/public-config.ts';
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',U='00000000-0000-4000-8000-000000000003';
test('production starts empty and public config never includes private sources, tickets or leads',()=>{
 const state=emptyWorkspace('Shop','');assert.equal(state.conversations.length,0);assert.equal(state.sources.length,0);assert.equal(state.quoteEnabled,false);
 state.sources.push({id:'secret',name:'Private source',kind:'text',text:'private!',updatedAt:new Date().toISOString()});
 state.starters=[{id:'one',label:'Question',message:'Test',path:'/products/*',clicks:100}];
 const config=publicWorkspaceConfig(state,'/products/lamp');assert.equal(config.start_buttons.length,1);assert.equal(JSON.stringify(config).includes('private!'),false);assert.equal('clicks' in config.start_buttons[0],false);assert.equal(publicWorkspaceConfig(state,'/').start_buttons.length,0);
 state.conversations=[{id:'c',question:'q',answer:'a',date:'d',page:'/'}];assert.equal(settingsOnly(state).conversations.length,0);
 assert.equal(conversationFromRow({id:'x',created_at:'today',messages:[{role:'user',content:'Question'},{role:'assistant',content:'Answer'},{role:'meta',page_url:'https://shop.test/products/lamp?private=1'}]})?.page,'/products/lamp');
});
test('production database prevents client API access, protects concurrent saves, creates one lead/ticket and cascades privacy deletion',async()=>{
 const {pg}=await testDatabase();try{
 await pg.query('insert into businesses(id,user_id,name,welcome_message) values($1,$3,$4,$5),($2,$3,$6,$5)',[A,B,U,'Shop A','Welcome','Shop B']);
 const state=emptyWorkspace('Shop A','Welcome');state.starters=[{id:'one',label:'Help',message:'Help please',path:'',clicks:0}];
 let r=await pg.query<{saved:boolean}>('select save_workspace_settings($1,-1,$2,false) saved',[A,JSON.stringify(state)]);assert.equal(r.rows[0].saved,true);
 r=await pg.query('select save_workspace_settings($1,-1,$2,false) saved',[A,JSON.stringify(state)]);assert.equal(r.rows[0].saved,false);
 r=await pg.query('select save_workspace_settings($1,1,$2,false) saved',[A,JSON.stringify(state)]);assert.equal(r.rows[0].saved,true);
 r=await pg.query('select save_workspace_settings($1,1,$2,false) saved',[A,JSON.stringify(state)]);assert.equal(r.rows[0].saved,false);
 for(const role of ['anon','authenticated']){
  await pg.exec(`set role ${role}`);
  for(const table of ['workspace_settings','workspace_feedback','workspace_leads','workspace_ticket_entries','workspace_activity']){
   await assert.rejects(()=>pg.query(`select * from ${table}`));
   await assert.rejects(()=>pg.query(`delete from ${table}`));
   await assert.rejects(()=>pg.query(`update ${table} set business_id=business_id`));
   await assert.rejects(()=>pg.query(`insert into ${table}(business_id) values($1)`,[A]));
  }
  await assert.rejects(()=>pg.query('select * from workspace_settings'));await assert.rejects(()=>pg.query('select save_workspace_settings($1,2,$2,true)',[A,JSON.stringify(state)]));await pg.exec('reset role');
 }
 await pg.query('select workspace_activity_event($1,$2,$3)',[A,'/products/lamp','one']);await pg.query('select workspace_activity_event($1,$2,$3)',[B,'/','one']);
 const clicks=await pg.query<{clicks:Record<string,number>}>('select clicks from workspace_activity where business_id=$1',[A]);assert.equal(clicks.rows[0].clicks.one,1);
 const b=await pg.query<{clicks:Record<string,number>}>('select clicks from workspace_activity where business_id=$1',[B]);assert.deepEqual(b.rows[0].clicks,{});
 const lead={email:'visitor@example.org',need:'I need a quote for my office',budget:'100',timing:'Next week',page:'/contact',status:'new',note:''};
 const first=await pg.query<{id:string}>('select create_workspace_lead($1,$2,$3,null) id',[A,'submission-one',JSON.stringify(lead)]);
 const second=await pg.query<{id:string}>('select create_workspace_lead($1,$2,$3,null) id',[A,'submission-one',JSON.stringify(lead)]);assert.equal(first.rows[0].id,second.rows[0].id);
 assert.equal((await pg.query<{n:number}>('select count(*)::integer n from commerce_tickets where business_id=$1',[A])).rows[0].n,1);
 const ticket=(await pg.query<{ticket_id:string}>('select ticket_id from workspace_leads where id=$1',[first.rows[0].id])).rows[0].ticket_id;
 await pg.query("insert into workspace_ticket_entries(business_id,ticket_id,kind,text,delivery_status) values($1,$2,'note','Internal note','note')",[A,ticket]);
 const records=await pg.query<{record:{leads:unknown[];entries:unknown[]}}>('select * from visitor_records($1,$2,$3,$4)',[A,U,'email',lead.email]);assert.equal(records.rows[0].record.leads.length,1);assert.equal(records.rows[0].record.entries.length,1);
 await pg.query('select delete_visitor_data($1,$2,$3,$4)',[A,U,'email',lead.email]);assert.equal((await pg.query<{n:number}>('select count(*)::integer n from workspace_leads')).rows[0].n,0);assert.equal((await pg.query<{n:number}>('select count(*)::integer n from workspace_ticket_entries')).rows[0].n,0);
 const chat=(await pg.query<{id:string}>('insert into conversations(business_id,messages) values($1,$2) returning id',[A,'[]'])).rows[0].id;
 await pg.query("insert into workspace_feedback(business_id,conversation_id,value,note) values($1,$2,'no','Need more detail')",[A,chat]);await pg.query('delete from conversations where id=$1',[chat]);assert.equal((await pg.query<{n:number}>('select count(*)::integer n from workspace_feedback')).rows[0].n,0);
 await pg.query('delete from businesses where id=$1',[A]);assert.equal((await pg.query<{n:number}>('select count(*)::integer n from workspace_settings')).rows[0].n,0);
 }finally{await pg.close();}
});

test('production workspace reads each tenant separately and overlays live sources without persisting copies of customer conversations',async()=>{
 const {pg,client}=await testDatabase();try{
 await pg.query('insert into businesses(id,user_id,name,welcome_message) values($1,$3,$4,$5),($2,$3,$6,$5)',[A,B,U,'Shop A','Welcome','Shop B']);
 await pg.query("insert into website_sources(business_id,source_kind,source_name,content_text,character_count,truncated) values($1,'html','Original site','Original website knowledge',26,false)",[A]);
 await pg.query('insert into conversations(business_id,messages) values($1,$3),($2,$4)',[A, B,JSON.stringify([{role:'user',content:'A question'},{role:'assistant',content:'A answer'}]),JSON.stringify([{role:'user',content:'B question'},{role:'assistant',content:'B answer'}])]);
 const a=await productionStore(client,{id:A,name:'Shop A'}),b=await productionStore(client,{id:B,name:'Shop B'});
 assert.equal((await a.readWorkspace()).conversations[0].question,'A question');assert.equal((await b.readWorkspace()).conversations[0].question,'B question');
 await a.mutateWorkspace(state=>{state.tests.push({id:'test',question:'Question',expected:''});});
 const saved=(await pg.query<{state:{conversations:unknown[];sources:unknown[]}}>('select state from workspace_settings where business_id=$1',[A])).rows[0].state;assert.equal(saved.conversations.length,0);assert.equal(saved.sources.length,0);
 await pg.query("update website_sources set content_text='Updated original knowledge' where business_id=$1",[A]);assert.equal((await a.readWorkspace()).sources[0].text,'Updated original knowledge');
 await a.mutateWorkspace(state=>{state.sources[0].text='Owner edited source';});assert.equal((await a.readWorkspace()).sources[0].text,'Owner edited source');assert.equal((await b.readWorkspace()).sources.length,0);
 }finally{await pg.close();}
});
