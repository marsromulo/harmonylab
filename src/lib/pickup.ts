import type { CheckoutDiscountQuote } from "@/lib/discounts";

export const OFFICE_PICKUP = {
  label: "Pick up at Harmony Lab office",
  addressLine1: "1606 Corn Yan Centre, 3 Jupiter Street",
  addressLine2: "Harmony Lab office pickup",
  city: "Fortress Hill",
  region: "Hong Kong",
  country: "Hong Kong",
} as const;

export function getPickupQuote(quote: CheckoutDiscountQuote): CheckoutDiscountQuote {
  return {
    ...quote,
    shippingCents: 0,
    totalCents: quote.totalCents - quote.shippingCents,
    discountDetails: quote.discountDetails.filter((detail) => detail.type !== "shipping"),
  };
}
