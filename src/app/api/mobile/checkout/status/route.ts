import { markCheckoutOrderPaid } from "@/lib/checkout";
import { ensureCustomerProfile } from "@/lib/customers";
import { getMobileUser, mobileJson, mobileOptions } from "@/lib/mobile-api";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export function OPTIONS() {
  return mobileOptions();
}

export async function GET(request: Request) {
  const auth = await getMobileUser(request);

  if (auth.response) {
    return auth.response;
  }

  const orderNumber = new URL(request.url).searchParams.get("order")?.trim();

  if (!orderNumber) {
    return mobileJson({ error: "Order number is required." }, { status: 400 });
  }

  try {
    const profile = await ensureCustomerProfile(auth.user);
    const supabase = createSupabaseServiceRoleClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select("id,order_number,payment_status,status,stripe_checkout_session_id")
      .eq("order_number", orderNumber)
      .eq("customer_id", profile.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!order) {
      return mobileJson({ error: "Order not found." }, { status: 404 });
    }

    let paymentStatus = order.payment_status;
    let status = order.status;

    if (order.stripe_checkout_session_id && paymentStatus !== "paid") {
      const stripeSession = await getStripe().checkout.sessions.retrieve(
        order.stripe_checkout_session_id,
      );
      const sessionOrderNumber = stripeSession.metadata?.order_number;

      if (!sessionOrderNumber || sessionOrderNumber === order.order_number) {
        const paid = await markCheckoutOrderPaid(stripeSession);

        if (paid) {
          paymentStatus = "paid";
          status = "paid";
        }
      }
    }

    return mobileJson({
      orderNumber: order.order_number,
      paid: paymentStatus === "paid",
      paymentStatus,
      status,
    });
  } catch (error) {
    console.error("Mobile checkout status failed:", error);
    return mobileJson({ error: "Unable to confirm payment status." }, { status: 500 });
  }
}

