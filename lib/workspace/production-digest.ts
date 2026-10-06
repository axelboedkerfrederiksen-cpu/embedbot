import type { SupabaseClient } from '@supabase/supabase-js';
import { productionStore } from './production-store.ts';
import { generateDigest,lastDigestOccurrence } from './digest.ts';
import { mailConfigured,commerceEmailFrom } from '../commerce/mail.ts';
import { resend } from '../resend.ts';
export async function sendScheduledDigests(db:SupabaseClient,now=new Date()) {
 const {data:rows,error}=await db.from('workspace_settings').select('business_id').eq('state->digest->>enabled','true').order('business_id').limit(100);
 if(error)throw new Error('workspace_digest_query_failed');let sent=0;
 for(const row of rows||[]){
  const {data:business}=await db.from('businesses').select('id,name,support_email,is_deleted').eq('id',row.business_id).maybeSingle();
  if(!business||business.is_deleted||!business.support_email||!mailConfigured())continue;
  const store=await productionStore(db,business);let state=await store.readWorkspace();const period=lastDigestOccurrence(state.digest.weekday,now);
  if(!state.digest.enabled||Date.parse(state.digest.lastMailedAt||'1970-01-01')>=period.getTime())continue;
  // Only the selected weekday, not an overdue report on another day. Provider
  // idempotency is stable for this weekly period, including concurrent cron runs.
  if(now.getTime()-period.getTime()>24*3600000)continue;
  state=await store.mutateWorkspace(current=>{generateDigest(current,now);});const report=state.digest.report!;
  const {data,error:sendError}=await resend.emails.send({from:commerceEmailFrom(),to:business.support_email,subject:`Ugens opsummering · ${business.name}`,text:`${report.count} spørgsmål i de seneste 7 dage (op til 1.000 seneste samtaler).\n${report.awaiting} åbne supportsager\n${report.newLeads} nye leads\n${report.helpful} af ${report.feedbackCount} tilbagemeldinger var positive.\n\nNæste skridt:\n${report.opportunities.map(g=>`${g.title}: ${g.suggestion}`).join('\n')}\n\nÅbn https://www.embedbot.dk/dashboard/workspace/${business.id}?view=digest\nDu kan slå disse mails fra under Ugens opsummering.`},{idempotencyKey:`workspace-digest-${business.id}-${period.toISOString().slice(0,10)}`});
  if(sendError||!data?.id)continue;await store.mutateWorkspace(current=>{current.digest.lastMailedAt=now.toISOString();});sent++;
 }
 return sent;
}
