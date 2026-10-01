import { NextRequest } from "next/server";
import { database, failure, json } from "@/lib/commerce/server";
import { equalSecret } from "@/lib/commerce/security";
import { retryNotifications } from "@/lib/commerce/mail";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return json({ error: "Genforsøg er ikke konfigureret." }, 503);
  if (!equalSecret(req.headers.get("authorization") || "", `Bearer ${secret}`)) return json({ error: "Ikke autoriseret." }, 401);
  try { return json({ checked: await retryNotifications(database()) }); } catch (error) { return failure(error); }
}
