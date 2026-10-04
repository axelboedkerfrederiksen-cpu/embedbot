import { shopJson } from "./http.ts";
import { equalEmail } from "./shopify.ts";
import { money, safeUrl, type CommerceAdapter, type Variant } from "./types.ts";
export type WooCommerceConfig = { platform: "woocommerce"; origin: string; consumerKey: string; consumerSecret: string; currency: string };
type WooProduct = { id: number; name: string; short_description: string; permalink: string; price: string; stock_status: string; stock_quantity: number | null; status: string; type: string; images?: { src: string }[] };
type WooVariant = { id: number; price: string; stock_status: string; stock_quantity: number | null; attributes: { name: string; option: string }[] };
type WooOrder = { number: string; status: string; billing: { email: string }; meta_data?: { key: string; value: unknown }[] };
const available = (s: string) => s === "instock" ? true : s === "outofstock" ? false : null;
export function wooOrigin(value: string): URL {
  const origin = new URL(value);
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/" || (origin.port && origin.port !== "443")) throw new Error("Invalid commerce configuration");
  return origin;
}
export function wooCommerceAdapter(config: WooCommerceConfig, transport: typeof shopJson = shopJson): CommerceAdapter {
  const origin = wooOrigin(config.origin);
  if (!/^[A-Z]{3}$/.test(config.currency) || !/^ck_[a-f0-9]{40}$/.test(config.consumerKey) || !/^cs_[a-f0-9]{40}$/.test(config.consumerSecret)) throw new Error("Invalid commerce configuration");
  const headers = { Authorization: `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64")}` };
  return {
    productsEnabled: true, ordersEnabled: true,
    async testConnection() {
      await transport(new URL("/wp-json/wc/v3/products?per_page=1", origin), headers);
      await transport(new URL("/wp-json/wc/v3/orders?per_page=1", origin), headers);
      const settings = await transport<{ id: string; value: string }[]>(new URL("/wp-json/wc/v3/settings/general", origin), headers);
      if (!Array.isArray(settings) || settings.find(s => s.id === "woocommerce_currency")?.value !== config.currency) throw new Error("Currency configuration mismatch");
    },
    async searchProducts(input) {
      if (input.currency && input.currency !== config.currency) throw new Error("Currency unavailable");
      const url = new URL("/wp-json/wc/v3/products", origin);
      url.search = new URLSearchParams({ search: [input.query, input.vendor].filter(Boolean).join(" "), status: "publish", per_page: "6", ...(input.minPrice !== undefined ? { min_price: String(input.minPrice) } : {}), ...(input.maxPrice !== undefined ? { max_price: String(input.maxPrice) } : {}) }).toString();
      const result = await transport<WooProduct[]>(url, headers);
      if (!Array.isArray(result)) throw new Error("Commerce unavailable");
      const products = await Promise.all(result.filter(p => p.status === "publish" && safeUrl(p.permalink)).slice(0, 5).map(async p => {
        let variants: Variant[] = [], variantsComplete = true;
        if (p.type === "variable") {
          const rows = await transport<WooVariant[]>(new URL(`/wp-json/wc/v3/products/${p.id}/variations?per_page=100&status=publish`, origin), headers);
          if (!Array.isArray(rows)) throw new Error("Commerce unavailable");
          variantsComplete = rows.length < 100;
          variants = rows.map(v => ({ id: String(v.id), name: v.attributes.map(a => a.option).join(" / "), options: v.attributes.map(a => ({ name: a.name, value: a.option })), price: money(v.price), currency: config.currency, available: available(v.stock_status), stock: typeof v.stock_quantity === "number" ? v.stock_quantity : null }));
        }
        return { id: String(p.id), name: p.name.slice(0, 200), description: p.short_description.replace(/<[^>]*>/g, " ").slice(0, 500), image: safeUrl(p.images?.[0]?.src), url: safeUrl(p.permalink)!, price: money(p.price), currency: config.currency, available: available(p.stock_status), stock: typeof p.stock_quantity === "number" ? p.stock_quantity : null, variants, variantsComplete };
      }));
      return { products, more: result.length >= 6 };
    },
    async lookupOrder(input) {
      // Core WooCommerce numbers are IDs; custom number plugins require an adapter.
      const id = input.number.replace(/^#/, "");
      if (!/^[1-9]\d{0,15}$/.test(id)) return null;
      const order = await transport<WooOrder>(new URL(`/wp-json/wc/v3/orders/${id}`, origin), headers);
      if (String(order.number) !== id || !equalEmail(order.billing?.email, input.email)) return null;
      // WooCommerce core has no tracking field. Support the official Shipment
      // Tracking extension's documented metadata only when actually present.
      const raw = order.meta_data?.find(m => m.key === "_wc_shipment_tracking_items")?.value;
      const shipments = Array.isArray(raw) ? raw.slice(0, 10).map(item => {
        const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return { shippedAt: null, trackingUrl: safeUrl(row.custom_tracking_link), trackingNumber: typeof row.tracking_number === "string" ? row.tracking_number.slice(0, 100) : null, carrier: typeof row.tracking_provider === "string" ? row.tracking_provider.slice(0, 100) : null };
      }) : [];
      return { contactEmail: order.billing.email, status: order.status, shipments };
    },
  };
}
