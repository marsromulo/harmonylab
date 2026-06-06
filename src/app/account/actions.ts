"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setOrderCheckoutSession } from "@/lib/checkout";
import { ensureCustomerProfile } from "@/lib/customers";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { getSiteUrl, getStripe, getStripeShippingDetails } from "@/lib/stripe";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getRedirectPath(formData: FormData) {
  const redirectTo = getString(formData, "redirect_to");

  if (redirectTo === "/checkout") {
    return "/checkout";
  }

  return "/account";
}

function getRedirectUrl(path: string, key: "error" | "success", value: string) {
  return `${path}?${key}=${encodeURIComponent(value)}`;
}

const supportedShippingCountries = new Set(["Hong Kong"]);

function getShippingCountry(value: string) {
  return supportedShippingCountries.has(value) ? value : "Hong Kong";
}

type PayableOrderRow = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  currency: string;
  payment_status: string;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_cents: number;
  shipping_country: string | null;
  shipping_postal_code: string | null;
  shipping_region: string | null;
  status: string;
};

type PayableOrderItemRow = {
  product_name: string;
  quantity: number;
  unit_price_cents: number;
};

function getAddressPayload(formData: FormData) {
  const firstName = getString(formData, "first_name");
  const lastName = getString(formData, "last_name");
  const addressLine1 = getString(formData, "address_line1");
  const city = getString(formData, "city");

  if (!firstName || !lastName || !addressLine1 || !city) {
    return null;
  }

  return {
    label: getString(formData, "label") || null,
    first_name: firstName,
    last_name: lastName,
    phone: getString(formData, "phone") || null,
    address_line1: addressLine1,
    address_line2: getString(formData, "address_line2") || null,
    city,
    region: getString(formData, "region") || null,
    postal_code: getString(formData, "postal_code") || null,
    country: getShippingCountry(getString(formData, "country")),
    is_default: formData.get("is_default") === "on",
  };
}

async function requireCustomerProfile() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account?error=login-invalid");
  }

  const profile = await ensureCustomerProfile(user);
  return { profile, supabase };
}

async function ensureOneDefaultAddress(customerId: string, addressId?: string) {
  const supabase = await createSupabaseAuthServerClient();
  const query = supabase.from("customer_addresses").update({ is_default: false }).eq("customer_id", customerId);
  const { error } = addressId ? await query.neq("id", addressId) : await query;

  if (error) {
    throw new Error(`Unable to update default addresses: ${error.message}`);
  }
}

export async function registerCustomerAction(formData: FormData) {
  const redirectPath = getRedirectPath(formData);
  const firstName = getString(formData, "first_name");
  const lastName = getString(formData, "last_name");
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const passwordConfirmation = getString(formData, "password_confirmation");
  const phone = getString(formData, "phone");
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  if (!firstName || !lastName || !email || password.length < 8) {
    redirect(getRedirectUrl(redirectPath, "error", "register-invalid"));
  }

  if (password !== passwordConfirmation) {
    redirect(getRedirectUrl(redirectPath, "error", "register-password-mismatch"));
  }

  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        full_name: fullName,
        last_name: lastName,
      },
    },
  });

  if (error) {
    redirect(getRedirectUrl(redirectPath, "error", "register-failed"));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user ?? data.user) {
    try {
      await ensureCustomerProfile(user ?? data.user!, { firstName, fullName, lastName, phone });
    } catch (profileError) {
      console.warn(profileError instanceof Error ? profileError.message : "Unable to create customer profile.");
    }
  }

  redirect(getRedirectUrl(redirectPath, "success", data.session ? "registered" : "confirm-email"));
}

export async function loginCustomerAction(formData: FormData) {
  const redirectPath = getRedirectPath(formData);
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!email || !password) {
    redirect(getRedirectUrl(redirectPath, "error", "login-invalid"));
  }

  const supabase = await createSupabaseAuthServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(getRedirectUrl(redirectPath, "error", "login-failed"));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    try {
      await ensureCustomerProfile(user);
    } catch (profileError) {
      console.warn(profileError instanceof Error ? profileError.message : "Unable to create customer profile.");
    }
  }

  redirect(redirectPath);
}

export async function logoutCustomerAction() {
  const supabase = await createSupabaseAuthServerClient();
  await supabase.auth.signOut();
  redirect("/account");
}

