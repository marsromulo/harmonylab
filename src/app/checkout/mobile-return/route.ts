import { getSafeMobileReturnUrl } from "@/lib/mobile-checkout-return";
import { getSiteUrl } from "@/lib/wonder";
import { verifyAndCompleteWonderPayment } from "@/lib/wonder-payment";

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
  const orderNumber = requestUrl.searchParams.get("order") ?? "";
  const returnUrl = getSafeMobileReturnUrl(requestUrl.searchParams.get("return_url"));

  if (!returnUrl) {
    const fallback = new URL(
      "/checkout?error=payment-cancelled",
      getSiteUrl(),
    );

    if (orderNumber) {
      fallback.searchParams.set("order", orderNumber);
    }

    return redirectResponse(fallback);
  }

  returnUrl.searchParams.set("order", orderNumber);

  let paymentOutcome = "pending";

  if (orderNumber) {
    try {
      if (await verifyAndCompleteWonderPayment(orderNumber)) {
        paymentOutcome = "paid";
      }
    } catch (error) {
      console.warn(
        error instanceof Error ? error.message : "Unable to verify mobile Wonder checkout.",
      );
    }
  }

  returnUrl.searchParams.set("outcome", paymentOutcome);
  return redirectResponse(returnUrl);
}
