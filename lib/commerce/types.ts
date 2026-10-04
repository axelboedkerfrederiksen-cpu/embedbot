export type ProductQuery = { query: string; vendor?: string; minPrice?: number; maxPrice?: number; currency?: string; variant?: string };
export type Variant = { id: string; name: string; options: { name: string; value: string }[]; price: string | null; currency: string | null; available: boolean | null; stock: number | null };
export type Product = { id: string; name: string; description: string; image?: string | null; url: string; price: string | null; currency: string | null; available: boolean | null; stock: number | null; variants: Variant[]; variantsComplete: boolean; requestedVariant?: { value: string; id: string | null; complete: boolean } };
export type ProductResult = { products: Product[]; more: boolean; fetchedAt?: string; cacheSeconds?: number };
export type OrderInput = { number: string; email: string };
export type OrderStatus = { status: string; shipments: { shippedAt: string | null; trackingUrl: string | null; trackingNumber?: string | null; carrier?: string | null }[] };
// PrivateOrder never crosses the widget or model boundary. Matching email is a
// lookup filter only; authentication is exclusively handled by the OTP server.
export type PrivateOrder = OrderStatus & { contactEmail: string };
export type CommerceAdapter = {
  productsEnabled: boolean;
  ordersEnabled: boolean;
  testConnection(): Promise<void>;
  searchProducts(input: ProductQuery): Promise<ProductResult>;
  lookupOrder(input: OrderInput): Promise<PrivateOrder | null>;
};
export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function validOrderInput(value: unknown): OrderInput | null {
  if (!value || typeof value !== "object") return null;
  const { number, email } = value as Record<string, unknown>;
  if (typeof number !== "string" || typeof email !== "string") return null;
  const normalized = { number: number.trim(), email: email.trim().toLowerCase() };
  return /^#?[\p{L}\p{N}_-]{1,40}$/u.test(normalized.number) && normalized.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email) ? normalized : null;
}
export function cleanQuery(input: unknown): ProductQuery | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  if (typeof row.query !== "string") return null;
  const query = row.query.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 150);
  const vendor = typeof row.vendor === "string" ? row.vendor.replace(/[^\p{L}\p{N}\s-]/gu, " ").trim().slice(0, 80) : undefined;
  const price = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1e8 ? n : undefined;
  const minPrice = price(row.minPrice), maxPrice = price(row.maxPrice);
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) return null;
  return { query, vendor: vendor || undefined, minPrice, maxPrice, currency: typeof row.currency === "string" && /^[A-Z]{3}$/.test(row.currency) ? row.currency : undefined, variant: typeof row.variant === "string" ? row.variant.replace(/[^\p{L}\p{N}\s-]/gu, " ").trim().slice(0, 80) || undefined : undefined };
}
export const money = (value: unknown): string | null => typeof value === "string" && /^\d+(\.\d+)?$/.test(value) ? value : null;
