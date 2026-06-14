import { getMobileAdmin, mobileJson, mobileOptions } from "@/lib/mobile-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export function OPTIONS() {
  return mobileOptions();
}

export async function GET(request: Request) {
  const auth = await getMobileAdmin(request);

  if (auth.response) {
    return auth.response;
  }

  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id,order_number,customer_name,customer_email,status,payment_status,currency,total_cents,referral_code_entered,referral_points_awarded,referral_payout_status,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(error.message);
    }

    return mobileJson({ orders: data ?? [] });
  } catch (error) {
    console.error("Mobile admin orders API failed:", error);
    return mobileJson({ error: "Unable to load admin orders." }, { status: 500 });
  }
}
