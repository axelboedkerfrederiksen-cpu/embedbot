/** Branding fields shared by onboarding, the dashboard and the public config. */
export const APPEARANCE_DEFAULTS: Record<string, string> = {
  primary_color: "#ffffff", secondary_color: "#f6f3ed", chat_icon_color: "#232321",
  font_choice: "Inter", chat_outline_enabled: "false", chat_outline_color: "#232321",
  chat_outline_width: "1", chat_outline_opacity: "20", widget_opacity: "100",
  logo_url: "", logo_data_url: "", logo_file_name: "",
};
export const APPEARANCE_KEYS = Object.keys(APPEARANCE_DEFAULTS);
export const WIDGET_FONTS = ["Inter", "DM Sans", "Poppins", "Lora"];
export const LOGO_MAX_BYTES = 256 * 1024;
export const APPEARANCE_PRESETS = [
  { name: "Nordisk", description: "Lyst og roligt", values: { primary_color: "#ffffff", secondary_color: "#f3f1ec", chat_icon_color: "#232321", font_choice: "Inter", chat_outline_enabled: "true", chat_outline_color: "#232321", chat_outline_width: "1", chat_outline_opacity: "15", widget_opacity: "100" } },
  { name: "Botanisk", description: "Varmt og naturligt", values: { primary_color: "#245c45", secondary_color: "#edf3ed", chat_icon_color: "#245c45", font_choice: "DM Sans", chat_outline_enabled: "false", chat_outline_color: "#245c45", chat_outline_width: "1", chat_outline_opacity: "20", widget_opacity: "100" } },
  { name: "Klassisk", description: "En diskret karakter", values: { primary_color: "#292b38", secondary_color: "#f0edf6", chat_icon_color: "#292b38", font_choice: "Lora", chat_outline_enabled: "true", chat_outline_color: "#292b38", chat_outline_width: "1", chat_outline_opacity: "20", widget_opacity: "100" } },
];

export function appearanceDraft(input: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(APPEARANCE_KEYS.map(key => {
    const value = key === "chat_icon_color" ? input.chat_icon_color || input.fab_color : input[key];
    return [key, value === undefined || value === null || value === "" ? APPEARANCE_DEFAULTS[key] : String(value)];
  }));
}

export function validLogoSource(value: string): boolean {
  if (!value) return true;
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    return value.length <= Math.ceil(LOGO_MAX_BYTES / 3) * 4 + 40;
  }
  try { const url = new URL(value); return value.length <= 2048 && url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}

/** Reject invalid edits instead of claiming to save settings that cannot render. */
export function validateAppearance(input: Record<string, unknown>): string | null {
  for (const key of ["primary_color", "secondary_color", "chat_icon_color", "fab_color", "chat_outline_color"]) {
    if (input[key] && (typeof input[key] !== "string" || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(input[key] as string))) return "Vælg en gyldig farve, fx #245c45.";
  }
  if (input.font_choice && !WIDGET_FONTS.includes(String(input.font_choice))) return "Vælg en af de fire skrifttyper.";
  if (input.chat_outline_enabled !== undefined && !["true", "false", ""].includes(String(input.chat_outline_enabled))) return "Vælg om rammen skal være slået til eller fra.";
  for (const [key, min, max] of [["chat_outline_width", 0, 6], ["chat_outline_opacity", 0, 100], ["widget_opacity", 40, 100]] as const) {
    const value = input[key];
    if (value !== undefined && value !== "" && (!Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max)) return "En af designværdierne er uden for det tilladte interval.";
  }
  for (const key of ["logo_url", "logo_data_url"]) {
    if (input[key] !== undefined && (typeof input[key] !== "string" || !validLogoSource(input[key] as string))) return "Brug et PNG-, JPG- eller WebP-logo på højst 256 KB eller et sikkert https-link.";
  }
  if (typeof input.logo_file_name === "string" && input.logo_file_name.length > 200) return "Logoets filnavn er for langt.";
  return null;
}
