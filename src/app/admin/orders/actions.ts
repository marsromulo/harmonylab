"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import type { OrderStatus } from "@/lib/orders";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getFulfillmentStatus(value: string): OrderStatus {
  return value === "delivered" ? "delivered" : "shipped";
}

function getTrackingUrl(value: string) {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return null;
}

export async function updateOrderFulfillmentAction(orderId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const status = getFulfillmentStatus(getString(formData, "status"));
  const trackingUrl = getTrackingUrl(getString(formData, "tracking_url"));
  const now = new Date().toISOString();
  const payload = {
    status,
    fulfillment_carrier: getString(formData, "carrier") || null,
    fulfillment_tracking_number: getString(formData, "tracking_number") || null,
    fulfillment_tracking_url: trackingUrl,
    fulfillment_notes: getString(formData, "fulfillment_notes") || null,
    shipped_at: now,
    ...(status === "delivered" ? { delivered_at: now } : {}),
  };
  const { error } = await supabase.from("orders").update(payload).eq("id", orderId);

  if (error) {
    redirect(`/admin/orders/${orderId}?error=fulfillment-update-failed`);
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}?success=fulfillment-updated`);
}
