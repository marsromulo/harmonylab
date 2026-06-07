import { ensureCustomerProfile } from "@/lib/customers";
import { getMobileUser, mobileJson, mobileOptions } from "@/lib/mobile-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export function OPTIONS() {
  return mobileOptions();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getMobileUser(request);

  if (auth.response) {
    return auth.response;
  }

  const { id } = await context.params;

  try {
    const profile = await ensureCustomerProfile(auth.user);
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id,order_number,status,payment_status,currency,subtotal_cents,shipping_cents,discount_cents,total_cents,created_at,paid_at,delivery_notes,shipping_address_line1,shipping_address_line2,shipping_city,shipping_region,shipping_postal_code,shipping_country,fulfillment_carrier,fulfillment_tracking_number,fulfillment_tracking_url,shipped_at,delivered_at,order_items(id,product_name,quantity,unit_price_cents,line_total_cents)",
      )
      .eq("id", id)
      .eq("customer_id", profile.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return mobileJson({ error: "Order not found." }, { status: 404 });
    }

    return mobileJson({ order: data });
  } catch (error) {
    console.error("Mobile order API failed:", error);
    return mobileJson({ error: "Unable to load this order." }, { status: 500 });
  }
}
