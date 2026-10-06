import { sendScheduledDigests } from "@/lib/workspace/production-digest";
import { retryWorkspaceReplies } from "@/lib/workspace/mail";
import { NextRequest } from "next/server";
import { database,json } from "@/lib/commerce/server";
import { equalSecret } from "@/lib/commerce/security";
import { retryNotifications } from "@/lib/commerce/mail";
import { maintenance } from "@/lib/compliance/jobs";
export const runtime="nodejs";
export const maxDuration=60;
export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET?.trim();if(!secret)return json({error:"Cron job not configured"},503);
 if(!equalSecret(req.headers.get("authorization")||"",`Bearer ${secret}`))return json({error:"Unauthorized"},401);
 try{const db=database();return json(await maintenance(db,"support",async()=>({notifications_checked:await retryNotifications(db),workspace_replies_checked:await retryWorkspaceReplies(db),digests_sent:await sendScheduledDigests(db)})));}catch{return json({error:"Support job failed"},503);}
}
