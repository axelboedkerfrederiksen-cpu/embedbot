import { NextRequest } from "next/server";
import { body,CommerceError,failure,json,owner } from "@/lib/commerce/server";
import { LEGAL_DOCUMENTS } from "@/lib/compliance/legal";
export async function GET(req:NextRequest) {
 try {
  const {db,business}=await owner(req,req.nextUrl.searchParams.get("business_id"));
  const {data,error}=await db.from("legal_acceptances").select("slug,version,accepted_at,accepted_by").eq("business_id",business.id);
  if(error)throw new CommerceError("Aftaleregistrering kræver databaseopdateringen.");
  return json({documents:LEGAL_DOCUMENTS,acceptances:data});
 }catch(error){return failure(error);}
}
export async function POST(req:NextRequest) {
 try {
  const input=await body(req); const {db,business,user}=await owner(req,input.business_id,true);
  const document=LEGAL_DOCUMENTS.find(d=>d.slug===input.slug && d.version===input.version);
  if(!document||document.status!=="published"||input.confirmed!==true)throw new CommerceError("Kun en publiceret version kan accepteres efter din bekræftelse.",400);
  const {error}=await db.rpc("accept_legal_document",{p_business_id:business.id,p_actor:user.id,p_slug:document.slug,p_version:document.version,p_sha256:document.sha256});
  if(error)throw new CommerceError("Accepten kunne ikke registreres. Dokumentversionen skal være installeret.");
  return json({success:true});
 }catch(error){return failure(error);}
}
