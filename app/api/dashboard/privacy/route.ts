import { NextRequest } from "next/server";
import { body,CommerceError,failure,json,owner } from "@/lib/commerce/server";
import { privacyUrl,retentionDays } from "@/lib/compliance/validation";
export async function GET(req:NextRequest) {
 try {
  const {db,business}=await owner(req,req.nextUrl.searchParams.get("business_id"));
  const [settings,account,last]=await Promise.all([
   db.from("business_privacy_settings").select("customer_privacy_url,ticket_retention_days,updated_at").eq("business_id",business.id).maybeSingle(),
   db.from("businesses").select("retention_days").eq("id",business.id).single(),
   db.from("maintenance_runs").select("completed_at").eq("job","cleanup").eq("status","completed").order("completed_at",{ascending:false}).limit(1).maybeSingle(),
  ]);
  if(settings.error||account.error||last.error) throw new CommerceError("Privatlivsindstillinger kræver databaseopdateringen.");
  return json({customerPrivacyUrl:settings.data?.customer_privacy_url??"",ticketRetentionDays:settings.data?.ticket_retention_days??90,chatRetentionDays:account.data?.retention_days??90,lastCleanup:last.data?.completed_at??null});
 }catch(error){return failure(error);}
}
export async function POST(req:NextRequest) {
 try {
  const input=await body(req); const {db,business,user}=await owner(req,input.business_id,true);
  let url, ticketDays,chatDays;
  try {url=privacyUrl(input.customerPrivacyUrl);ticketDays=retentionDays(input.ticketRetentionDays);chatDays=retentionDays(input.chatRetentionDays);}catch(error){throw new CommerceError(error instanceof Error?error.message:"Ugyldige indstillinger.",400);}
  const {error}=await db.rpc("update_business_privacy",{p_business_id:business.id,p_actor:user.id,p_url:url,p_ticket_days:ticketDays,p_chat_days:chatDays});
  if(error) throw new CommerceError("Indstillingerne kunne ikke gemmes.");
  return json({success:true});
 }catch(error){return failure(error);}
}
