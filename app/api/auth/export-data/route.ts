import { database, failure } from "@/lib/commerce/server";
import { session } from "@/lib/compliance/session";
import { exportAccount } from "@/lib/compliance/export";
import { audit } from "@/lib/compliance/audit";
export const runtime = "nodejs";
export async function GET() {
  try {
    const { user }=await session(); const db=database();
    const data=await exportAccount(db,user);
    await audit(db,user.id,null,"account.export");
    return new Response(JSON.stringify(data,null,2),{headers:{"Cache-Control":"private, no-store, max-age=0","Content-Disposition":"attachment; filename=embedbot-export.json","Content-Type":"application/json; charset=utf-8","Referrer-Policy":"no-referrer"}});
  } catch(error) { return failure(error); }
}
