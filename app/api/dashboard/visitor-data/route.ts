import { NextRequest } from "next/server";
import { body,CommerceError,failure,json,owner } from "@/lib/commerce/server";
import { visitorSelector } from "@/lib/compliance/validation";
import { audit } from "@/lib/compliance/audit";
export async function POST(req:NextRequest) {
 try {
  const input=await body(req); const {db,business,user}=await owner(req,input.business_id,true);
  if(input.identityVerified!==true)throw new CommerceError("Virksomheden skal først kontrollere identitet og rettighed til oplysningerne. En indtastet email er ikke identitetsbevis.",400);
  let selector;
  try{selector=visitorSelector(input.kind,input.value);}catch(error){throw new CommerceError(error instanceof Error?error.message:"Ugyldig identifikator.",400);}
  if(!["search","export","delete"].includes(String(input.action)))throw new CommerceError("Ugyldig handling.",400);
  const {data:limited,error:rateError}=await db.rpc("enforce_chat_rate_limit",{p_ip_hash:`visitor-request:${business.id}:${user.id}`,p_limit:20,p_window_seconds:60});
  if(rateError)throw new CommerceError("Sikkerhedskontrollen er ikke tilgængelig.");
  if(limited===true)throw new CommerceError("Vent lidt før næste anmodning.",429);
  const args={p_business_id:business.id,p_actor:user.id,p_kind:selector.kind,p_value:selector.value};
  if(input.action==="delete") {
   if(input.confirmDelete!==true)throw new CommerceError("Bekræft permanent sletning.",400);
   const {data,error}=await db.rpc("delete_visitor_data",args);if(error)throw new CommerceError("Sletningen kunne ikke gennemføres.");return json(data);
  }
  const records: {kind:string;id:string;record:Record<string,unknown>}[]=[];
  let afterKind="",afterId="00000000-0000-0000-0000-000000000000";
  for(;;){
   const {data,error}=await db.rpc("visitor_records",{...args,p_after_kind:afterKind,p_after_id:afterId,p_limit:500});
   if(error||!Array.isArray(data))throw new CommerceError("Oplysningerne kunne ikke hentes.");
   records.push(...data);if(data.length<500||input.action==="search")break;
   const last=data[data.length-1];if(last.kind===afterKind&&last.id===afterId)throw new CommerceError("Eksporten kunne ikke færdiggøres.");afterKind=last.kind;afterId=last.id;
  }
  await audit(db,user.id,business.id,input.action==="search"?"visitor.search":"visitor.export",records.length);
  return json({business_id:business.id,exported_at:new Date().toISOString(),records,searchLimited:input.action==="search"&&records.length===500,limitations:"Kun oplysninger med denne email eller en tilknyttet samtalereference. Historiske kopier uden reference, aliaser og modtageres egne kopier skal gennemgås manuelt. Email i chattekst er ikke verificeret identitet."});
 }catch(error){return failure(error);}
}
