import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const origin=process.argv[2]||"http://127.0.0.1:3001";
async function action(body){const response=await fetch(`${origin}/api/local-workspace`,{method:"POST",headers:{"Content-Type":"application/json",origin},body:JSON.stringify(body)});const data=await response.json();assert.equal(response.status,200,data.error);return data;}
const initial=await (await fetch(`${origin}/api/local-workspace`)).json();assert.ok(initial.state.sources.length);
const rejected=await fetch(`${origin}/api/local-workspace`,{method:"POST",headers:{"Content-Type":"application/json",origin:"https://external.example"},body:JSON.stringify({action:"welcome",name:"External",welcome:"Unsafe"})});assert.equal(rejected.status,404);
const missingOrigin=await fetch(`${origin}/api/local-workspace`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"digest_generate"})});assert.equal(missingOrigin.status,404);
const response=await action({action:"test",question:"Hvor hurtigt leverer I?"});assert.match(response.result.answer,/2-4 hverdage/);assert.equal(response.state.conversations.length,initial.state.conversations.length);
const run=await action({action:"test_run",id:"test-return"});assert.ok(run.state.tests.find(t=>t.id==="test-return").checkedAt);
const pdf=await readFile("public/EmbedBot_Installationsguide.pdf");const imported=await action({action:"source_import",kind:"pdf",name:"Verifikation.pdf",data:pdf.toString("base64")});const source=imported.state.sources.find(s=>s.name==="Verifikation.pdf");assert.ok(source.text.length>100);await action({action:"source_remove",id:source.id});
const chat=await action({action:"chat",question:"Hvordan returnerer jeg en vare?",page:"/retur"});assert.match(chat.result.answer,/30 dage/);assert.ok(chat.result.id);
const feedback=await action({action:"feedback",id:chat.result.id,value:"no",note:"Test af feedbackflow"});assert.equal(feedback.state.conversations.find(c=>c.id===chat.result.id).feedbackNote,"Test af feedbackflow");
const quote=await action({action:"lead_create",email:"local-test@example.org",need:"Et tilbud på kontorindretning",budget:"20.000 kr.",timing:"November",page:"/kontakt"});const lead=quote.state.leads.at(-1);assert.equal(lead.need,"Et tilbud på kontorindretning");const ticket=quote.state.tickets.at(-1);assert.equal(ticket.description,lead.need);
const note=await action({action:"ticket_note",id:ticket.id,text:"Intern note fra lokal verifikation"});assert.equal(note.state.tickets.at(-1).entries.at(-1).kind,"note");
const reply=await action({action:"ticket_reply",id:ticket.id,text:"Et lokalt svar, som ikke bliver sendt"});assert.equal(reply.state.tickets.at(-1).entries.at(-1).kind,"reply");
const digest=await action({action:"digest_generate"});assert.ok(digest.state.digest.report.count>=10);
const widget=await (await fetch(`${origin}/api/local-workspace?widget=1&path=/kontakt`)).json();assert.ok(widget.start_buttons.every(s=>!s.path||s.path==="/kontakt"));assert.ok(!widget.leads);
console.log("Local integration checks passed: origin protection, real PDF import, saved tests, isolated chat, feedback, quote, ticket history, digest, widget configuration. No customer database or mail provider was used.");
