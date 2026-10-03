import { NextRequest } from "next/server";
import { database,json } from "@/lib/commerce/server";
import { equalSecret } from "@/lib/commerce/security";
import { retryNotifications } from "@/lib/commerce/mail";
import { maintenance } from "@/lib/compliance/jobs";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET?.trim();if(!secret)return json({error:"Cron job not configured"},503);
 if(!equalSecret(req.headers.get("authorization")||"",`Bearer ${secret}`))return json({error:"Unauthorized"},401);
 try{const db=database();return json(await maintenance(db,"support",async()=>({notifications_checked:await retryNotifications(db)})));}catch{return json({error:"Support job failed"},503);}
}
