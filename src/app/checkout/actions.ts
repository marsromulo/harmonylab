"use server";

import { redirect } from "next/navigation";
import { getCartSummary } from "@/lib/cart";
import { createCheckoutOrder, setOrderWonderPayment } from "@/lib/checkout";
import { normalizeEmail, normalizeHongKongPhone } from "@/lib/customer-fields";
import { ensureCustomerProfile, upsertDefaultCustomerAddress } from "@/lib/customers";
import { validateMemberReferralCode } from "@/lib/referrals";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { createWonderPaymentLink, getSiteUrl } from "@/lib/wonder";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getPaymentMethod(value: string) {
  if (value === "alipay_hk" || value === "fps") {
    return value;
  }

  return "credit_card";
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
  let {
    data: { user },
  } = await supabase.auth.getUser();
  const checkoutMode = getString(formData, "checkout_mode");

  if (!user && checkoutMode === "guest") {
    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        data: { checkout_type: "guest" },
      },
    });

    if (error || !data.user) {
      redirect("/checkout?error=guest-unavailable");
    }

    user = data.user;
  }

  if (!user) {
    redirect("/checkout?error=login-invalid");
  }

  const firstName = getString(formData, "first_name");
  const lastName = getString(formData, "last_name");
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const phone = normalizeHongKongPhone(getString(formData, "phone"));
  const email = user.is_anonymous
    ? normalizeEmail(getString(formData, "email"))
    : user.email ?? "";
  const shippingAddressLine1 = getString(formData, "shipping_address_line1");
  const shippingAddressLine2 = getString(formData, "shipping_address_line2");
  const shippingCity = getString(formData, "shipping_city");
  const shippingRegion = getString(formData, "shipping_region");
  const shippingPostalCode = getString(formData, "shipping_postal_code");
  const shippingCountry = getShippingCountry(getString(formData, "shipping_country"));
  const deliveryNotes = getString(formData, "delivery_notes");
  const customerAddressId = getString(formData, "customer_address_id");
  const paymentMethod = getPaymentMethod(getString(formData, "payment_method"));
  const enteredReferralCode = getString(formData, "referral_code");

  if (user.is_anonymous && !email) {
    redirect("/checkout?guest=1&error=email-required");
  }

  if (
    !firstName ||
    !lastName ||
    !shippingAddressLine1 ||
    !shippingCity ||
    (user.is_anonymous && !phone)
  ) {
    redirect("/checkout?error=shipping-invalid");
  }

  let referralCode = "";

  if (enteredReferralCode) {
    const referralResult = await validateMemberReferralCode(enteredReferralCode);

    if (!referralResult.valid) {
      redirect(`/checkout?${user.is_anonymous ? "guest=1&" : ""}error=referral-invalid`);
    }

    referralCode = referralResult.referralCode;
  }

  const customer = await ensureCustomerProfile(user, {
    email,
    firstName,
    fullName,
    lastName,
    phone,
    ...(referralCode ? { referralCode } : {}),
  });
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
    customerEmail: email || null,
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

  const siteUrl = getSiteUrl();
  const lineItems = cart.lines.map((line) => ({
    label: line.product.name,
    priceCents: line.product.priceCents,
    quantity: line.quantity,
  }));

  if (order.shippingCents > 0) {
    lineItems.push({
      label: "Shipping",
      priceCents: order.shippingCents,
      quantity: 1,
    });
  }

  const payment = await createWonderPaymentLink({
    callbackUrl: `${siteUrl}/api/wonder/webhook`,
    currency: order.currency,
    lineItems,
    note: `Harmony Lab order ${order.orderNumber}`,
    paymentMethod,
    redirectUrl: `${siteUrl}/checkout/complete?order=${encodeURIComponent(order.orderNumber)}`,
    referenceNumber: order.orderNumber,
    totalCents: order.totalCents,
  });

  await setOrderWonderPayment({
    customerId: customer.id,
    orderId: order.id,
    paymentLink: payment.paymentLink,
    paymentMethod,
    wonderOrderNumber: payment.order.number,
  });

  redirect(payment.paymentLink);
}
