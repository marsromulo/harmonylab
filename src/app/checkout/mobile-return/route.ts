import { markCheckoutOrderPaid } from "@/lib/checkout";
import { getSafeMobileReturnUrl } from "@/lib/mobile-checkout-return";
import { getSiteUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function redirectResponse(url: URL) {
  return new Response(null, {
    status: 303,
    headers: {
      "Cache-Control": "no-store",
      Location: url.toString(),
    },
  });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const outcome = requestUrl.searchParams.get("outcome");
  const orderNumber = requestUrl.searchParams.get("order") ?? "";
  const sessionId = requestUrl.searchParams.get("session_id");
  const returnUrl = getSafeMobileReturnUrl(requestUrl.searchParams.get("return_url"));

  if (!returnUrl) {
    const fallback = new URL(
      outcome === "cancel" ? "/checkout?error=payment-cancelled" : "/checkout/success",
      getSiteUrl(),
    );

    if (orderNumber) {
      fallback.searchParams.set("order", orderNumber);
    }

    return redirectResponse(fallback);
  }

  returnUrl.searchParams.set("order", orderNumber);

  if (outcome === "cancel") {
    returnUrl.searchParams.set("outcome", "cancelled");
    return redirectResponse(returnUrl);
  }

  let paymentOutcome = "pending";

  if (sessionId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      const sessionOrderNumber = session.metadata?.order_number;
      const isMatchingOrder =
        !orderNumber || !sessionOrderNumber || sessionOrderNumber === orderNumber;

      if (isMatchingOrder && (await markCheckoutOrderPaid(session))) {
        paymentOutcome = "paid";
      }
    } catch (error) {
      console.warn(
        error instanceof Error ? error.message : "Unable to verify mobile Stripe checkout.",
      );
    }
  }

  returnUrl.searchParams.set("outcome", paymentOutcome);
  return redirectResponse(returnUrl);
}

