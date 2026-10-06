import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedWorkspace, activeCampaigns, startersForPath, insights, weeklySummary, sourceExcerpts } from "../lib/workspace/model.ts";
import { applyAction } from "../lib/workspace/actions.ts";
import { workspaceStore, localRequestAllowed } from "../lib/workspace/local-store.ts";
import { generateDigest, lastDigestOccurrence, nextDigestOccurrence } from "../lib/workspace/digest.ts";
import { workspaceWidgetConfig } from "../lib/workspace/widget-config.ts";
const now=new Date("2026-10-05T12:00:00Z");
test("temporary notices have inclusive start, exclusive end, and reject reversed intervals",()=>{
 const state=seedWorkspace(now);
 applyAction(state,{action:"campaign_save",title:"Ferie",text:"Levering tager 5-7 hverdage",startsAt:"2026-10-05T12:00:00Z",endsAt:"2026-10-06T12:00:00Z",enabled:true},now);
 assert.equal(activeCampaigns(state,now).length,1);
 assert.equal(activeCampaigns(state,new Date("2026-10-06T12:00:00Z")).length,0);
 assert.throws(()=>applyAction(state,{action:"campaign_save",title:"X",text:"X",startsAt:"2026-10-06",endsAt:"2026-10-05",enabled:true},now));
});
test("start buttons match exact pages and explicit prefixes without treating the homepage as global",()=>{
 const state=seedWorkspace(now);state.starters.push({id:"home",label:"Forside",message:"Hej",path:"/",clicks:0});
 assert.equal(startersForPath(state.starters,"/").length,3);
 assert.equal(startersForPath(state.starters,"/produkter/lampe").length,3);
 assert.equal(startersForPath(state.starters,"/kontakt").length,2);
 assert.throws(()=>applyAction(state,{action:"starter_save",label:"X",message:"X",path:"/a*b*"},now));
});
test("feedback and missing answers group into evidence-backed suggestions limited to the selected period",()=>{
 const state=seedWorkspace(now);
 const groups=insights(state.conversations,now);
 const product=groups.find(g=>g.id==="product");assert.equal(product?.count,4);assert.equal(product?.missing,true);
 const unrelated={id:"old",question:"Retur?",answer:"Det ved jeg ikke",date:"2026-09-01T12:00:00Z",page:"/"};
 assert.equal(insights([unrelated],now).length,0);
 const summary=weeklySummary(state,now);assert.equal(summary.count,10);assert.equal(summary.feedbackCount,3);assert.equal(summary.helpful,2);
});
test("new source versions do not enter widget knowledge until the owner accepts them",()=>{
 const state=seedWorkspace(now);const source=state.sources[0];source.pendingText="Ny levering: 7-9 hverdage";
 assert.ok(sourceExcerpts(state.sources,"levering").some(e=>e.text.includes("2-4")));
 applyAction(state,{action:"source_accept",id:source.id},now);
 assert.equal(source.text,"Ny levering: 7-9 hverdage");assert.equal(source.pendingText,undefined);
});
test("customer quote capture creates a lead and ticket only after explicit submit",()=>{
 const state=seedWorkspace(now);const initialTickets=state.tickets.length,initialLeads=state.leads.length;
 assert.throws(()=>applyAction(state,{action:"lead_create",email:"invalid",need:"Et tilbud",budget:"",timing:"",page:"/kontakt"},now));
 assert.equal(state.leads.length,initialLeads);assert.equal(state.tickets.length,initialTickets);
 applyAction(state,{action:"lead_create",email:"kunde@example.org",need:"Et tilbud",budget:"10000",timing:"November",page:"/kontakt"},now);
 assert.equal(state.leads.length,initialLeads+1);assert.equal(state.tickets.length,initialTickets+1);assert.equal(state.tickets.at(-1)?.number,1044);
});
test("private notes and local replies preserve separate history and set appropriate ticket status",()=>{
 const state=seedWorkspace(now);
 applyAction(state,{action:"ticket_note",id:"ticket-1",text:"Kontrollér pæren"},now);
 applyAction(state,{action:"ticket_reply",id:"ticket-1",text:"Vi undersøger det"},now);
 assert.deepEqual(state.tickets[0].entries.map(e=>e.kind),["note","reply"]);assert.equal(state.tickets[0].status,"in_progress");
 assert.throws(()=>applyAction(state,{action:"ticket_status",id:"ticket-1",status:"invalid"},now));
});
test("local APIs reject remote hosts, cross-origin mutations, and every production request",()=>{
 const req=(url:string,headers:Record<string,string>)=>new Request(url,{headers});
 assert.equal(localRequestAllowed(req("http://localhost:3000/api/local-workspace",{host:"localhost:3000",origin:"http://localhost:3000"}),true,"development"),true);
 assert.equal(localRequestAllowed(req("http://localhost:3000/api/local-workspace",{host:"localhost:3000",origin:"https://attacker.example"}),true,"development"),false);
 assert.equal(localRequestAllowed(req("https://embedbot.dk/api/local-workspace",{host:"embedbot.dk"}),false,"development"),false);
 assert.equal(localRequestAllowed(req("http://localhost:3000/api/local-workspace",{host:"localhost:3000"}),false,"production"),false);
 assert.equal(localRequestAllowed(req("http://localhost:3000/api/local-workspace",{host:"localhost:3000","sec-fetch-site":"cross-site"}),false,"development"),false);
});
test("atomic local storage retains concurrent changes and failed mutations never corrupt persisted state",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"embedbot-workspace-test-"));const store=workspaceStore(dir);
 try{
  await Promise.all(Array.from({length:20},()=>store.mutateWorkspace(state=>{state.starters[0].clicks++;})));
  let saved=await store.readWorkspace();assert.equal(saved.starters[0].clicks,20);assert.equal(saved.revision,20);
  await assert.rejects(store.mutateWorkspace(state=>{state.welcome="Should not be saved";throw new Error("Abort");}));
  saved=await store.readWorkspace();assert.notEqual(saved.welcome,"Should not be saved");
  await store.mutateWorkspace(state=>{state.name="Saved after failed write";});assert.equal((await store.readWorkspace()).name,"Saved after failed write");
 }finally{await rm(dir,{recursive:true,force:true});}
});
test("weekly generation is idempotent and keeps Copenhagen 09:00 across daylight-saving changes",()=>{
 const state=seedWorkspace(now);state.digest.enabled=true;state.digest.weekday=1;
 assert.equal(lastDigestOccurrence(1,now).toISOString(),"2026-10-05T07:00:00.000Z");
 assert.equal(nextDigestOccurrence(1,new Date("2026-10-20T12:00:00Z")).toISOString(),"2026-10-26T08:00:00.000Z");
 assert.equal(generateDigest(state,now,true),true);assert.equal(generateDigest(state,now,true),false);
 assert.equal(state.digest.report?.count,10);assert.equal(generateDigest(state,new Date("2026-10-12T09:00:00Z"),true),true);
});
test("public local widget config contains only owner-selected starters and active announcements",()=>{
 const state=seedWorkspace(now);const config=workspaceWidgetConfig(state,"/kontakt");
 assert.equal(config.start_buttons.length,2);assert.equal(config.local_workspace,true);assert.ok(!("leads" in config));assert.ok(!("sources" in config));assert.equal(config.welcome_message,state.welcome);
});
test("the owner can hide the optional quote button and use start buttons without a welcome message",()=>{
 const state=seedWorkspace(now);
 applyAction(state,{action:"welcome",name:"Min virksomhed",welcome:""},now);
 applyAction(state,{action:"quote_settings",enabled:false,label:"Kontakt os"},now);
 const config=workspaceWidgetConfig(state,"/");assert.equal(config.welcome_message,"");assert.equal(config.quote_enabled,false);assert.equal(config.quote_label,"Kontakt os");assert.equal(config.start_buttons.length,2);
});
test("a corrected knowledge gap retains its source and date so newer misses can be reviewed separately",()=>{
 const state=seedWorkspace(now);
 applyAction(state,{action:"source_save",insightId:"product",name:"Produkt-FAQ",text:"Lampen kan dæmpes med en egnet dæmper."},now);
 assert.equal(state.addressed?.product.date,now.toISOString());assert.ok(state.sources.some(s=>s.id===state.addressed?.product.sourceId));
});
