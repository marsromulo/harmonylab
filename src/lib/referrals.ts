import { cookies } from "next/headers";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const referralCodeCookieName = "harmony_referral_code";
export const referralStatusCookieName = "harmony_referral_status";

export function normalizeReferralCode(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/[^\w-]/g, "").toUpperCase().slice(0, 40);
}

export async function validateMemberReferralCode(value: unknown) {
  const referralCode = normalizeReferralCode(value);

  if (!referralCode) {
    return { referralCode: "", valid: false };
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("members")
    .select("id")
    .eq("referral_code", referralCode)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to validate referral code: ${error.message}`);
  }

  return { referralCode, valid: Boolean(data) };
}

export async function getWebsiteReferralCookies() {
  const cookieStore = await cookies();

  return {
    referralCode: normalizeReferralCode(cookieStore.get(referralCodeCookieName)?.value),
    skipped: cookieStore.get(referralStatusCookieName)?.value === "skipped",
  };
}

export async function getValidatedWebsiteReferralCode() {
  const { referralCode } = await getWebsiteReferralCookies();

  if (!referralCode) {
    return "";
  }

  const result = await validateMemberReferralCode(referralCode);
  return result.valid ? result.referralCode : "";
}
