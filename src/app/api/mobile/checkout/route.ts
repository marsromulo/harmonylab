import { createCheckoutOrder, setOrderWonderPayment } from "@/lib/checkout";
import { normalizeEmail, normalizeHongKongPhone } from "@/lib/customer-fields";
import { ensureCustomerProfile, upsertDefaultCustomerAddress } from "@/lib/customers";
import { getMobileUser, getRequiredString, mobileJson, mobileOptions } from "@/lib/mobile-api";
import {
  getMobileCheckoutServerOrigin,
  getSafeMobileReturnUrl,
} from "@/lib/mobile-checkout-return";
import { validateMemberReferralCode } from "@/lib/referrals";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { createWonderPaymentLink, getSiteUrl } from "@/lib/wonder";

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

function getPaymentMethod(value: unknown) {
  if (value === "alipay_hk" || value === "fps") {
    return value;
  }

  return "credit_card";
}

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
  const paymentMethod = getPaymentMethod(body.paymentMethod);
  const returnUrl = getSafeMobileReturnUrl(body.returnUrl);

  if (lines.length === 0 || !returnUrl) {
    return mobileJson({ error: "Add at least one product and use a valid app return URL." }, { status: 400 });
  }

  try {
    let profile = await ensureCustomerProfile(auth.user);
    const supabase = createSupabaseServiceRoleClient();
    let address: {
      address_line1: string;
      address_line2: string | null;
      city: string;
      country: string;
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
      postal_code: string | null;
      region: string | null;
    };

    if (addressId) {
      const { data, error } = await supabase
        .from("customer_addresses")
        .select(
          "first_name,last_name,phone,address_line1,address_line2,city,region,postal_code,country",
        )
        .eq("id", addressId)
        .eq("customer_id", profile.id)
        .maybeSingle();

      if (error || !data) {
        return mobileJson({ error: "The selected address is unavailable." }, { status: 400 });
      }

      address = data;
    } else {
      const firstName = getRequiredString(body.firstName, 80);
      const lastName = getRequiredString(body.lastName, 80);
      const email = normalizeEmail(getRequiredString(body.email, 254));
      const phone = normalizeHongKongPhone(getRequiredString(body.phone, 20));
      const addressLine1 = getRequiredString(body.addressLine1, 200);
      const city = getRequiredString(body.city, 100);

      if (!firstName || !lastName || !email || !phone || !addressLine1 || !city) {
        return mobileJson(
          { error: "Guest name, email, phone, address, and city are required." },
          { status: 400 },
        );
      }

      profile = await ensureCustomerProfile(auth.user, {
        email,
        firstName,
        fullName: `${firstName} ${lastName}`,
        lastName,
        phone,
      });
      address = {
        address_line1: addressLine1,
        address_line2: getRequiredString(body.addressLine2, 200) || null,
        city,
        country: "Hong Kong",
        first_name: firstName,
        last_name: lastName,
        phone,
        postal_code: getRequiredString(body.postalCode, 30) || null,
        region: getRequiredString(body.region, 100) || null,
      };
      await upsertDefaultCustomerAddress(profile.id, {
        firstName,
        lastName,
        phone,
        addressLine1,
        addressLine2: address.address_line2,
        city,
        region: address.region,
        postalCode: address.postal_code,
        country: address.country,
      });
    }

    const { data: productData, error: productsError } = await supabase
      .from("products")
      .select("id,name,price_cents,currency,inventory_quantity")
      .in(
        "id",
        lines.map((line) => line.productId),
      )
      .eq("is_active", true);

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

    const enteredReferralCode = getRequiredString(body.referralCode, 40)
      .replace(/[^\w-]/g, "")
      .toUpperCase();
    let referralCode = "";

    if (enteredReferralCode) {
      const referralResult = await validateMemberReferralCode(enteredReferralCode);

      if (!referralResult.valid) {
        return mobileJson({ error: "That referral code was not found." }, { status: 400 });
      }

      referralCode = referralResult.referralCode;
    }

    const customerName =
      [address.first_name, address.last_name].filter(Boolean).join(" ") ||
      profile.fullName ||
      profile.email ||
      "Customer";
    const order = await createCheckoutOrder({
      authUserId: auth.user.id,
      customerEmail: profile.email ?? auth.user.email ?? null,
      customerId: profile.id,
      customerName,
      deliveryNotes: getRequiredString(body.deliveryNotes, 500),
      expectedCurrency: currency,
      expectedSubtotalCents: subtotalCents,
      lines,
      referralCode,
      shippingAddressLine1: address.address_line1,
      shippingAddressLine2: address.address_line2 ?? "",
      shippingCity: address.city,
      shippingCountry: address.country,
      shippingPostalCode: address.postal_code ?? "",
      shippingRegion: address.region ?? "",
    });

    const lineItems = lines.map((line) => {
      const product = productsById.get(line.productId)!;

      return {
        label: product.name,
        priceCents: product.price_cents,
        quantity: line.quantity,
      };
    });

    if (order.shippingCents > 0) {
      lineItems.push({
        label: "Shipping",
        priceCents: order.shippingCents,
        quantity: 1,
      });
    }

    const checkoutServerOrigin = getMobileCheckoutServerOrigin(request.url, getSiteUrl());
    const redirectUrl = new URL("/checkout/mobile-return", checkoutServerOrigin);
    redirectUrl.searchParams.set("order", order.orderNumber);
    redirectUrl.searchParams.set("return_url", returnUrl.toString());
    const payment = await createWonderPaymentLink({
      callbackUrl: `${checkoutServerOrigin}/api/wonder/webhook`,
      currency: order.currency,
      lineItems,
      note: `Harmony Lab mobile order ${order.orderNumber}`,
      paymentMethod,
      redirectUrl: redirectUrl.toString(),
      referenceNumber: order.orderNumber,
      totalCents: order.totalCents,
    });

    await setOrderWonderPayment({
      customerId: profile.id,
      orderId: order.id,
      paymentLink: payment.paymentLink,
      paymentMethod,
      wonderOrderNumber: payment.order.number,
    });

    return mobileJson({
      checkoutUrl: payment.paymentLink,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error("Mobile checkout API failed:", error);
    return mobileJson({ error: "Unable to start checkout." }, { status: 500 });
  }
}
