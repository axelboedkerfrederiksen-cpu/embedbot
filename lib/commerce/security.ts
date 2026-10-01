import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function encryptionKey(value = process.env.COMMERCE_ENCRYPTION_KEY): Buffer {
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error("Commerce not configured");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("Commerce not configured");
  return key;
}
// Support-only confirmations can use the existing server secret when no shop
// integration is configured. Never use this fallback to encrypt shop credentials.
export function supportKey(): Buffer {
  if (process.env.COMMERCE_ENCRYPTION_KEY) return encryptionKey();
  const secret = process.env.SUPABASE_SERVICE_KEY;
  if (!secret || secret.length < 32) throw new Error("Support not configured");
  return createHmac("sha256", secret).update("embedbot:support-only:v1").digest();
}
export function seal(value: unknown, scope: string, key = encryptionKey()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(scope));
  const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}
export function unseal<T>(value: string, scope: string, key = encryptionKey()): T {
  if (value.length > 50000) throw new Error("Invalid token");
  const [version, iv, tag, body, extra] = value.split(".");
  if (version !== "v1" || extra || !body) throw new Error("Invalid token");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(scope));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8")) as T;
}
export function digest(value: string, key = encryptionKey()): string {
  return createHmac("sha256", key).update(value).digest("hex");
}
export function equalSecret(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export const validEmail = (value: unknown): value is string => typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const validId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const validSession = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(value);
export function shopifyHmac(params: URLSearchParams, secret: string): boolean {
  const entries = [...params.entries()];
  if (new Set(entries.map(([k]) => k)).size !== entries.length) return false;
  const message = entries.filter(([k]) => k !== "hmac").sort(([a], [b]) => a.localeCompare(b, "en")).map(([k, v]) => `${k}=${v}`).join("&");
  return equalSecret(createHmac("sha256", secret).update(message).digest("hex"), params.get("hmac") || "");
}
