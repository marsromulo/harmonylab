"use server";

import { redirect } from "next/navigation";
import { getCartSummary } from "@/lib/cart";
import { createCheckoutOrder, setOrderCheckoutSession } from "@/lib/checkout";
import { ensureCustomerProfile, upsertDefaultCustomerAddress } from "@/lib/customers";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { getSiteUrl, getStripe, getStripeShippingDetails } from "@/lib/stripe";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeReferralCode(value: string) {
  return value.replace(/[^\w-]/g, "").toUpperCase().slice(0, 40);
}

function getPaymentMethod(value: string) {
  return value === "alipay_hk" ? "alipay_hk" : "credit_card";
}

const supportedShippingCountries = new Set(["Hong Kong"]);

function getShippingCountry(value: string) {
  return supportedShippingCountries.has(value) ? value : "Hong Kong";
}

export async function createCheckoutOrderAction(formData: FormData) {
  const cart = await getCartSummary();

  if (cart.lines.length === 0) {
    redirect("/cart");
  }

  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account?error=login-invalid");
  }

  const firstName = getString(formData, "first_name");
  const lastName = getString(formData, "last_name");
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const phone = getString(formData, "phone");
  const email = user.email;
  const shippingAddressLine1 = getString(formData, "shipping_address_line1");
  const shippingAddressLine2 = getString(formData, "shipping_address_line2");
  const shippingCity = getString(formData, "shipping_city");
  const shippingRegion = getString(formData, "shipping_region");
  const shippingPostalCode = getString(formData, "shipping_postal_code");
  const shippingCountry = getShippingCountry(getString(formData, "shipping_country"));
  const deliveryNotes = getString(formData, "delivery_notes");
  const customerAddressId = getString(formData, "customer_address_id");
  const paymentMethod = getPaymentMethod(getString(formData, "payment_method"));
  const referralCode = normalizeReferralCode(getString(formData, "referral_code"));

  if (!firstName || !lastName || !shippingAddressLine1 || !shippingCity) {
    redirect("/checkout?error=shipping-invalid");
  }

  if (paymentMethod === "alipay_hk") {
    redirect("/checkout?error=payment-unavailable");
  }

  const customer = await ensureCustomerProfile(user, { firstName, fullName, lastName, phone });
  const addressPayload = {
    firstName,
    lastName,
    phone: phone || null,
    addressLine1: shippingAddressLine1,
    addressLine2: shippingAddressLine2 || null,
    city: shippingCity,
    region: shippingRegion || null,
    postalCode: shippingPostalCode || null,
    country: shippingCountry,
  };

  if (customerAddressId) {
    const { error: defaultResetError } = await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", customer.id)
      .neq("id", customerAddressId);

    if (defaultResetError) {
      throw new Error(`Unable to update default address: ${defaultResetError.message}`);
    }

    const { error: addressUpdateError } = await supabase
      .from("customer_addresses")
      .update({
        first_name: addressPayload.firstName,
        last_name: addressPayload.lastName,
        phone: addressPayload.phone,
        address_line1: addressPayload.addressLine1,
        address_line2: addressPayload.addressLine2,
        city: addressPayload.city,
        region: addressPayload.region,
        postal_code: addressPayload.postalCode,
        country: addressPayload.country,
        is_default: true,
      })
      .eq("id", customerAddressId)
      .eq("customer_id", customer.id);

    if (addressUpdateError) {
      throw new Error(`Unable to update customer address: ${addressUpdateError.message}`);
    }
  } else {
    await upsertDefaultCustomerAddress(customer.id, addressPayload);
  }

  const currency = cart.lines[0]?.product.currency ?? "HKD";
  const order = await createCheckoutOrder({
    authUserId: user.id,
    customerEmail: email ?? null,
    customerId: customer.id,
    customerName: fullName || customer.fullName || user.email || "Customer",
    deliveryNotes,
    expectedCurrency: currency,
    expectedSubtotalCents: cart.subtotalCents,
    lines: cart.lines.map((line) => ({
      productId: line.product.id,
      quantity: line.quantity,
    })),
    referralCode,
    shippingAddressLine1,
    shippingAddressLine2,
    shippingCity,
    shippingCountry,
    shippingPostalCode,
    shippingRegion,
  });

  const stripe = getStripe();
  const siteUrl = getSiteUrl();
  const stripeLineItems = cart.lines.map((line) => ({
    price_data: {
      currency: line.product.currency.toLowerCase(),
      product_data: {
        name: line.product.name,
      },
      unit_amount: line.product.priceCents,
    },
    quantity: line.quantity,
  }));

  if (order.shippingCents > 0) {
    stripeLineItems.push({
      price_data: {
        currency: order.currency.toLowerCase(),
        product_data: {
          name: "Shipping",
        },
        unit_amount: order.shippingCents,
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: email ?? undefined,
    line_items: stripeLineItems,
    metadata: {
      order_id: order.id,
      order_number: order.orderNumber,
    },
    mode: "payment",
    payment_method_types: ["card"],
    payment_intent_data: {
      shipping: getStripeShippingDetails({
        addressLine1: shippingAddressLine1,
        addressLine2: shippingAddressLine2,
        city: shippingCity,
        country: shippingCountry,
        name: fullName || customer.fullName || user.email,
        phone,
        postalCode: shippingPostalCode,
        region: shippingRegion,
      }),
    },
    success_url: `${siteUrl}/checkout/complete?order=${encodeURIComponent(order.orderNumber)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/checkout?error=payment-cancelled`,
  });

  if (!session.url) {
    throw new Error("Unable to create Stripe checkout session.");
  }

  await setOrderCheckoutSession({
    customerId: customer.id,
    orderId: order.id,
    sessionId: session.id,
  });

  redirect(session.url);
}
