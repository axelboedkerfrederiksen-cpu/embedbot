export function privacyUrl(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048 || /[\s\\]/.test(value)) throw new Error("Angiv en gyldig HTTPS-adresse uden loginoplysninger.");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname || url.hash) throw new Error("Angiv en gyldig HTTPS-adresse uden loginoplysninger eller fragment.");
  return url.href;
}
export function retentionDays(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 3650) throw new Error("Vælg et helt antal dage fra 1 til 3650. Perioden skal godkendes af virksomheden.");
  return value;
}
export function visitorSelector(kind: unknown, value: unknown) {
  if (typeof value !== "string") throw new Error("Angiv en identifikator.");
  const normalized = value.trim().toLowerCase();
  if (kind === "conversation" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(normalized)) return { kind, value: normalized };
  if (kind === "email" && normalized.length <= 254 && /^[a-z0-9._%+\-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(normalized)) return { kind, value: normalized };
  throw new Error("Angiv en gyldig email eller samtalereference.");
}
