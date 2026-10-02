import { createHmac, timingSafeEqual } from "node:crypto";

export function websiteIngestToken(businessId: string, now = Date.now()) {
  const secret = process.env.SUPABASE_SERVICE_KEY;
  if (!secret) throw new Error("Server not configured");
  const timestamp = String(now);
  const signature = createHmac("sha256", secret).update(`website-ingest:${businessId}:${timestamp}`).digest("hex");
  return `${timestamp}.${signature}`;
}

export function verifyWebsiteIngestToken(token: string | null, businessId: string, now = Date.now()) {
  if (!token || !/^\d{13}\.[a-f0-9]{64}$/.test(token)) return false;
  const timestamp = Number(token.split(".")[0]);
  if (timestamp > now + 10000 || now - timestamp > 120000) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(websiteIngestToken(businessId, timestamp)));
  } catch { return false; }
}
