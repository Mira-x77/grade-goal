import { useEffect, useState } from "react";
import { DEFAULT_CODE_PRICING, type CodePricingConfig } from "@/lib/code-pricing";
import { fetchCodePricing } from "@/services/appConfigService";

export function useCodePricing() {
  const [pricing, setPricing] = useState<CodePricingConfig>(DEFAULT_CODE_PRICING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCodePricing()
      .then((config) => {
        if (!cancelled) setPricing(config);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { pricing, loading };
}
