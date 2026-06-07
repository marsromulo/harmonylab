import { ensureCustomerProfile } from "@/lib/customers";
import { getMobileUser, getRequiredString, mobileJson, mobileOptions } from "@/lib/mobile-api";
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
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      supabase
        .from("customer_notifications")
        .select("id,order_id,notification_type,title,body,data,read_at,created_at")
        .eq("customer_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("customer_notifications")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", profile.id)
        .is("read_at", null),
    ]);

    if (error || countError) {
      throw new Error(error?.message ?? countError?.message);
    }

    return mobileJson({
      notifications: data ?? [],
      unreadCount: count ?? 0,
    });
  } catch (error) {
    console.error("Mobile notifications API failed:", error);
    return mobileJson({ error: "Unable to load notifications." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await getMobileUser(request);

  if (auth.response) {
    return auth.response;
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return mobileJson({ error: "Invalid notification data." }, { status: 400 });
  }

  const notificationId = getRequiredString(body.notificationId, 100);
  const orderId = getRequiredString(body.orderId, 100);

  if (!notificationId && !orderId) {
    return mobileJson({ error: "A notification or order is required." }, { status: 400 });
  }

  try {
    const profile = await ensureCustomerProfile(auth.user);
    const supabase = createSupabaseServiceRoleClient();
    let query = supabase
      .from("customer_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("customer_id", profile.id)
      .is("read_at", null);

    query = notificationId ? query.eq("id", notificationId) : query.eq("order_id", orderId);
    const { error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const { count, error: countError } = await supabase
      .from("customer_notifications")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", profile.id)
      .is("read_at", null);

    if (countError) {
      throw new Error(countError.message);
    }

    return mobileJson({ unreadCount: count ?? 0 });
  } catch (error) {
    console.error("Mobile notification update failed:", error);
    return mobileJson({ error: "Unable to update this notification." }, { status: 500 });
  }
}
