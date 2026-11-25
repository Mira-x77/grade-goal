import { supabase } from "@/integrations/supabase/client";
import {
  CODE_PRICING_CONFIG_KEY,
  DEFAULT_CODE_PRICING,
  parseCodePricing,
  type CodePricingConfig,
} from "@/lib/code-pricing";

export async function fetchCodePricing(): Promise<CodePricingConfig> {
  try {
    const { data, error } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", CODE_PRICING_CONFIG_KEY)
      .maybeSingle();

    if (error || !data?.value) return DEFAULT_CODE_PRICING;
    return parseCodePricing(data.value);
  } catch {
    return DEFAULT_CODE_PRICING;
  }
}
