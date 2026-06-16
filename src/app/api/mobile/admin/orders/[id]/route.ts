import { getMobileAdmin, getRequiredString, mobileJson, mobileOptions } from "@/lib/mobile-api";
import { sendPaidOrderEmailsForOrder } from "@/lib/order-email";
import {
  createAndSendCustomerNotification,
  notifyAdminsOrderPaidForOrder,
  notifyCustomerOrderPaidForOrder,
} from "@/lib/push-notifications";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const orderSelect =
  "id,order_number,customer_id,customer_name,customer_email,status,payment_method,payment_provider,payment_status,wonder_order_number,wonder_transaction_id,currency,subtotal_cents,shipping_cents,discount_cents,total_cents,created_at,paid_at,delivery_notes,shipping_address_line1,shipping_address_line2,shipping_city,shipping_region,shipping_country,fulfillment_carrier,fulfillment_tracking_number,fulfillment_tracking_url,fulfillment_notes,shipped_at,delivered_at,referral_code_entered,referral_points_awarded,referral_payout_status,order_items(id,product_name,quantity,unit_price_cents,line_total_cents)";

function getTrackingUrl(value: unknown) {
  const trackingUrl = getRequiredString(value, 500);
  return /^https?:\/\//i.test(trackingUrl) ? trackingUrl : null;
}

async function loadOrder(orderId: string) {
  const supabase = createSupabaseServiceRoleClient();
  return supabase.from("orders").select(orderSelect).eq("id", orderId).maybeSingle();
}

export function OPTIONS() {
  return mobileOptions();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getMobileAdmin(request);

  if (auth.response) {
    return auth.response;
  }

  const { id } = await context.params;

  try {
    const { data, error } = await loadOrder(id);

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return mobileJson({ error: "Order not found." }, { status: 404 });
    }

    return mobileJson({ order: data });
  } catch (error) {
    console.error("Mobile admin order API failed:", error);
    return mobileJson({ error: "Unable to load this order." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getMobileAdmin(request);

  if (auth.response) {
    return auth.response;
  }

  const { id } = await context.params;
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return mobileJson({ error: "Invalid update data." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceRoleClient();

    if (body.action === "referral_payout") {
      if (body.status !== "paid" && body.status !== "unpaid") {
        return mobileJson({ error: "Invalid referral payout status." }, { status: 400 });
      }

      const referralPayoutStatus = body.status;
      const { error } = await supabase
        .from("orders")
        .update({ referral_payout_status: referralPayoutStatus })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    } else if (body.action === "payment_status") {
      if (
        body.status !== "paid" &&
        body.status !== "unpaid" &&
        body.status !== "cancelled"
      ) {
        return mobileJson({ error: "Invalid payment status." }, { status: 400 });
      }

      const paymentStatus = body.status;
      const { data: existingOrder, error: existingOrderError } = await supabase
        .from("orders")
        .select("customer_id,order_number,payment_status,status")
        .eq("id", id)
        .maybeSingle();

      if (existingOrderError || !existingOrder) {
        return mobileJson({ error: "Order not found." }, { status: 404 });
      }

      if (existingOrder.payment_status === "paid" && paymentStatus === "unpaid") {
        return mobileJson(
          { error: "A paid order cannot be changed back to unpaid. Use Cancelled when needed." },
          { status: 409 },
        );
      }

      const nextOrderStatus =
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
        .eq("id", id);

      if (error) {
        const message = error.message.includes("does not have enough stock")
          ? "Payment could not be marked paid because one or more products do not have enough inventory."
          : "Unable to update the payment status.";
        return mobileJson({ error: message }, { status: 409 });
      }

      if (paymentStatus === "paid" && existingOrder.payment_status !== "paid") {
        const results = await Promise.allSettled([
          sendPaidOrderEmailsForOrder(id),
          notifyAdminsOrderPaidForOrder(id),
          notifyCustomerOrderPaidForOrder(id),
        ]);

        for (const result of results) {
          if (result.status === "rejected") {
            console.error("Mobile manual payment status notification failed:", result.reason);
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
          notificationKey: `order-status:${id}:cancelled`,
          orderId: id,
          orderNumber: existingOrder.order_number,
          title: "Order cancelled",
          type: "order_status",
        }).catch((notificationError) => {
          console.error("Unable to send mobile order cancellation notification:", notificationError);
        });
      }
    } else if (body.action === "fulfillment") {
      if (body.status !== "shipped" && body.status !== "delivered") {
        return mobileJson({ error: "Invalid delivery status." }, { status: 400 });
      }

      const status = body.status;
      const { data: existingOrder, error: existingOrderError } = await supabase
        .from("orders")
        .select("customer_id,order_number,status")
        .eq("id", id)
        .maybeSingle();

      if (existingOrderError || !existingOrder) {
        return mobileJson({ error: "Order not found." }, { status: 404 });
      }

      const now = new Date().toISOString();
      const { error } = await supabase
        .from("orders")
        .update({
          status,
          fulfillment_carrier: getRequiredString(body.carrier, 100) || null,
          fulfillment_tracking_number:
            getRequiredString(body.trackingNumber, 150) || null,
          fulfillment_tracking_url: getTrackingUrl(body.trackingUrl),
          fulfillment_notes: getRequiredString(body.notes, 500) || null,
          shipped_at: now,
          delivered_at: status === "delivered" ? now : null,
        })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      if (existingOrder.customer_id && existingOrder.status !== status) {
        const statusLabel = status === "delivered" ? "delivered" : "shipped";
        await createAndSendCustomerNotification({
          body: `Order ${existingOrder.order_number} has been ${statusLabel}. Tap to view the latest details.`,
          customerId: existingOrder.customer_id,
          notificationKey: `order-status:${id}:${status}`,
          orderId: id,
          orderNumber: existingOrder.order_number,
          title: status === "delivered" ? "Order delivered" : "Order shipped",
          type: "order_status",
        }).catch((notificationError) => {
          console.error("Unable to send mobile admin order notification:", notificationError);
        });
      }
    } else {
      return mobileJson({ error: "Unsupported order update." }, { status: 400 });
    }

    const { data, error } = await loadOrder(id);

    if (error || !data) {
      throw new Error(error?.message ?? "Order not found.");
    }

    return mobileJson({ order: data });
  } catch (error) {
    console.error("Mobile admin order update failed:", error);
    return mobileJson({ error: "Unable to update this order." }, { status: 500 });
  }
}
