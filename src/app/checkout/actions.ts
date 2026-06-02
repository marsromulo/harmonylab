"use server";

import { redirect } from "next/navigation";
import { clearCart, getCartSummary } from "@/lib/cart";
import { ensureCustomerProfile, upsertDefaultCustomerAddress } from "@/lib/customers";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { getSiteUrl, getStripe } from "@/lib/stripe";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `HL-${datePart}-${randomPart}`;
}

function normalizeReferralCode(value: string) {
  return value.replace(/[^\w-]/g, "").toUpperCase().slice(0, 40);
}

function getPaymentMethod(value: string) {
  return value === "alipay_hk" ? "alipay_hk" : "credit_card";
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
  const shippingCountry = getString(formData, "shipping_country") || "Hong Kong";
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
  const shippingCents = 0;
  const discountCents = 0;
  const totalCents = Math.max(cart.subtotalCents + shippingCents - discountCents, 0);
  const orderNumber = getOrderNumber();
  let referralOwnerCustomerId: string | null = null;
  let referralOwnerMemberId: string | null = null;

  if (referralCode) {
    const { data: memberId, error: memberError } = await supabase.rpc("get_referral_owner_member_id", {
      p_referral_code: referralCode,
    });

    if (memberError) {
      console.warn("Unable to resolve member referral code:", memberError.message);
    } else if (typeof memberId === "string") {
      referralOwnerMemberId = memberId;
    }

    if (!referralOwnerMemberId) {
      const { data, error } = await supabase.rpc("get_referral_owner_customer_id", { referral_code: referralCode });

      if (error) {
        console.warn("Unable to resolve customer referral code:", error.message);
      } else if (typeof data === "string" && data !== customer.id) {
        referralOwnerCustomerId = data;
      }
    }
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_id: customer.id,
      customer_email: email,
      customer_name: fullName || customer.fullName || user.email,
      currency,
      delivery_notes: deliveryNotes || null,
      shipping_address_line1: shippingAddressLine1,
      shipping_address_line2: shippingAddressLine2 || null,
      shipping_city: shippingCity,
      shipping_country: shippingCountry,
      shipping_postal_code: shippingPostalCode || null,
      shipping_region: shippingRegion || null,
      referral_code_entered: referralCode || null,
      referral_owner_customer_id: referralOwnerCustomerId,
      referral_owner_member_id: referralOwnerMemberId,
      payment_method: paymentMethod,
      payment_status: "unpaid",
      subtotal_cents: cart.subtotalCents,
      shipping_cents: shippingCents,
      discount_cents: discountCents,
      total_cents: totalCents,
    })
    .select("id,order_number")
    .single();

  if (orderError) {
    throw new Error(`Unable to create order: ${orderError.message}`);
  }

  const { error: itemError } = await supabase.from("order_items").insert(
    cart.lines.map((line) => ({
      order_id: order.id,
      product_id: line.product.id,
      product_name: line.product.name,
      quantity: line.quantity,
      unit_price_cents: line.product.priceCents,
      line_total_cents: line.lineTotalCents,
    })),
  );

  if (itemError) {
    throw new Error(`Unable to create order items: ${itemError.message}`);
  }

  const stripe = getStripe();
  const siteUrl = getSiteUrl();
  const session = await stripe.checkout.sessions.create({
    customer_email: email ?? undefined,
    line_items: cart.lines.map((line) => ({
      price_data: {
        currency: line.product.currency.toLowerCase(),
        product_data: {
          name: line.product.name,
        },
        unit_amount: line.product.priceCents,
      },
      quantity: line.quantity,
    })),
    metadata: {
      order_id: order.id,
      order_number: order.order_number,
    },
    mode: "payment",
    payment_method_types: ["card"],
    success_url: `${siteUrl}/checkout/success?order=${encodeURIComponent(order.order_number)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/checkout?error=payment-cancelled`,
  });

  if (!session.url) {
    throw new Error("Unable to create Stripe checkout session.");
  }

  const { error: paymentError } = await supabase
    .from("orders")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", order.id);

  if (paymentError) {
    throw new Error(`Unable to save Stripe checkout session: ${paymentError.message}`);
  }

  await clearCart();
  redirect(session.url);
}
