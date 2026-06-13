"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { REFERRAL_REWARD_RATE_KEY } from "@/lib/site-settings";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateSiteSettingsAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const rewardRate = Number(getString(formData, "referral_reward_rate_percent"));

  if (!Number.isFinite(rewardRate) || rewardRate < 0 || rewardRate > 100) {
    redirect("/admin/settings?error=settings-invalid");
  }

  const { error } = await supabase.from("site_settings").upsert(
    {
      description:
        "Percentage of the paid order total converted into whole referral points.",
      label: "Referral Reward Rate (%)",
      setting_key: REFERRAL_REWARD_RATE_KEY,
      setting_value: Math.round(rewardRate * 100) / 100,
    },
    { onConflict: "setting_key" },
  );

  if (error) {
    redirect("/admin/settings?error=settings-save-failed");
  }

  const { error: awardError } = await supabase.rpc("award_pending_referral_points");

  if (awardError) {
    redirect("/admin/settings?error=settings-award-failed");
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/[id]", "page");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/customers/[id]", "page");
  redirect("/admin/settings?success=settings-saved");
}
