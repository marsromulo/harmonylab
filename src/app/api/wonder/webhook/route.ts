import { completeWonderPayment } from "@/lib/wonder-payment";
import { verifyWonderWebhook, type WonderOrder } from "@/lib/wonder";

export const runtime = "nodejs";

type WonderWebhookBody = {
  correspondence_state?: WonderOrder["correspondence_state"];
  currency?: string;
  data?: {
    order?: WonderOrder;
  };
  initial_total?: number;
  number?: string;
  order?: WonderOrder;
  reference_number?: string;
  state?: string;
};

function isWonderOrder(value: WonderWebhookBody | WonderOrder | undefined): value is WonderOrder {
  return Boolean(
    value &&
      value.number &&
      value.reference_number &&
      value.currency &&
      value.state &&
      value.correspondence_state &&
      typeof value.initial_total === "number",
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const credential = request.headers.get("credential") ?? "";
  const nonce = request.headers.get("nonce") ?? "";
  const signature = request.headers.get("signature") ?? "";
  const uri = new URL(request.url).pathname;

  if (
    !credential ||
    !nonce ||
    !signature ||
    !verifyWonderWebhook({ body, credential, nonce, signature, uri })
  ) {
    return Response.json({ error: "Invalid Wonder webhook signature." }, { status: 401 });
  }

  let payload: WonderWebhookBody;

  try {
    payload = JSON.parse(body) as WonderWebhookBody;
  } catch {
    return Response.json({ error: "Invalid Wonder webhook payload." }, { status: 400 });
  }

  const candidate =
    payload.data?.order ??
    payload.order ??
    (payload.number && payload.reference_number ? (payload as WonderOrder) : undefined);

  if (!isWonderOrder(candidate)) {
    return Response.json({ error: "Wonder order data is missing." }, { status: 400 });
  }

  try {
    await completeWonderPayment(candidate);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process Wonder webhook.";
    console.error(message);
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({ received: true });
}
