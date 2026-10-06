import { NextRequest } from "next/server";
import { database,json } from "@/lib/commerce/server";
import { equalSecret } from "@/lib/commerce/security";
import { maintenance } from "@/lib/compliance/jobs";
async function runCleanup(req:NextRequest){
 const secret=process.env.CRON_SECRET?.trim();if(!secret)return json({error:"Cron job not configured"},503);
 if(!equalSecret(req.headers.get("authorization")||"",`Bearer ${secret}`))return json({error:"Unauthorized"},401);
 try{const db=database();const counts=await maintenance(db,"cleanup",async()=>{
  const {data,error}=await db.rpc("compliance_cleanup");if(error||!data)throw new Error("cleanup_failed");const {data:workspace,error:workspaceError}=await db.rpc("cleanup_workspace");if(workspaceError)throw new Error("workspace_cleanup_failed");return {...data,workspace_feedback_removed:workspace||0} as Record<string,number>;
 });return json({success:true,counts});}catch{return json({error:"Cleanup failed"},503);}
}
export const GET=runCleanup;
export const POST=runCleanup;
