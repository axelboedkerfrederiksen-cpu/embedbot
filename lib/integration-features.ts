// Opt in locally while distribution is being prepared. Production stays hidden
// unless its own build explicitly enables the shop connections.
export const SHOP_CONNECTIONS_VISIBLE = process.env.NEXT_PUBLIC_SHOP_CONNECTIONS_VISIBLE === "true";
