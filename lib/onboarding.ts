export type OnboardingSnapshot = { business_id: string; form: Record<string, string>; step: number };
export function readOnboardingSnapshot(raw: string | null): OnboardingSnapshot | null {
  if (!raw || raw.length > 100000) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.business_id) || !value.form || typeof value.form !== "object" || Array.isArray(value.form)) return null;
    if (!Object.values(value.form).every(v => typeof v === "string")) return null;
    return { business_id: value.business_id, form: value.form, step: Number.isInteger(value.step) && value.step >= 1 && value.step <= 7 ? Math.min(value.step, 6) : 6 };
  } catch { return null; }
}
