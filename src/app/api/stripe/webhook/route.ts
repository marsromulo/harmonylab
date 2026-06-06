import type Stripe from "stripe";
import { markCheckoutOrderPaid } from "@/lib/checkout";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!webhookSecret || !signature) {
    return Response.json({ error: "Missing Stripe webhook configuration." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature.";
    return Response.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === "paid") {
      try {
        await markCheckoutOrderPaid(session);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to mark Stripe order paid.";
        console.error(message);
        return Response.json({ error: message }, { status: 500 });
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "expired",
      })
      .eq("stripe_checkout_session_id", session.id);

    if (error) {
      console.error("Unable to mark Stripe checkout session expired:", error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return Response.json({ received: true });
}
