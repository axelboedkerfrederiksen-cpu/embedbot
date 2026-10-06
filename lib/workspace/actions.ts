import { generateDigest } from "./digest.ts";
import { randomUUID } from "node:crypto";
import { activeCampaigns, type Workspace } from "./model.ts";
export function text(value: unknown, max = 2000, required = true) {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new Error("Udfyld feltet, og hold teksten inden for den viste grænse.");
  return value.trim();
}
export function applyAction(state: Workspace, input: Record<string, unknown>, now = new Date()) {
  const date = now.toISOString();
  const id = typeof input.id === "string" ? input.id : "";
  const find = <T extends {id:string}>(list:T[]) => { const item=list.find(x=>x.id===id);if(!item)throw new Error("Elementet findes ikke længere. Opdatér siden.");return item; };
  switch (input.action) {
    case "answer_mode": {if(!["sources","ai"].includes(String(input.mode)))throw new Error("Vælg en svarmetode.");state.answerMode=input.mode as "sources"|"ai";break;}
    case "welcome": state.welcome=text(input.welcome,1000,false);state.name=text(input.name,100);break;
    case "quote_settings": state.quoteEnabled=input.enabled===true;state.quoteLabel=text(input.label,60);break;
    case "starter_save": {
      const item = { id:id || randomUUID(),label:text(input.label,60),message:text(input.message,500),path:text(input.path,200,false),clicks:0 };
      if (item.path && (!item.path.startsWith("/") || /[?#\s]/.test(item.path) || (item.path.includes("*") && (!item.path.endsWith("*") || item.path.split("*").length!==2)))) throw new Error("Brug fx /kontakt eller /produkter/*. Tomt felt betyder alle sider.");
      if (id) { const old=find(state.starters);Object.assign(old,{...item,clicks:old.clicks}); } else { if(state.starters.length>=12)throw new Error("Du kan have op til 12 startknapper.");state.starters.push(item); }break;
    }
    case "starter_remove": find(state.starters);state.starters=state.starters.filter(s=>s.id!==id);break;
    case "starter_move": { const index=state.starters.findIndex(s=>s.id===id);find(state.starters);const next=index+(input.direction==="up"?-1:1);if(next>=0&&next<state.starters.length)[state.starters[index],state.starters[next]]=[state.starters[next],state.starters[index]];break; }
    case "starter_click": find(state.starters).clicks++;break;
    case "campaign_save": {
      const c={id:id||randomUUID(),title:text(input.title,120),text:text(input.text,2000),startsAt:text(input.startsAt,40),endsAt:text(input.endsAt,40),enabled:input.enabled===true};
      if (!Number.isFinite(Date.parse(c.startsAt)) || !Number.isFinite(Date.parse(c.endsAt)) || Date.parse(c.startsAt)>=Date.parse(c.endsAt)) throw new Error("Slutdatoen skal ligge efter startdatoen.");
      if(id)Object.assign(find(state.campaigns),c);else{if(state.campaigns.length>=30)throw new Error("Du kan have op til 30 beskeder.");state.campaigns.push(c);}break;
    }
    case "campaign_remove": find(state.campaigns);state.campaigns=state.campaigns.filter(c=>c.id!==id);break;
    case "source_save": {
      const source={id:id||randomUUID(),name:text(input.name,200),kind:"text" as const,text:text(input.text,30000),updatedAt:date};
      if(id){const old=find(state.sources);Object.assign(old,{...source,kind:old.kind});delete old.pendingText;delete old.error;}else{if(state.sources.length>=30)throw new Error("Du kan have op til 30 kilder.");state.sources.push(source);}
      if(typeof input.insightId==="string"&&input.insightId.length<=200){state.addressed ||= {};state.addressed[input.insightId]={sourceId:source.id,date};}break;
    }
    case "source_remove": find(state.sources);state.sources=state.sources.filter(s=>s.id!==id);break;
    case "source_accept": {const source=find(state.sources);if(!source.pendingText)throw new Error("Der er ingen ændring at godkende.");source.text=source.pendingText;source.updatedAt=date;delete source.pendingText;delete source.error;break;}
    case "source_reject": delete find(state.sources).pendingText;break;
    case "dismiss": {const key=text(input.id,200);if(!state.dismissed.includes(key))state.dismissed.push(key);break;}
    case "restore_insights": state.dismissed=[];break;
    case "test_save": {const item={id:id||randomUUID(),question:text(input.question,1000),expected:text(input.expected,200,false)};if(id)Object.assign(find(state.tests),item);else{if(state.tests.length>=30)throw new Error("Du kan gemme op til 30 spørgsmål.");state.tests.push(item);}break;}
    case "test_remove": find(state.tests);state.tests=state.tests.filter(t=>t.id!==id);break;
    case "ticket_status": {if(!["new","in_progress","closed"].includes(String(input.status)))throw new Error("Vælg en gyldig status.");find(state.tickets).status=input.status as Workspace["tickets"][number]["status"];break;}
    case "ticket_note": case "ticket_reply": {const ticket=find(state.tickets);ticket.entries.push({id:randomUUID(),kind:input.action==="ticket_note"?"note":"reply",text:text(input.text,4000),date});if(input.action==="ticket_reply")ticket.status="in_progress";break;}
    case "lead_update": {const lead=find(state.leads);if(!["new","contacted","closed"].includes(String(input.status)))throw new Error("Vælg en gyldig status.");lead.status=input.status as Workspace["leads"][number]["status"];lead.note=text(input.note,2000,false);break;}
    case "lead_create": {const email=text(input.email,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("Indtast en gyldig mailadresse.");const need=text(input.need,2000);if(state.leads.length>=300||state.tickets.length>=300)throw new Error("Den lokale demo har nået sin grænse for henvendelser.");state.leads.push({id:randomUUID(),email,need,budget:text(input.budget,100,false),timing:text(input.timing,100,false),page:text(input.page,200,false),status:"new",note:"",date});state.tickets.push({id:randomUUID(),number:Math.max(1043,...state.tickets.map(t=>t.number))+1,email,description:need,status:"new",date,entries:[]});break;}
    case "feedback": {const conversation=find(state.conversations);if(!["yes","no"].includes(String(input.value)))throw new Error("Vælg ja eller nej.");conversation.feedback=input.value as "yes"|"no";conversation.feedbackNote=text(input.note||"",500,false);break;}
    case "heartbeat": state.installation={lastSeenAt:date,page:text(input.page,200)};break;
    case "digest_settings": {if(!Number.isInteger(input.weekday)||Number(input.weekday)<0||Number(input.weekday)>6)throw new Error("Vælg en ugedag.");state.digest={...state.digest,enabled:input.enabled===true,weekday:Number(input.weekday)};break;}
    case "digest_generate": generateDigest(state,now);break;
    case "digest_tick": generateDigest(state,now,true);break;
    default: throw new Error("Ukendt handling.");
  }
  return {campaigns:activeCampaigns(state,now)};
}
