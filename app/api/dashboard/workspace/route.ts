import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { productionStore } from "@/lib/workspace/production-store";
import { owner,limit,CommerceError,failure } from "@/lib/commerce/server";
import { validId } from "@/lib/commerce/security";
import { mailConfigured } from "@/lib/commerce/mail";
import { deliverWorkspaceReply } from "@/lib/workspace/mail";
import { getAnswerLimit,getPlan } from "@/lib/plans";
import { applyAction, text } from "@/lib/workspace/actions";
import { answerWorkspace } from "@/lib/workspace/answer";
import { weeklySummary } from "@/lib/workspace/model";
import { extractWebsiteText, fetchWebsitePage } from "@/lib/website-source";
export const runtime="nodejs";
export const maxDuration=60;
const responses=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req:NextRequest){
 try{const {db,business}=await owner(req,req.nextUrl.searchParams.get("business_id"));const {readWorkspace}=await productionStore(db,business);const state=await readWorkspace();return responses({state,summary:weeklySummary(state),aiConfigured:Boolean(process.env.OPENAI_API_KEY),mailConfigured:mailConfigured()});}catch(error){return failure(error);}
}
export async function POST(req:NextRequest){

  try{
    const {db,business}=await owner(req,req.nextUrl.searchParams.get("business_id"),true);
    const {readWorkspace,mutateWorkspace:save}=await productionStore(db,business);
    const mutateWorkspace=(change:Parameters<typeof save>[0])=>save(change,input.action==="welcome");
    const raw=await req.text();if(Buffer.byteLength(raw)>4_000_000)return responses({error:"Filen er for stor. Maksimum er 2 MB for PDF og 30.000 tegn for tekst."},413);
    const input=JSON.parse(raw) as Record<string,unknown>;
    if(!input || Array.isArray(input)||typeof input!=="object")throw new Error("Ugyldig formular.");
    const action=text(input.action,50);
    await limit(db,req,business.id,"workspace-owner",["test","test_run","ticket_draft"].includes(action)?30:300,3600);
    if(action==="digest_settings"&&input.enabled===true&&(!mailConfigured()||!business.support_email))throw new CommerceError("Tilføj en kontaktmail under Indstillinger, og kontrollér at mailafsendelse er konfigureret.",400);
    if(["chat","feedback","lead_create","heartbeat","starter_click"].includes(action))throw new CommerceError("Brug den offentlige widget til denne handling.",400);
    let result:unknown=null;
    if(action==="test"||action==="test_run"||action==="chat"||action==="ticket_draft") {
      const snapshot=await readWorkspace();
      const test=action==="test_run"?snapshot.tests.find(t=>t.id===input.id):null;
      const ticket=action==="ticket_draft"?snapshot.tickets.find(t=>t.id===input.id):null;
      if(action==="test_run"&&!test||action==="ticket_draft"&&!ticket)throw new Error("Spørgsmålet eller sagen findes ikke længere.");
      const question=ticket?`Skriv et kort svarudkast til denne kundehenvendelse. Lov kun noget, der fremgår af vores viden: ${ticket.description}`:test?.question||text(input.question,2000);
      const history=action==="chat"&&Array.isArray(input.history)?input.history.slice(-10).filter((m:unknown):m is {role:"user"|"assistant";content:string}=>!!m&&typeof m==="object"&&["user","assistant"].includes(String((m as {role:unknown}).role))&&typeof (m as {content:unknown}).content==="string").map(m=>({role:m.role,content:m.content.slice(0,2000)})):[];
      const {data:facts,error:factsError}=await db.from("businesses").select("description,support_email,products_services,delivery_time,return_policy,faq,custom_instructions,plan,ai_answer_limit_override").eq("id",business.id).single();
      if(factsError||!facts)throw new CommerceError("Virksomhedens oplysninger kunne ikke hentes.");
      if(snapshot.answerMode==="ai"){
       const {data:allowance,error:usageError}=await db.rpc("consume_ai_answer",{p_business_id:business.id,p_limit:getAnswerLimit(getPlan(facts.plan).slug,facts.ai_answer_limit_override)});
       if(usageError||!(Array.isArray(allowance)?allowance[0]:allowance)?.allowed)throw new CommerceError("Månedens AI-grænse er nået, eller forbruget kunne ikke kontrolleres.",429);
      }
      const reply=await answerWorkspace(snapshot,question,history,`${JSON.stringify(facts)}\nAktuelle beskeder: ${snapshot.campaigns.filter(c=>c.enabled&&Date.parse(c.startsAt)<=Date.now()&&Date.now()<Date.parse(c.endsAt)).map(c=>c.text).join("\n")}`);result=reply;
      if(test)await mutateWorkspace(state=>{const current=state.tests.find(t=>t.id===test.id);if(!current||current.question!==test.question||current.expected!==test.expected)throw new Error("Testen blev ændret under kørslen. Kør den igen.");Object.assign(current,{answer:reply.answer,sources:reply.sources,checkedAt:new Date().toISOString(),matched:current.expected?reply.answer.toLocaleLowerCase("da").includes(current.expected.toLocaleLowerCase("da")):undefined});});
      if(action==="chat"){
        const id=randomUUID();await mutateWorkspace(state=>{if(state.conversations.length>=500)state.conversations.shift();state.conversations.push({id,question,answer:reply.answer,page:text(input.page||"/",200),date:new Date().toISOString()});});result={...reply,id};
      }
    }else if(action==="source_import"||action==="source_check"){
      const before=await readWorkspace();const old=action==="source_check"?before.sources.find(s=>s.id===input.id&&s.kind==="url"):null;
      if(action==="source_check"&&!old)throw new Error("Vælg en hjemmesidekilde.");
      let content:string;let name:string;let kind:"url"|"pdf";let truncated=false;
      if(input.kind==="pdf"&&action==="source_import"){
        name=text(input.name,200);if(!/\.pdf$/i.test(name))throw new Error("Vælg en PDF-fil.");
        const bytes=Buffer.from(text(input.data,3_000_000),"base64");if(bytes.length>2_000_000||bytes.subarray(0,5).toString()!=="%PDF-")throw new Error("Vælg en gyldig PDF på højst 2 MB.");
        const {extractText,getDocumentProxy}=await import("unpdf");const pdf=await getDocumentProxy(new Uint8Array(bytes));
        try{if(pdf.numPages>100)throw new Error("PDF-filen må have højst 100 sider.");const extracted=await extractText(pdf,{mergePages:true});content=extracted.text;}finally{await pdf.loadingTask.destroy();}
        kind="pdf";
      }else{const page=await fetchWebsitePage(old?.name||text(input.url,2048));const extracted=extractWebsiteText(page.html);content=extracted.text;truncated=extracted.truncated;name=page.url;kind="url";}
      if(content.trim().length<20)throw new Error("Filen indeholder ikke nok læsbar tekst. Scannede PDF'er kræver tekstgenkendelse.");truncated ||= content.length>30000;content=content.slice(0,30000);
      await mutateWorkspace(state=>{
        if(old){const source=state.sources.find(s=>s.id===old.id);if(!source||source.text!==old.text)throw new Error("Kilden blev ændret under kontrollen. Prøv igen.");source.checkedAt=new Date().toISOString();delete source.error;if(content!==source.text)source.pendingText=content;else delete source.pendingText;}
        else{if(state.sources.length>=30)throw new Error("Du kan have op til 30 kilder.");state.sources.push({id:randomUUID(),name,kind,text:content,updatedAt:new Date().toISOString(),truncated});}
      });
    }else if(["ticket_status","ticket_note","ticket_reply","lead_update"].includes(action)){
      const snapshot=await readWorkspace();applyAction(snapshot,input);
      if(action==="lead_update"){
       const lead=snapshot.leads.find(l=>l.id===input.id)!;const {error}=await db.from("workspace_leads").update({data:lead}).eq("id",lead.id).eq("business_id",business.id);if(error)throw new CommerceError("Opfølgningen kunne ikke gemmes.");
      }else{
       const ticket=snapshot.tickets.find(t=>t.id===input.id)!;
       if(action!=="ticket_status"){
        if(action==="ticket_reply"&&!mailConfigured())throw new CommerceError("Mailafsendelse er ikke konfigureret. Gem en intern note eller kontakt EmbedBot.");
        const id=validId(input.request_id)?String(input.request_id):randomUUID();
        const {error}=await db.from("workspace_ticket_entries").upsert({id,business_id:business.id,ticket_id:ticket.id,kind:action==="ticket_note"?"note":"reply",text:text(input.text,4000),delivery_status:action==="ticket_note"?"note":"pending"},{onConflict:"id",ignoreDuplicates:true});if(error)throw new CommerceError("Noten eller svaret kunne ikke gemmes.");
        if(action==="ticket_reply")result={sent:await deliverWorkspaceReply(db,id,business.id)};
       }
       const {error}=await db.from("commerce_tickets").update({status:ticket.status,updated_at:new Date().toISOString()}).eq("id",ticket.id).eq("business_id",business.id);if(error)throw new CommerceError("Status kunne ikke gemmes.");
      }
    }else{await mutateWorkspace(state=>{applyAction(state,input);});}
    const state=await readWorkspace();return responses({state,summary:weeklySummary(state),result});
  }catch(error){return error instanceof CommerceError?failure(error):responses({error:error instanceof Error?error.message:"Handlingen kunne ikke gennemføres."},400);}
}