export async function createCustomerAddressAction(formData: FormData) {
  const { profile, supabase } = await requireCustomerProfile();
  const payload = getAddressPayload(formData);

  if (!payload) {
    redirect("/account?error=address-invalid");
  }

  const { count, error: countError } = await supabase
    .from("customer_addresses")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", profile.id);

  if (countError) {
    redirect("/account?error=address-save-failed");
  }

  const shouldBeDefault = payload.is_default || (count ?? 0) === 0;

  if (shouldBeDefault) {
    await ensureOneDefaultAddress(profile.id);
  }

  const { error } = await supabase.from("customer_addresses").insert({
    ...payload,
    customer_id: profile.id,
    is_default: shouldBeDefault,
  });

  if (error) {
    redirect("/account?error=address-save-failed");
  }

  revalidatePath("/account");
  revalidatePath("/checkout");
  redirect("/account?success=address-saved");
}

export async function updateCustomerAddressAction(addressId: string, formData: FormData) {
  const { profile, supabase } = await requireCustomerProfile();
  const payload = getAddressPayload(formData);

  if (!payload) {
    redirect("/account?error=address-invalid");
  }

  if (payload.is_default) {
    await ensureOneDefaultAddress(profile.id, addressId);
  }

  const { error } = await supabase.from("customer_addresses").update(payload).eq("id", addressId).eq("customer_id", profile.id);

  if (error) {
    redirect("/account?error=address-save-failed");
  }

  revalidatePath("/account");
  revalidatePath("/checkout");
  redirect("/account?success=address-saved");
}

export async function deleteCustomerAddressAction(addressId: string) {
  const { profile, supabase } = await requireCustomerProfile();
  const { error } = await supabase.from("customer_addresses").delete().eq("id", addressId).eq("customer_id", profile.id);

  if (error) {
    redirect("/account?error=address-delete-failed");
  }

  revalidatePath("/account");
  revalidatePath("/checkout");
  redirect("/account?success=address-deleted");
}

export async function payPendingOrderAction(orderId: string) {
  const { profile, supabase } = await requireCustomerProfile();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id,order_number,customer_name,customer_email,currency,payment_status,shipping_address_line1,shipping_address_line2,shipping_city,shipping_cents,shipping_country,shipping_postal_code,shipping_region,status",
    )
    .eq("id", orderId)
    .eq("customer_id", profile.id)
    .maybeSingle();

  if (orderError || !order) {
    redirect("/account?error=payment-order-not-found");
  }

  const orderRow = order as unknown as PayableOrderRow;

  if (orderRow.payment_status === "paid" || orderRow.status === "paid") {
    redirect("/account?success=order-already-paid");
  }

  if (orderRow.status === "cancelled" || orderRow.status === "refunded") {
    redirect("/account?error=payment-order-not-payable");
  }

  const { data: items, error: itemError } = await supabase
    .from("order_items")
    .select("product_name,quantity,unit_price_cents")
    .eq("order_id", orderId);

  if (itemError || !items?.length) {
    redirect("/account?error=payment-order-not-payable");
  }

  const stripe = getStripe();
  const siteUrl = getSiteUrl();
  const stripeLineItems = ((items ?? []) as unknown as PayableOrderItemRow[]).map((item) => ({
    price_data: {
      currency: orderRow.currency.toLowerCase(),
      product_data: {
        name: item.product_name,
      },
      unit_amount: item.unit_price_cents,
    },
    quantity: item.quantity,
  }));

  if (orderRow.shipping_cents > 0) {
    stripeLineItems.push({
      price_data: {
        currency: orderRow.currency.toLowerCase(),
        product_data: {
          name: "Shipping",
        },
        unit_amount: orderRow.shipping_cents,
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: orderRow.customer_email ?? profile.email ?? undefined,
    line_items: stripeLineItems,
    metadata: {
      order_id: orderRow.id,
      order_number: orderRow.order_number,
    },
    mode: "payment",
    payment_method_types: ["card"],
    payment_intent_data: {
      shipping: getStripeShippingDetails({
        addressLine1: orderRow.shipping_address_line1,
        addressLine2: orderRow.shipping_address_line2,
        city: orderRow.shipping_city,
        country: orderRow.shipping_country,
        name: orderRow.customer_name ?? profile.fullName ?? profile.email,
        phone: profile.phone,
        postalCode: orderRow.shipping_postal_code,
        region: orderRow.shipping_region,
      }),
    },
    success_url: `${siteUrl}/checkout/success?order=${encodeURIComponent(orderRow.order_number)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/account?error=payment-cancelled`,
  });

  if (!session.url) {
    throw new Error("Unable to create Stripe checkout session.");
  }

  try {
    await setOrderCheckoutSession({
      customerId: profile.id,
      orderId: orderRow.id,
      sessionId: session.id,
    });
  } catch {
    redirect("/account?error=payment-session-failed");
  }

  redirect(session.url);
}
