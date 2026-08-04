import { requireAdmin } from "@/lib/admin-auth";

export const REFERRAL_REWARD_RATE_KEY = "referral_reward_rate_percent";
export const DEFAULT_FREE_SHIPPING_MINIMUM = 500;

type SiteSettingRow = {
  description: string | null;
  label: string;
  setting_key: string;
  setting_value: unknown;
};

function getNumericSettingValue(value: unknown, fallback = 0) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

type ShippingDiscountRuleRow = {
  minimum_subtotal_cents: number;
};

export async function getAdminSiteSettings() {
  const { supabase } = await requireAdmin();
  const [
    { data: referralData, error: referralError },
    { data: shippingData, error: shippingError },
  ] = await Promise.all([
    supabase
      .from("site_settings")
      .select("setting_key,label,setting_value,description")
      .eq("setting_key", REFERRAL_REWARD_RATE_KEY)
      .maybeSingle(),
    supabase
      .from("discount_rules")
      .select("minimum_subtotal_cents")
      .eq("discount_type", "shipping")
      .eq("calculation_type", "free_shipping")
      .eq("country", "Hong Kong")
      .eq("currency", "HKD")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (referralError || shippingError) {
    throw new Error(
      `Unable to load site settings: ${referralError?.message ?? shippingError?.message}`,
    );
  }

  const referralSetting = referralData as SiteSettingRow | null;
  const shippingRule = shippingData as ShippingDiscountRuleRow | null;

  return {
    freeShipping: {
      description:
        "Orders at or above this subtotal receive free shipping in Hong Kong.",
      label: "Free Shipping Minimum (HK$)",
      minimum:
        shippingRule === null
          ? DEFAULT_FREE_SHIPPING_MINIMUM
          : shippingRule.minimum_subtotal_cents / 100,
    },
    referralReward: {
      description:
        referralSetting?.description ??
        "Percentage of the paid order total converted into whole referral points.",
      label: referralSetting?.label ?? "Referral Reward Rate (%)",
      ratePercent: getNumericSettingValue(referralSetting?.setting_value),
    },
  };
}
