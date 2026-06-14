import { ensureCustomerProfile } from "@/lib/customers";
import { getMobileUser, mobileJson, mobileOptions } from "@/lib/mobile-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export function OPTIONS() {
  return mobileOptions();
}

export async function GET(request: Request) {
  const auth = await getMobileUser(request);

  if (auth.response) {
    return auth.response;
  }

  try {
    const profile = await ensureCustomerProfile(auth.user);
    const supabase = createSupabaseServiceRoleClient();
    const [addressesResult, ordersResult, adminResult] = await Promise.all([
      supabase
        .from("customer_addresses")
        .select(
          "id,label,first_name,last_name,phone,address_line1,address_line2,city,region,postal_code,country,is_default",
        )
        .eq("customer_id", profile.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select(
          "id,order_number,status,payment_status,currency,total_cents,created_at,fulfillment_carrier,fulfillment_tracking_number,fulfillment_tracking_url,order_items(product_name,quantity)",
        )
        .eq("customer_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20),
      auth.user.email
        ? supabase
            .from("admin_users")
            .select("email")
            .ilike("email", auth.user.email)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (addressesResult.error) {
      throw new Error(addressesResult.error.message);
    }

    if (ordersResult.error) {
      throw new Error(ordersResult.error.message);
    }

    if (adminResult.error) {
      throw new Error(adminResult.error.message);
    }

    return mobileJson({
      addresses: addressesResult.data ?? [],
      isAdmin: Boolean(adminResult.data),
      orders: ordersResult.data ?? [],
      profile,
    });
  } catch (error) {
    console.error("Mobile account API failed:", error);
    return mobileJson({ error: "Unable to load your account." }, { status: 500 });
  }
}
