import { NextRequest } from "next/server";
import { body,CommerceError,failure,json,owner } from "@/lib/commerce/server";
import { validId } from "@/lib/commerce/security";
export async function DELETE(req:NextRequest){
 try{const input=await body(req);const {db,business,user}=await owner(req,input.business_id,true);
 if(input.conversation_id&&!validId(input.conversation_id))throw new CommerceError("Ugyldig samtale.",400);
 const {data,error}=await db.rpc("delete_owner_conversations",{p_business_id:business.id,p_actor:user.id,p_id:input.conversation_id||null});
 if(error)throw new CommerceError("Samtalerne kunne ikke slettes.");return json({success:true,deleted_count:data});
 }catch(error){return failure(error);}
}
