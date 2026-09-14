import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = "v1";

function signatureFor(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createPreviewToken(
  businessId: string,
  secret: string,
  expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000,
): string {
  const payload = `${TOKEN_VERSION}.${businessId}.${Math.floor(expiresAt)}`;
  return `${payload}.${signatureFor(payload, secret)}`;
}

export function verifyPreviewToken(
  token: string,
  businessId: string,
  secret: string,
  now = Date.now(),
): boolean {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== TOKEN_VERSION || parts[1] !== businessId) {
    return false;
  }

  const expiresAt = Number(parts[2]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) {
    return false;
  }

  const expected = signatureFor(`${parts[0]}.${parts[1]}.${parts[2]}`, secret);
  const received = parts[3];
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function getPreviewTokenSecret(): string {
  return (process.env.PREVIEW_TOKEN_SECRET || process.env.SUPABASE_SERVICE_KEY || "").trim();
}
