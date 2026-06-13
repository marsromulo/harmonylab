import { requireAdmin } from "@/lib/admin-auth";

export const REFERRAL_REWARD_RATE_KEY = "referral_reward_rate_percent";

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

export async function getAdminReferralRewardSetting() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("site_settings")
    .select("setting_key,label,setting_value,description")
    .eq("setting_key", REFERRAL_REWARD_RATE_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load site settings: ${error.message}`);
  }

  const setting = data as SiteSettingRow | null;

  return {
    description:
      setting?.description ??
      "Percentage of the paid order total converted into whole referral points.",
    label: setting?.label ?? "Referral Reward Rate (%)",
    ratePercent: getNumericSettingValue(setting?.setting_value),
  };
}
