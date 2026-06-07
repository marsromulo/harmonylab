import { NextResponse } from "next/server";
import { ensureCustomerProfile } from "@/lib/customers";
import {
  normalizeReferralCode,
  referralCodeCookieName,
  referralStatusCookieName,
  validateMemberReferralCode,
} from "@/lib/referrals";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";

const referralCookieMaxAge = 60 * 60 * 24 * 365;

function getCookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

async function updateCurrentCustomer(referralCode: string | null) {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureCustomerProfile(user, { referralCode });
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid referral code." }, { status: 400 });
  }

  const referralCode = normalizeReferralCode(body.referralCode);
  const cookieOptions = getCookieOptions();

  if (!referralCode) {
    try {
      await updateCurrentCustomer(null);
    } catch (error) {
      console.error("Unable to clear customer referral code:", error);
      return NextResponse.json({ error: "Unable to save your referral preference." }, { status: 500 });
    }

    const response = NextResponse.json({ referralCode: "", skipped: true, valid: true });
    response.cookies.delete(referralCodeCookieName);
    response.cookies.set(referralStatusCookieName, "skipped", cookieOptions);
    return response;
  }

  try {
    const result = await validateMemberReferralCode(referralCode);

    if (!result.valid) {
      return NextResponse.json({
        error: "This referral code was not found. Please contact your referrer for the correct code and try again.",
        referralCode: result.referralCode,
        valid: false,
      });
    }

    await updateCurrentCustomer(result.referralCode);

    const response = NextResponse.json({
      referralCode: result.referralCode,
      skipped: false,
      valid: true,
    });
    response.cookies.set(referralCodeCookieName, result.referralCode, {
      ...cookieOptions,
      maxAge: referralCookieMaxAge,
    });
    response.cookies.delete(referralStatusCookieName);
    return response;
  } catch (error) {
    console.error("Unable to save website referral code:", error);
    return NextResponse.json({ error: "Unable to validate the referral code." }, { status: 500 });
  }
}
