"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { sendPaidOrderEmailsForOrder } from "@/lib/order-email";
import type { OrderStatus } from "@/lib/orders";
import {
  createAndSendCustomerNotification,
  notifyAdminsOrderPaidForOrder,
  notifyCustomerOrderPaidForOrder,
} from "@/lib/push-notifications";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getFulfillmentStatus(value: string): OrderStatus {
  return value === "delivered" ? "delivered" : "shipped";
}

function getReferralPayoutStatus(value: string) {
  return value === "paid" ? "paid" : "unpaid";
}

function getPaymentStatus(value: string) {
  if (value === "paid" || value === "cancelled") {
    return value;
  }

  return "unpaid";
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
  const { data: existingOrder, error: existingOrderError } = await supabase
    .from("orders")
    .select("customer_id,order_number,status")
    .eq("id", orderId)
    .maybeSingle();

  if (existingOrderError || !existingOrder) {
    redirect(`/admin/orders/${orderId}?error=fulfillment-update-failed`);
  }

  const { error } = await supabase.from("orders").update(payload).eq("id", orderId);

  if (error) {
    redirect(`/admin/orders/${orderId}?error=fulfillment-update-failed`);
  }

  if (existingOrder.customer_id && existingOrder.status !== status) {
    const statusLabel = status === "delivered" ? "delivered" : "shipped";

    await createAndSendCustomerNotification({
      body: `Order ${existingOrder.order_number} has been ${statusLabel}. Tap to view the latest details.`,
      customerId: existingOrder.customer_id,
      notificationKey: `order-status:${orderId}:${status}`,
      orderId,
      orderNumber: existingOrder.order_number,
      title: status === "delivered" ? "Order delivered" : "Order shipped",
      type: "order_status",
    }).catch((notificationError) => {
      console.error("Unable to send order status push notification:", notificationError);
    });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}?success=fulfillment-updated`);
}

export async function updateReferralPayoutStatusAction(orderId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const referralPayoutStatus = getReferralPayoutStatus(
    getString(formData, "referral_payout_status"),
  );
  const { error } = await supabase
    .from("orders")
    .update({ referral_payout_status: referralPayoutStatus })
    .eq("id", orderId);

  if (error) {
    redirect(`/admin/orders/${orderId}?error=referral-status-update-failed`);
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}?success=referral-status-updated`);
}

export async function updateOrderPaymentStatusAction(orderId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const paymentStatus = getPaymentStatus(getString(formData, "payment_status"));
  const { data: existingOrder, error: existingOrderError } = await supabase
    .from("orders")
    .select("customer_id,order_number,payment_status,status")
    .eq("id", orderId)
    .maybeSingle();

  if (existingOrderError || !existingOrder) {
    redirect(`/admin/orders/${orderId}?error=payment-status-update-failed`);
  }

  if (existingOrder.payment_status === "paid" && paymentStatus === "unpaid") {
    redirect(`/admin/orders/${orderId}?error=payment-status-paid-locked`);
  }

  const nextOrderStatus: OrderStatus =
    paymentStatus === "cancelled"
      ? "cancelled"
      : paymentStatus === "paid"
        ? ["processing", "shipped", "delivered"].includes(existingOrder.status)
          ? existingOrder.status
          : "paid"
        : existingOrder.status === "cancelled"
          ? "pending"
          : existingOrder.status;
  const { error } = await supabase
    .from("orders")
    .update({
      payment_status: paymentStatus,
      status: nextOrderStatus,
      ...(paymentStatus === "paid" ? { paid_at: new Date().toISOString() } : {}),
    })
    .eq("id", orderId);

  if (error) {
    const errorCode = error.message.includes("does not have enough stock")
      ? "payment-status-stock-failed"
      : "payment-status-update-failed";
    redirect(`/admin/orders/${orderId}?error=${errorCode}`);
  }

  if (paymentStatus === "paid" && existingOrder.payment_status !== "paid") {
    const results = await Promise.allSettled([
      sendPaidOrderEmailsForOrder(orderId),
      notifyAdminsOrderPaidForOrder(orderId),
      notifyCustomerOrderPaidForOrder(orderId),
    ]);

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("Manual payment status notification failed:", result.reason);
      }
    }
  }

  if (
    paymentStatus === "cancelled" &&
    existingOrder.payment_status !== "cancelled" &&
    existingOrder.customer_id
  ) {
    await createAndSendCustomerNotification({
      body: `Order ${existingOrder.order_number} has been cancelled. Contact Harmony Lab if you need assistance.`,
      customerId: existingOrder.customer_id,
      notificationKey: `order-status:${orderId}:cancelled`,
      orderId,
      orderNumber: existingOrder.order_number,
      title: "Order cancelled",
      type: "order_status",
    }).catch((notificationError) => {
      console.error("Unable to send order cancellation notification:", notificationError);
    });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/account");
  redirect(`/admin/orders/${orderId}?success=payment-status-updated`);
}
