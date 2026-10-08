import { session } from "./compliance/session.ts";
import { database } from "./commerce/server.ts";
import { audit } from "./compliance/audit.ts";
export function authorizedAdmin(user:{id:string;email?:string;email_confirmed_at?:string},ids:string|undefined,email:string|undefined){
 const allowIds=(ids||"").split(",").map(s=>s.trim()).filter(Boolean);
 if(allowIds.length)return allowIds.includes(user.id);
 return Boolean(user.email_confirmed_at && email?.trim() && user.email?.trim().toLowerCase()===email.trim().toLowerCase());
}
export async function verifyAdminSession(req:Request){
 try{
  const {auth,user}=await session();
  if(!process.env.ADMIN_USER_IDS?.trim()&&!process.env.ADMIN_EMAIL?.trim())return {error:"Admin-adgang er ikke konfigureret.",status:503 as const};
  if(!authorizedAdmin(user,process.env.ADMIN_USER_IDS,process.env.ADMIN_EMAIL))return {error:"Ikke autoriseret.",status:403 as const};
  if(!["GET","HEAD","OPTIONS"].includes(req.method) && req.headers.get("origin")!==new URL(req.url).origin)return {error:"Ugyldig anmodning.",status:403 as const};
  await audit(database(),user.id,null,["GET","HEAD","OPTIONS"].includes(req.method)?"admin.read":"admin.mutate");
  return {supabase:auth,user};
 }catch{return {error:"Log ind med en autoriseret admin-konto.",status:401 as const};}
}
