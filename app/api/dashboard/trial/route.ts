import { NextRequest,after } from "next/server";
import { body,CommerceError,failure,json,owner } from "@/lib/commerce/server";
import { TERMS } from "@/lib/compliance/legal";
import { websiteIngestToken } from "@/lib/website-ingest-token";
export async function POST(req:NextRequest){
 try{
  const input=await body(req);const {db,business,user}=await owner(req,input.business_id,true);
  const {data,error}=await db.rpc("start_embedbot_trial",{p_business_id:business.id,p_actor:user.id,p_terms_version:TERMS.version});
  if(error)throw new CommerceError("Prøven kunne ikke startes. Accepter vilkårene først. En udløbet prøve eller et betalt abonnement kan ikke genstartes her.",409);
  // Website ingestion does not extend the trial and does not depend on payment or a mail provider.
  const {data:source,error:sourceError}=await db.from("website_sources").select("business_id").eq("business_id",business.id).maybeSingle();
  if(!sourceError && !source && business.website_url && process.env.NEXT_PUBLIC_APP_URL)after(async()=>{try{await fetch(new URL("/api/ingest",process.env.NEXT_PUBLIC_APP_URL),{method:"POST",headers:{"Content-Type":"application/json","x-website-ingest-token":websiteIngestToken(business.id)},body:JSON.stringify({url:business.website_url,business_id:business.id})});}catch{console.warn("trial_ingest_failed");}});
  return json({success:true,trialEndsAt:data});
 }catch(error){return failure(error);}
}
