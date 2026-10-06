import type { SupabaseClient } from '@supabase/supabase-js';
import { resend } from '../resend.ts';
import { commerceEmailFrom,mailConfigured } from '../commerce/mail.ts';
export async function deliverWorkspaceReply(db:SupabaseClient,id:string,businessId:string){
 if(!mailConfigured())return false;
 const {data:entry,error}=await db.from('workspace_ticket_entries').select('*').eq('id',id).eq('business_id',businessId).eq('kind','reply').maybeSingle();
 if(error||!entry)return false;if(entry.delivery_status==='sent')return true;
 if(entry.attempts>=5||Date.now()-Date.parse(entry.created_at)>23*3600000)return false;
 if(entry.attempted_at&&Date.now()-Date.parse(entry.attempted_at)<120000)return false;
 const {data:claimed}=await db.from('workspace_ticket_entries').update({attempts:entry.attempts+1,attempted_at:new Date().toISOString()}).eq('id',id).eq('business_id',businessId).eq('attempts',entry.attempts).select('id').maybeSingle();
 if(!claimed)return false;
 const [{data:ticket},{data:business}]=await Promise.all([db.from('commerce_tickets').select('contact_email,case_number').eq('id',entry.ticket_id).eq('business_id',businessId).single(),db.from('businesses').select('name,support_email,is_deleted').eq('id',businessId).single()]);
 if(!ticket||!business||business.is_deleted)return false;
 try{
  const {data,error:sendError}=await resend.emails.send({from:commerceEmailFrom(),to:ticket.contact_email,replyTo:business.support_email||undefined,subject:`Svar fra ${business.name} · EB-${ticket.case_number}`,text:entry.text},{idempotencyKey:`workspace-reply-${id}`});
  if(sendError||!data?.id)throw new Error('send_failed');
  const {error:updateError}=await db.from('workspace_ticket_entries').update({delivery_status:'sent'}).eq('id',id).eq('business_id',businessId);
  if(updateError)return false;return true;
 }catch{await db.from('workspace_ticket_entries').update({delivery_status:'failed'}).eq('id',id).eq('business_id',businessId);return false;}
}
export async function retryWorkspaceReplies(db:SupabaseClient){
 const {data,error}=await db.from('workspace_ticket_entries').select('id,business_id').eq('kind','reply').in('delivery_status',['pending','failed']).lt('attempts',5).gte('created_at',new Date(Date.now()-23*3600000).toISOString()).limit(50);
 if(error)throw new Error('workspace_reply_query_failed');
 for(const row of data||[])await deliverWorkspaceReply(db,row.id,row.business_id);return data?.length||0;
}
