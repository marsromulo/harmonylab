import type Stripe from "stripe";
import type { DiscountDetail } from "@/lib/discounts";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { WonderOrder, WonderPaymentMethod } from "@/lib/wonder";

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
  discount_cents: number;
  discount_details: DiscountDetail[] | null;
  id: string;
  order_number: string;
  shipping_cents: number;
  total_cents: number;
};

export class CheckoutInventoryError extends Error {
  constructor(message = "One or more products do not have enough stock.") {
    super(message);
    this.name = "CheckoutInventoryError";
  }
}

export function isCheckoutInventoryError(error: unknown): error is CheckoutInventoryError {
  return (
    error instanceof CheckoutInventoryError ||
    (error instanceof Error &&
      (error.message.includes("does not have enough stock") ||
        error.message.includes("unavailable product")))
  );
}

async function validateCheckoutInventory(lines: CheckoutOrderLine[]) {
  const requestedByProductId = new Map<string, number>();

  for (const line of lines) {
    requestedByProductId.set(
      line.productId,
      (requestedByProductId.get(line.productId) ?? 0) + line.quantity,
    );
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,name,inventory_quantity")
    .in("id", [...requestedByProductId.keys()])
    .eq("is_active", true);

  if (error) {
    throw new Error(`Unable to validate product inventory: ${error.message}`);
  }

  const products = new Map(
    (data ?? []).map((product) => [
      product.id,
      {
        inventoryQuantity: product.inventory_quantity,
        name: product.name,
      },
    ]),
  );

  for (const [productId, requestedQuantity] of requestedByProductId) {
    const product = products.get(productId);

    if (!product) {
      throw new CheckoutInventoryError("One or more products are no longer available.");
    }

    if (product.inventoryQuantity < requestedQuantity) {
      throw new CheckoutInventoryError(
        `${product.name} does not have enough stock for the requested quantity.`,
      );
    }
  }
}

export async function createCheckoutOrder(input: CreateCheckoutOrderInput) {
  await validateCheckoutInventory(input.lines);
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
    if (error && isCheckoutInventoryError(new Error(error.message))) {
      throw new CheckoutInventoryError(error.message);
    }

    throw new Error(`Unable to create order: ${error?.message ?? "Invalid response."}`);
  }

  return {
    id: order.id,
    currency: order.currency,
    discountCents: order.discount_cents,
    discountDetails: Array.isArray(order.discount_details) ? order.discount_details : [],
    orderNumber: order.order_number,
    shippingCents: order.shipping_cents,
    totalCents: order.total_cents,
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
      payment_provider: "stripe",
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

export async function setOrderWonderPayment({
  customerId,
  orderId,
  paymentLink,
  paymentMethod,
  wonderOrderNumber,
}: {
  customerId: string;
  orderId: string;
  paymentLink: string;
  paymentMethod: WonderPaymentMethod;
  wonderOrderNumber: string;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("orders")
    .update({
      payment_method: paymentMethod,
      payment_provider: "wonder",
      payment_status: "unpaid",
      wonder_order_number: wonderOrderNumber,
      wonder_payment_link: paymentLink,
    })
    .eq("id", orderId)
    .eq("customer_id", customerId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Unable to save Wonder payment link: ${error?.message ?? "Order not found."}`);
  }
}

export async function markWonderOrderPaid(wonderOrder: WonderOrder) {
  if (
    wonderOrder.correspondence_state !== "paid" &&
    wonderOrder.correspondence_state !== "over_paid"
  ) {
    return null;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: localOrder, error: lookupError } = await supabase
    .from("orders")
    .select("id,currency,payment_method,payment_status,total_cents,wonder_order_number")
    .eq("order_number", wonderOrder.reference_number)
    .maybeSingle();

  if (lookupError || !localOrder) {
    throw new Error(`Unable to find Wonder order: ${lookupError?.message ?? "Order not found."}`);
  }

  const expectedTotal = Number(localOrder.total_cents) / 100;

  if (
    localOrder.currency.toUpperCase() !== wonderOrder.currency.toUpperCase() ||
    Math.abs(expectedTotal - Number(wonderOrder.initial_total)) > 0.001 ||
    (localOrder.wonder_order_number && localOrder.wonder_order_number !== wonderOrder.number)
  ) {
    throw new Error("Wonder payment does not match the local order.");
  }

  if (localOrder.payment_status === "paid") {
    return localOrder.id;
  }

  const transaction = wonderOrder.transactions?.find((candidate) => candidate.success);
  const paymentMethod =
    localOrder.payment_method === "alipay_hk" || localOrder.payment_method === "fps"
      ? localOrder.payment_method
      : transaction?.payment_method ?? localOrder.payment_method ?? "credit_card";
  const { data, error } = await supabase
    .from("orders")
    .update({
      paid_at: new Date().toISOString(),
      payment_status: "paid",
      payment_method: paymentMethod,
      status: "paid",
      wonder_order_number: wonderOrder.number,
      wonder_transaction_id: transaction?.uuid ?? null,
    })
    .eq("id", localOrder.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Unable to mark Wonder order paid: ${error?.message ?? "Order not found."}`);
  }

  return localOrder.id;
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
  const { data, error } = await supabase
    .from("orders")
    .update({
      paid_at: new Date().toISOString(),
      payment_status: "paid",
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("stripe_checkout_session_id", session.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `Unable to mark Stripe order paid: ${error?.message ?? "Order not found."}`,
    );
  }

  return data.id;
}
