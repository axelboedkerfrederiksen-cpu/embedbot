export const PLAN_SLUGS = ["starter", "growth", "scale", "enterprise"] as const;

export type PlanSlug = (typeof PLAN_SLUGS)[number];

export type PlanDefinition = {
  slug: PlanSlug;
  name: string;
  monthlyPriceDkk: number | null;
  answerLimit: number;
  answerLabel: string;
};

export const PLANS: Record<PlanSlug, PlanDefinition> = {
  starter: {
    slug: "starter",
    name: "Starter",
    monthlyPriceDkk: 299,
    answerLimit: 1_000,
    answerLabel: "1.000 AI-svar pr. måned",
  },
  growth: {
    slug: "growth",
    name: "Growth",
    monthlyPriceDkk: 699,
    answerLimit: 5_000,
    answerLabel: "5.000 AI-svar pr. måned",
  },
  scale: {
    slug: "scale",
    name: "Scale",
    monthlyPriceDkk: 1_499,
    answerLimit: 15_000,
    answerLabel: "15.000 AI-svar pr. måned",
  },
  enterprise: {
    slug: "enterprise",
    name: "Enterprise",
    monthlyPriceDkk: null,
    answerLimit: 30_000,
    answerLabel: "Fra 30.000 AI-svar pr. måned",
  },
};

export function normalizePlan(value: unknown): PlanSlug {
  if (typeof value !== "string") {
    return "starter";
  }

  const normalized = value.trim().toLowerCase();
  return PLAN_SLUGS.includes(normalized as PlanSlug)
    ? (normalized as PlanSlug)
    : "starter";
}

export function getPlan(value: unknown) {
  return PLANS[normalizePlan(value)];
}

export function getAnswerLimit(planValue: unknown, overrideValue?: unknown) {
  const plan = getPlan(planValue);
  const override = typeof overrideValue === "number" ? overrideValue : Number(overrideValue);

  if (plan.slug === "enterprise" && Number.isInteger(override) && override >= plan.answerLimit) {
    return override;
  }

  return plan.answerLimit;
}
