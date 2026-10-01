import { shopifyAdapter, type ShopifyConfig } from "./shopify.ts";
import { wooCommerceAdapter, type WooCommerceConfig } from "./woocommerce.ts";
import type { CommerceAdapter, ProductQuery, ProductResult } from "./types.ts";
export type CommerceConfig = ShopifyConfig | WooCommerceConfig;
export function adapterFor(config: CommerceConfig): CommerceAdapter {
  if (config.platform === "shopify") return shopifyAdapter(config);
  if (config.platform === "woocommerce") return wooCommerceAdapter(config);
  throw new Error("Unsupported commerce platform");
}
const cache = new Map<string, { expires: number; result: ProductResult }>();
export async function cachedProducts(tenant: string, revision: string, adapter: CommerceAdapter, query: ProductQuery, now = Date.now()): Promise<ProductResult> {
  const key = JSON.stringify([tenant, revision, query]);
  const found = cache.get(key);
  if (found && found.expires > now) return structuredClone(found.result);
  const loaded = await adapter.searchProducts(query);
  if (query.variant) {
    const requested = query.variant.toLocaleLowerCase();
    loaded.products = loaded.products.map(product => {
      const match = product.variants.find(v => v.options.some(o => o.value.toLocaleLowerCase() === requested) || v.name.toLocaleLowerCase() === requested);
      return { ...product, requestedVariant: { value: query.variant!, id: match?.id || null, complete: product.variantsComplete } };
    });
  }
  const result = { ...loaded, fetchedAt: new Date(now).toISOString(), cacheSeconds: 30 };
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  cache.set(key, { expires: now + 30000, result });
  return structuredClone(result);
}
