import type Stripe from "stripe";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type CheckoutOrderLine = {
  productId: string;
  quantity: number;
};

type CreateCheckoutOrderInput = {
  authUserId: string;
  customerEmail: string | null;
  customerId: string;
  customerName: string;
  deliveryNotes: string;
  expectedCurrency: string;
  expectedSubtotalCents: number;
  lines: CheckoutOrderLine[];
  referralCode: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingCountry: string;
  shippingPostalCode: string;
  shippingRegion: string;
};

type CheckoutOrderRow = {
  currency: string;
  id: string;
  order_number: string;
  shipping_cents: number;
};

export async function createCheckoutOrder(input: CreateCheckoutOrderInput) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("create_checkout_order", {
    p_auth_user_id: input.authUserId,
    p_customer_email: input.customerEmail,
    p_customer_id: input.customerId,
    p_customer_name: input.customerName,
    p_delivery_notes: input.deliveryNotes,
    p_expected_currency: input.expectedCurrency,
    p_expected_subtotal_cents: input.expectedSubtotalCents,
    p_items: input.lines.map((line) => ({
      product_id: line.productId,
      quantity: line.quantity,
    })),
    p_referral_code: input.referralCode,
    p_shipping_address_line1: input.shippingAddressLine1,
    p_shipping_address_line2: input.shippingAddressLine2,
    p_shipping_city: input.shippingCity,
    p_shipping_country: input.shippingCountry,
    p_shipping_postal_code: input.shippingPostalCode,
    p_shipping_region: input.shippingRegion,
  });

  const order = Array.isArray(data) ? (data[0] as CheckoutOrderRow | undefined) : undefined;

  if (error || !order) {
    throw new Error(`Unable to create order: ${error?.message ?? "Invalid response."}`);
  }

  return {
    id: order.id,
    currency: order.currency,
    orderNumber: order.order_number,
    shippingCents: order.shipping_cents,
  };
}

export async function setOrderCheckoutSession({
  customerId,
  orderId,
  sessionId,
}: {
  customerId: string;
  orderId: string;
  sessionId: string;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("orders")
    .update({
      payment_method: "credit_card",
      payment_status: "unpaid",
      stripe_checkout_session_id: sessionId,
    })
    .eq("id", orderId)
    .eq("customer_id", customerId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Unable to save Stripe checkout session: ${error?.message ?? "Order not found."}`);
  }
}

export async function markCheckoutOrderPaid(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") {
    return false;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("orders")
    .update({
      paid_at: new Date().toISOString(),
      payment_status: "paid",
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("stripe_checkout_session_id", session.id);

  if (error) {
    throw new Error(`Unable to mark Stripe order paid: ${error.message}`);
  }

  return true;
}
