import { getRequiredString, mobileJson, mobileOptions } from "@/lib/mobile-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function normalizeReferralCode(value: unknown) {
  return getRequiredString(value, 40)
    .replace(/[^\w-]/g, "")
    .toUpperCase();
}

export function OPTIONS() {
  return mobileOptions();
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return mobileJson({ error: "Invalid referral code." }, { status: 400 });
  }

  const referralCode = normalizeReferralCode(body.referralCode);

  if (!referralCode) {
    return mobileJson({ valid: false }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("members")
      .select("id")
      .eq("referral_code", referralCode)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return mobileJson({ valid: Boolean(data) });
  } catch (error) {
    console.error("Mobile referral validation failed:", error);
    return mobileJson({ error: "Unable to validate the referral code." }, { status: 500 });
  }
}
