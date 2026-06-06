import { createCheckoutOrder, setOrderCheckoutSession } from "@/lib/checkout";
import { ensureCustomerProfile } from "@/lib/customers";
import { getMobileUser, getRequiredString, mobileJson, mobileOptions } from "@/lib/mobile-api";
import {
  getMobileCheckoutServerOrigin,
  getSafeMobileReturnUrl,
} from "@/lib/mobile-checkout-return";
import { getSiteUrl, getStripe, getStripeShippingDetails } from "@/lib/stripe";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type CartLine = {
  productId: string;
  quantity: number;
};

type ProductRow = {
  currency: string;
  id: string;
  inventory_quantity: number;
  name: string;
  price_cents: number;
};

function normalizeLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const quantities = new Map<string, number>();

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const productId = "productId" in item && typeof item.productId === "string" ? item.productId : "";
    const quantity =
      "quantity" in item && typeof item.quantity === "number" && Number.isInteger(item.quantity)
        ? item.quantity
        : 0;

    if (productId && quantity > 0) {
      quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
    }
  }

  return [...quantities.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .filter((line) => line.quantity <= 20);
}

export function OPTIONS() {
  return mobileOptions();
}

export async function POST(request: Request) {
  const auth = await getMobileUser(request);

  if (auth.response) {
    return auth.response;
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return mobileJson({ error: "Invalid checkout data." }, { status: 400 });
  }

  const addressId = getRequiredString(body.addressId, 100);
  const lines = normalizeLines(body.items);
  const returnUrl = getSafeMobileReturnUrl(body.returnUrl);

  if (!addressId || lines.length === 0 || !returnUrl) {
    return mobileJson(
      { error: "Choose an address, add at least one product, and use a valid app return URL." },
      { status: 400 },
    );
  }

  try {
    const profile = await ensureCustomerProfile(auth.user);
    const supabase = createSupabaseServiceRoleClient();
    const [{ data: address, error: addressError }, { data: productData, error: productsError }] =
      await Promise.all([
        supabase
          .from("customer_addresses")
          .select(
            "first_name,last_name,phone,address_line1,address_line2,city,region,postal_code,country",
          )
          .eq("id", addressId)
          .eq("customer_id", profile.id)
          .maybeSingle(),
        supabase
          .from("products")
          .select("id,name,price_cents,currency,inventory_quantity")
          .in(
            "id",
            lines.map((line) => line.productId),
          )
          .eq("is_active", true),
      ]);

    if (addressError || !address) {
      return mobileJson({ error: "The selected address is unavailable." }, { status: 400 });
    }

    if (productsError) {
      throw new Error(productsError.message);
    }

    const products = (productData ?? []) as ProductRow[];
    const productsById = new Map(products.map((product) => [product.id, product]));

    if (products.length !== lines.length) {
      return mobileJson({ error: "One or more products are unavailable." }, { status: 400 });
    }

    let currency = "";
    let subtotalCents = 0;

    for (const line of lines) {
      const product = productsById.get(line.productId);

      if (!product || product.inventory_quantity < line.quantity) {
        return mobileJson({ error: "One or more products do not have enough stock." }, { status: 400 });
      }

      if (currency && currency !== product.currency) {
        return mobileJson({ error: "Products must use the same currency." }, { status: 400 });
      }

      currency = product.currency;
      subtotalCents += product.price_cents * line.quantity;
    }

    const customerName =
      [address.first_name, address.last_name].filter(Boolean).join(" ") ||
      profile.fullName ||
      auth.user.email ||
      "Customer";
    const order = await createCheckoutOrder({
      authUserId: auth.user.id,
      customerEmail: auth.user.email ?? null,
      customerId: profile.id,
      customerName,
      deliveryNotes: getRequiredString(body.deliveryNotes, 500),
      expectedCurrency: currency,
      expectedSubtotalCents: subtotalCents,
      lines,
      referralCode: getRequiredString(body.referralCode, 40)
        .replace(/[^\w-]/g, "")
        .toUpperCase(),
      shippingAddressLine1: address.address_line1,
      shippingAddressLine2: address.address_line2 ?? "",
      shippingCity: address.city,
      shippingCountry: address.country,
      shippingPostalCode: address.postal_code ?? "",
      shippingRegion: address.region ?? "",
    });

    const stripe = getStripe();
    const stripeLineItems = lines.map((line) => {
      const product = productsById.get(line.productId)!;

      return {
        price_data: {
          currency: product.currency.toLowerCase(),
          product_data: { name: product.name },
          unit_amount: product.price_cents,
        },
        quantity: line.quantity,
      };
    });

    if (order.shippingCents > 0) {
      stripeLineItems.push({
        price_data: {
          currency: order.currency.toLowerCase(),
          product_data: { name: "Shipping" },
          unit_amount: order.shippingCents,
        },
        quantity: 1,
      });
    }

    const checkoutServerOrigin = getMobileCheckoutServerOrigin(request.url, getSiteUrl());
    const successUrl = new URL("/checkout/mobile-return", checkoutServerOrigin);
    successUrl.searchParams.set("outcome", "success");
    successUrl.searchParams.set("order", order.orderNumber);
    successUrl.searchParams.set("return_url", returnUrl.toString());
    const cancelUrl = new URL("/checkout/mobile-return", checkoutServerOrigin);
    cancelUrl.searchParams.set("outcome", "cancel");
    cancelUrl.searchParams.set("order", order.orderNumber);
    cancelUrl.searchParams.set("return_url", returnUrl.toString());
    const session = await stripe.checkout.sessions.create({
      customer_email: auth.user.email ?? undefined,
      line_items: stripeLineItems,
      metadata: {
        order_id: order.id,
        order_number: order.orderNumber,
        source: "mobile",
      },
      mode: "payment",
      payment_method_types: ["card"],
      payment_intent_data: {
        shipping: getStripeShippingDetails({
          addressLine1: address.address_line1,
          addressLine2: address.address_line2,
          city: address.city,
          country: address.country,
          name: customerName,
          phone: address.phone,
          postalCode: address.postal_code,
          region: address.region,
        }),
      },
      success_url: `${successUrl.toString()}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl.toString(),
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    await setOrderCheckoutSession({
      customerId: profile.id,
      orderId: order.id,
      sessionId: session.id,
    });

    return mobileJson({
      checkoutUrl: session.url,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error("Mobile checkout API failed:", error);
    return mobileJson({ error: "Unable to start checkout." }, { status: 500 });
  }
}
