import type { SupabaseClient } from '@supabase/supabase-js';
import { CommerceError } from '../commerce/errors.ts';
import { emptyWorkspace,conversationFromRow,settingsOnly } from './production-model.ts';
import type { Workspace,TicketEntry } from './model.ts';
export async function productionStore(db:SupabaseClient,business:{id:string;name:string;support_email?:string}) {
 async function readWorkspace():Promise<Workspace> {
  const [settings,brand,source,conversations,feedback,tickets,entries,leads,activity,openTickets,openLeads,pendingReplies,failedReplies,oldestTicket]=await Promise.all([
   db.from('workspace_settings').select('state,revision').eq('business_id',business.id).maybeSingle(),
   db.from('businesses').select('name,welcome_message').eq('id',business.id).single(),
   db.from('website_sources').select('source_name,source_kind,content_text,imported_at,truncated').eq('business_id',business.id).maybeSingle(),
   db.from('conversations').select('id,created_at,messages',{count:'exact'}).eq('business_id',business.id).or('is_deleted.is.null,is_deleted.eq.false').order('created_at',{ascending:false}).limit(1000),
   db.from('workspace_feedback').select('conversation_id,value,note',{count:'exact'}).eq('business_id',business.id).order('created_at',{ascending:false}).limit(1000),
   db.from('commerce_tickets').select('id,case_number,contact_email,description,status,created_at',{count:'exact'}).eq('business_id',business.id).order('created_at',{ascending:false}).limit(300),
   db.from('workspace_ticket_entries').select('id,ticket_id,kind,text,delivery_status,created_at',{count:'exact'}).eq('business_id',business.id).order('created_at',{ascending:false}).limit(1000),
   db.from('workspace_leads').select('id,data,created_at',{count:'exact'}).eq('business_id',business.id).order('created_at',{ascending:false}).limit(300),
   db.from('workspace_activity').select('last_seen_at,page,clicks').eq('business_id',business.id).maybeSingle(),
   db.from('commerce_tickets').select('id',{count:'exact',head:true}).eq('business_id',business.id).neq('status','closed'),
   db.from('workspace_leads').select('id',{count:'exact',head:true}).eq('business_id',business.id).eq('data->>status','new'),
   db.from('workspace_ticket_entries').select('id',{count:'exact',head:true}).eq('business_id',business.id).eq('kind','reply').eq('delivery_status','pending'),
   db.from('workspace_ticket_entries').select('id',{count:'exact',head:true}).eq('business_id',business.id).eq('kind','reply').eq('delivery_status','failed'),
   db.from('commerce_tickets').select('created_at').eq('business_id',business.id).neq('status','closed').order('created_at').limit(1).maybeSingle()
  ]);
  if([settings,brand,source,conversations,feedback,tickets,entries,leads,activity,openTickets,openLeads,pendingReplies,failedReplies,oldestTicket].some(r=>r.error))throw new CommerceError('Arbejdsområdet kunne ikke hentes. Prøv igen.');
  const state:Workspace=settings.data?.state?structuredClone(settings.data.state):emptyWorkspace(brand.data?.name||business.name,brand.data?.welcome_message||'');
  state.revision=settings.data?.revision??-1;
  state.name=brand.data?.name||business.name;state.welcome=brand.data?.welcome_message||'';
  if(!state.managedBase&&source.data?.content_text)state.sources=[...state.sources.filter(s=>s.id!=="imported-website"),{id:'imported-website',name:source.data.source_name,kind:source.data.source_kind==='pdf'?'pdf':'text',text:source.data.content_text.slice(0,30000),updatedAt:source.data.imported_at,truncated:source.data.truncated}];
  const votes=new Map((feedback.data||[]).map(f=>[f.conversation_id,f]));
  state.conversations=(conversations.data||[]).map(conversationFromRow).filter(c=>c!==null).map(c=>{const f=votes.get(c.id);return f?{...c,feedback:f.value as 'yes'|'no',feedbackNote:f.note}:c;});
  state.tickets=(tickets.data||[]).map(t=>({id:t.id,number:t.case_number,email:t.contact_email,description:t.description,status:t.status,date:t.created_at,entries:(entries.data||[]).filter(e=>e.ticket_id===t.id).reverse().map(e=>({id:e.id,kind:e.kind,text:e.text,date:e.created_at,deliveryStatus:e.delivery_status}) as TicketEntry)}));
  state.leads=(leads.data||[]).map(l=>({...l.data,id:l.id,date:l.created_at}));
  state.installation=activity.data?.last_seen_at?{lastSeenAt:activity.data.last_seen_at,page:activity.data.page}:{};
  state.starters=state.starters.map(s=>({...s,clicks:Number(activity.data?.clicks?.[s.id]||0)}));
  const loaded=conversations.data?.length||0;
  state.dataScope={
   readAt:new Date().toISOString(),conversations:{total:conversations.count??loaded,loaded,excluded:loaded-state.conversations.length,oldestAt:conversations.data?.at(-1)?.created_at},
   feedback:{total:feedback.count??feedback.data?.length??0,loaded:feedback.data?.length||0},tickets:{total:tickets.count??state.tickets.length,loaded:state.tickets.length},leads:{total:leads.count??state.leads.length,loaded:state.leads.length},entries:{total:entries.count??entries.data?.length??0,loaded:entries.data?.length||0},
   openTickets:openTickets.count??0,openLeads:openLeads.count??0,pendingReplies:pendingReplies.count??0,failedReplies:failedReplies.count??0,oldestOpenTicketAt:oldestTicket.data?.created_at,
  };
  return state;
 }
 async function mutateWorkspace(change:(state:Workspace)=>void|Promise<void>,brand=false) {
  // Compare-and-swap across server instances; retry only the pure state mutation.
  for(let attempt=0;attempt<4;attempt++){
   const state=await readWorkspace();const revision=state.revision;
   const beforeBase=JSON.stringify(state.sources.find(s=>s.id==='imported-website'));
   await change(state);
   if(beforeBase!==JSON.stringify(state.sources.find(s=>s.id==='imported-website')))state.managedBase=true;
   const {data,error}=await db.rpc('save_workspace_settings',{p_business_id:business.id,p_revision:revision,p_state:settingsOnly(state),p_brand:brand});
   if(error)throw new CommerceError('Ændringen kunne ikke gemmes.');if(data===true)return readWorkspace();
  }
  throw new CommerceError('Arbejdsområdet blev ændret samtidigt. Prøv igen.',409);
 }
 return {readWorkspace,mutateWorkspace};
}
