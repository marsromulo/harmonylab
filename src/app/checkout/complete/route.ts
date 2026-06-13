import { NextRequest, NextResponse } from "next/server";
import { CART_COOKIE } from "@/lib/cart";
import { verifyAndCompleteWonderPayment } from "@/lib/wonder-payment";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const orderNumber = url.searchParams.get("order") ?? "";
  const returnTo = url.searchParams.get("return_to");
  const successUrl = new URL("/checkout/success", request.url);

  if (orderNumber) {
    successUrl.searchParams.set("order", orderNumber);
  }

  if (!orderNumber) {
    return NextResponse.redirect(new URL("/checkout?error=payment-cancelled", request.url));
  }

  try {
    if (await verifyAndCompleteWonderPayment(orderNumber)) {
      const response = NextResponse.redirect(successUrl);
      response.cookies.delete(CART_COOKIE);
      return response;
    }
  } catch (error) {
    console.warn(error instanceof Error ? error.message : "Unable to verify Wonder payment.");
  }

  const fallback = new URL(
    returnTo === "account" ? "/account?error=payment-cancelled" : "/checkout?error=payment-cancelled",
    request.url,
  );
  return NextResponse.redirect(fallback);
}
