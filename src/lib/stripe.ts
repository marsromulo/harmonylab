import Stripe from "stripe";

type StripeAllowedCountry = Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry;
type StripePaymentIntentShipping = Stripe.Checkout.SessionCreateParams.PaymentIntentData.Shipping;

const stripeCountryCodes: Record<string, StripeAllowedCountry> = {
  hk: "HK",
  "hong kong": "HK",
  philippines: "PH",
  ph: "PH",
};

export function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  return new Stripe(stripeSecretKey);
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export function getStripeAllowedCountry(country: string | null | undefined) {
  const normalizedCountry = (country ?? "").trim().toLowerCase();
  return stripeCountryCodes[normalizedCountry] ?? "HK";
}

export function getStripeShippingDetails({
  addressLine1,
  addressLine2,
  city,
  country,
  name,
  phone,
  postalCode,
  region,
}: {
  addressLine1: string | null | undefined;
  addressLine2?: string | null;
  city: string | null | undefined;
  country: string | null | undefined;
  name: string | null | undefined;
  phone?: string | null;
  postalCode?: string | null;
  region?: string | null;
}): StripePaymentIntentShipping | undefined {
  const line1 = addressLine1?.trim();
  const recipientName = name?.trim();

  if (!line1 || !recipientName) {
    return undefined;
  }

  return {
    address: {
      city: city?.trim() || undefined,
      country: getStripeAllowedCountry(country),
      line1,
      line2: addressLine2?.trim() || undefined,
      postal_code: postalCode?.trim() || undefined,
      state: region?.trim() || undefined,
    },
    name: recipientName,
    phone: phone?.trim() || undefined,
  };
}
