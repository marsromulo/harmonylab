import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeReferralCode(value: unknown) {
  return getString(value, 40)
    .replace(/[^\w-]/g, "")
    .toUpperCase();
}

function normalizeEmail(value: unknown) {
  return getString(value, 254).toLowerCase();
}

export async function POST(request: Request) {
  const expectedSecret = process.env.AINETT_MEMBER_SYNC_SECRET;
  const submittedSecret = request.headers.get("x-ainett-secret");

  if (!expectedSecret || (submittedSecret ?? "").trim() !== expectedSecret.trim()) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const firstName = getString(body.firstName, 80);
  const lastName = getString(body.lastName, 80);
  const email = normalizeEmail(body.email);
  const phone = getString(body.phoneNo, 40);
  const referralCode = normalizeReferralCode(body.referralCode);

  if (!firstName || !lastName || !email || !email.includes("@") || !phone || !referralCode) {
    return Response.json({ ok: false, error: "Missing required fields." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("members")
      .upsert(
        {
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          referral_code: referralCode,
        },
        { onConflict: "referral_code" },
      )
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return Response.json({ ok: true, memberId: data.id });
  } catch (error) {
    console.error("AI.NETT member sync failed:", error);
    return Response.json({ ok: false, error: "Unable to save member." }, { status: 500 });
  }
}
