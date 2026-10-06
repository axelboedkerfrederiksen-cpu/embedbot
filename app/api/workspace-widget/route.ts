import { NextRequest } from 'next/server';
import { publicContext,body,limit,json,failure,CommerceError } from '@/lib/commerce/server';
import { readChatReference } from '@/lib/compliance/chat-reference';
import { validId,digest,supportKey } from '@/lib/commerce/security';
import { notifyTicket } from '@/lib/commerce/mail';
import { applyAction,text } from '@/lib/workspace/actions';
import { emptyWorkspace } from '@/lib/workspace/production-model';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 try{
  const input=await body(req);const {db,business,sessionHash}=await publicContext(req,input);
  const action=text(input.action,40);
  await limit(db,req,business.id,'workspace-widget:'+action,action==='heartbeat'?120:action==='lead_create'?5:60,3600);
  if(action==='feedback'){
   const id=readChatReference(input.reference,business.id,input.session);
   if(!id||id!==input.id)throw new CommerceError('Samtalen kunne ikke verificeres.',403);
   let query=db.from('conversations').select('id').eq('id',id).eq('business_id',business.id).or('is_deleted.eq.false,is_deleted.is.null');
   if(business.retention_days>0)query=query.gte('created_at',new Date(Date.now()-business.retention_days*86400000).toISOString());
   const {data:conversation,error:lookupError}=await query.maybeSingle();if(lookupError||!conversation)throw new CommerceError('Samtalen er ikke længere tilgængelig.',404);
   if(!['yes','no'].includes(String(input.value)))throw new CommerceError('Vælg ja eller nej.',400);
   const {error}=await db.from('workspace_feedback').upsert({business_id:business.id,conversation_id:id,value:input.value,note:text(input.note||'',500,false)},{onConflict:'conversation_id'});if(error)throw new CommerceError('Feedback kunne ikke gemmes.');
  }else if(action==='heartbeat'||action==='starter_click'){
   const {error}=await db.rpc('workspace_activity_event',{p_business_id:business.id,p_page:text(input.page||'/',200),p_starter:action==='starter_click'?text(input.id,100):null});if(error)throw new CommerceError('Status kunne ikke gemmes.');
  }else if(action==='lead_create'){
   if(!validId(input.submission_key))throw new CommerceError('Ugyldig henvendelse.',400);
   const {data:settings,error:settingsError}=await db.from('workspace_settings').select('state').eq('business_id',business.id).maybeSingle();
   if(settingsError||settings?.state?.quoteEnabled!==true)throw new CommerceError('Tilbudsformularen er ikke aktiveret.',403);
   const state=emptyWorkspace(business.name,'');applyAction(state,input);const lead=state.leads[0];
   if(lead.need.length<10)throw new CommerceError('Beskriv dit behov med mindst 10 tegn.',400);
   const {data:mailSettings}=await db.from('commerce_settings').select('notification_email').eq('business_id',business.id).maybeSingle();
   const key=digest(`quote:${sessionHash}:${input.submission_key}`,supportKey());
   const {data:id,error}=await db.rpc('create_workspace_lead',{p_business_id:business.id,p_submission_key:key,p_data:lead,p_notification_email:mailSettings?.notification_email||null});
   if(error||!id)throw new CommerceError('Henvendelsen kunne ikke gemmes.');
   const {data:saved}=await db.from('workspace_leads').select('ticket_id').eq('id',id).eq('business_id',business.id).single();if(saved)await notifyTicket(db,saved.ticket_id,business.id);
  }else throw new CommerceError('Ugyldig handling.',400);
  return json({success:true});
 }catch(error){return error instanceof CommerceError?failure(error):json({error:'Kontrollér oplysningerne og prøv igen.'},400);}
}
