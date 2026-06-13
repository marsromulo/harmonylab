import { getCartSummary } from "@/lib/cart";
import { getCheckoutDiscountQuote } from "@/lib/discounts";

export async function POST(request: Request) {
  let body: { referralCode?: unknown };

  try {
    body = (await request.json()) as { referralCode?: unknown };
  } catch {
    return Response.json({ error: "Invalid quote request." }, { status: 400 });
  }

  const cart = await getCartSummary();

  if (cart.lines.length === 0) {
    return Response.json({
      discountCents: 0,
      discountDetails: [],
      shippingCents: 0,
      totalCents: 0,
    });
  }

  const currency = cart.lines[0]?.product.currency ?? "HKD";
  const referralCode =
    typeof body.referralCode === "string" ? body.referralCode.slice(0, 40) : "";

  try {
    const quote = await getCheckoutDiscountQuote({
      country: "Hong Kong",
      currency,
      referralCode,
      subtotalCents: cart.subtotalCents,
    });
    return Response.json(quote);
  } catch (error) {
    console.error("Checkout quote failed:", error);
    return Response.json({ error: "Unable to calculate checkout total." }, { status: 500 });
  }
}
