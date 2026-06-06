import { NextRequest, NextResponse } from "next/server";
import { CART_COOKIE } from "@/lib/cart";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const orderNumber = url.searchParams.get("order") ?? "";
  const sessionId = url.searchParams.get("session_id");
  const successUrl = new URL("/checkout/success", request.url);

  if (orderNumber) {
    successUrl.searchParams.set("order", orderNumber);
  }

  const response = NextResponse.redirect(successUrl);

  if (!sessionId) {
    return response;
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const sessionOrderNumber = session.metadata?.order_number;
    const isMatchingOrder = !orderNumber || !sessionOrderNumber || sessionOrderNumber === orderNumber;

    if (session.payment_status === "paid" && isMatchingOrder) {
      response.cookies.delete(CART_COOKIE);
    }
  } catch (error) {
    console.warn(error instanceof Error ? error.message : "Unable to verify Stripe checkout session.");
  }

  return response;
}
