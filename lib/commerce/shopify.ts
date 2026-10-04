import { timingSafeEqual } from "node:crypto";
import { shopJson } from "./http.ts";
import { money, safeUrl, type CommerceAdapter, type Product, type Variant } from "./types.ts";
export type ShopifyConfig = { platform: "shopify"; domain: string; adminToken: string; apiVersion?: string; refreshToken?: string; expiresAt?: number; refreshExpiresAt?: number };
export const SHOPIFY_SCOPES = ["read_products", "read_inventory", "read_orders"];
export const validShopDomain = (domain: string) => /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain);
const PRODUCTS = `query Products($query: String!) {
  shop { currencyCode }
  products(first: 6, query: $query) { pageInfo { hasNextPage } nodes {
    id title description onlineStoreUrl handle publishedAt status totalInventory featuredImage { url }
    variants(first: 100) { pageInfo { hasNextPage } nodes { id title price inventoryQuantity inventoryPolicy inventoryItem { tracked } selectedOptions { name value } } }
  } }
}`;
const ORDERS = `query OrderStatus($query: String!) {
  orders(first: 10, query: $query) { nodes { name email cancelledAt displayFulfillmentStatus
    fulfillments(first: 10) { status inTransitAt trackingInfo { url number company } } } }
}`;
type ShopifyProduct = { id: string; title: string; description: string; onlineStoreUrl: string | null; handle: string; publishedAt: string | null; status: string; totalInventory: number | null; featuredImage?: { url: string } | null; variants: { pageInfo: { hasNextPage: boolean }; nodes: { id: string; title: string; price: string; inventoryQuantity: number | null; inventoryPolicy: string; inventoryItem: { tracked: boolean }; selectedOptions: { name: string; value: string }[] }[] } };
type ShopifyOrder = { name: string; email: string | null; cancelledAt: string | null; displayFulfillmentStatus: string; fulfillments: { status: string; inTransitAt: string | null; trackingInfo: { url: string | null; number: string | null; company: string | null }[] }[] };
export function equalEmail(a: string | null, b: string) {
  const first = Buffer.from((a || "").trim().toLowerCase()), second = Buffer.from(b.trim().toLowerCase());
  return first.length === second.length && timingSafeEqual(first, second);
}
export function shopifyAdapter(config: ShopifyConfig, transport: typeof shopJson = shopJson): CommerceAdapter {
  if (!validShopDomain(config.domain) || !config.adminToken) throw new Error("Invalid commerce configuration");
  const version = config.apiVersion || "2026-10";
  if (!/^20\d{2}-(01|04|07|10)$/.test(version)) throw new Error("Invalid commerce configuration");
  async function graphql<T>(query: string, variables: unknown): Promise<T> {
    const result = await transport<{ data?: T; errors?: unknown[] }>(new URL(`https://${config.domain}/admin/api/${version}/graphql.json`), { "X-Shopify-Access-Token": config.adminToken }, { query, variables });
    if (!result.data || result.errors?.length) throw new Error("Commerce unavailable");
    return result.data;
  }
  return {
    productsEnabled: true, ordersEnabled: true,
    async testConnection() {
      const result = await graphql<{ currentAppInstallation: { accessScopes: { handle: string }[] } }>(`query { currentAppInstallation { accessScopes { handle } } }`, {});
      const scopes = result.currentAppInstallation.accessScopes.map(s => s.handle);
      if (SHOPIFY_SCOPES.some(s => !scopes.includes(s)) || scopes.some(s => s.startsWith("write_"))) throw new Error("Read-only scopes required");
      // Actually exercise the three required resources, including protected email.
      await graphql(`query { shop { name } products(first: 1) { nodes { id variants(first: 1) { nodes { inventoryQuantity } } } } orders(first: 1) { nodes { id email } } }`, {});
    },
    async searchProducts(input) {
      // Never interpolate raw provider syntax supplied by a model/customer.
      const words = input.query.split(/\s+/).filter(Boolean).map(w => `title:*${w.replace(/[^\p{L}\p{N}-]/gu, "")}*`);
      const query = ["status:active", ...words, ...(input.vendor ? [`vendor:"${input.vendor.replace(/["\\]/g, "")}"`] : [])].join(" AND ");
      const result = await graphql<{ shop: { currencyCode: string }; products: { nodes: ShopifyProduct[]; pageInfo: { hasNextPage: boolean } } }>(PRODUCTS, { query });
      const currency = result.shop.currencyCode;
      if (input.currency && input.currency !== currency) throw new Error("Currency unavailable");
      const products: Product[] = result.products.nodes.flatMap(p => {
        // Development stores can return no URL for an already published product.
        // Only derive a storefront link when Shopify confirms publication; never
        // expose active-but-hidden products or an admin/preview URL.
        const publishedAt = p.publishedAt ? Date.parse(p.publishedAt) : Number.NaN;
        const published = Number.isFinite(publishedAt) && publishedAt <= Date.now();
        const url = safeUrl(p.onlineStoreUrl) || (p.onlineStoreUrl === null && published && /^[a-z0-9][a-z0-9-]*$/.test(p.handle)
          ? `https://${config.domain}/products/${p.handle}` : null);
        if (!url || p.status !== "ACTIVE") return [];
        const variants: Variant[] = p.variants.nodes.map(v => ({ id: v.id, name: v.title.slice(0, 200), options: v.selectedOptions, price: money(v.price), currency, stock: v.inventoryItem.tracked && typeof v.inventoryQuantity === "number" ? v.inventoryQuantity : null, available: v.inventoryItem.tracked && typeof v.inventoryQuantity === "number" ? v.inventoryQuantity > 0 || v.inventoryPolicy === "CONTINUE" : null }));
        const matching = variants.filter(v => v.price !== null && (input.minPrice === undefined || Number(v.price) >= input.minPrice) && (input.maxPrice === undefined || Number(v.price) <= input.maxPrice));
        if ((input.minPrice !== undefined || input.maxPrice !== undefined) && !matching.length) return [];
        const prices = variants.flatMap(v => v.price !== null ? [Number(v.price)] : []);
        const complete = !p.variants.pageInfo.hasNextPage;
        return [{ id: p.id, name: p.title.slice(0, 200), description: p.description.slice(0, 500), image: safeUrl(p.featuredImage?.url), url, price: complete && prices.length ? String(Math.min(...prices)) : null, currency, available: variants.some(v => v.available === true) ? true : complete && variants.length && variants.every(v => v.available === false) ? false : null, stock: complete && p.variants.nodes.every(v => v.inventoryItem.tracked) && typeof p.totalInventory === "number" ? p.totalInventory : null, variants, variantsComplete: complete }];
      });
      return { products: products.slice(0, 5), more: result.products.pageInfo.hasNextPage || products.length > 5 };
    },
    async lookupOrder(input) {
      const name = input.number.startsWith("#") ? input.number : `#${input.number}`;
      const result = await graphql<{ orders: { nodes: ShopifyOrder[] } }>(ORDERS, { query: `name:"${name}"` });
      const matches = result.orders.nodes.filter(o => o.name === name && equalEmail(o.email, input.email));
      if (matches.length !== 1 || !matches[0].email) return null;
      const order = matches[0];
      return { contactEmail: order.email!, status: order.cancelledAt ? "CANCELLED" : order.displayFulfillmentStatus, shipments: order.fulfillments.filter(f => f.status === "SUCCESS").flatMap(f => f.trackingInfo.length ? f.trackingInfo.map(t => ({ shippedAt: f.inTransitAt || null, trackingUrl: safeUrl(t.url), trackingNumber: t.number, carrier: t.company })) : [{ shippedAt: f.inTransitAt || null, trackingUrl: null, trackingNumber: null, carrier: null }]).slice(0, 10) };
    },
  };
}
