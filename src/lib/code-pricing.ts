export const CODE_PRICING_CONFIG_KEY = "premium_code_pricing";

export interface CodePricingConfig {
  currency: string;
  month1: number;
  month3?: number | null;
  month6?: number | null;
  month12?: number | null;
}

export const DEFAULT_CODE_PRICING: CodePricingConfig = {
  currency: "FCFA",
  month1: 1500,
  month3: 4500,
  month6: 9000,
  month12: 18000,
};

export function parseCodePricing(value: unknown): CodePricingConfig {
  if (!value || typeof value !== "object") return DEFAULT_CODE_PRICING;
  const raw = value as Record<string, unknown>;
  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? v : fallback;
  const optNum = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;

  return {
    currency: typeof raw.currency === "string" && raw.currency.trim() ? raw.currency.trim() : "FCFA",
    month1: num(raw.month1, DEFAULT_CODE_PRICING.month1),
    month3: optNum(raw.month3),
    month6: optNum(raw.month6),
    month12: optNum(raw.month12),
  };
}

export function formatCodePrice(amount: number, currency: string, language: "en" | "fr"): string {
  const formatted = amount.toLocaleString(language === "fr" ? "fr-FR" : "en-US");
  return `${formatted} ${currency}`;
}

export function pricingTiers(pricing: CodePricingConfig): { months: number; price: number }[] {
  const tiers: { months: number; price: number }[] = [{ months: 1, price: pricing.month1 }];
  if (pricing.month3) tiers.push({ months: 3, price: pricing.month3 });
  if (pricing.month6) tiers.push({ months: 6, price: pricing.month6 });
  if (pricing.month12) tiers.push({ months: 12, price: pricing.month12 });
  return tiers;
}
