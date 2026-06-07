import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type CustomerPushNotification = {
  body: string;
  customerId: string;
  notificationKey: string;
  orderId: string;
  orderNumber: string;
  title: string;
  type: "order_created" | "order_status";
};

type ExpoPushTicket = {
  details?: {
    error?: string;
  };
  message?: string;
  status: "error" | "ok";
};

function isExpoPushToken(value: string) {
  return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(value);
}

async function disablePushTokens(tokens: string[]) {
  if (tokens.length === 0) {
    return;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("mobile_push_tokens")
    .update({ is_active: false })
    .in("expo_push_token", tokens);

  if (error) {
    console.error("Unable to disable invalid Expo push tokens:", error.message);
  }
}

async function sendExpoPushMessages({
  badge,
  body,
  orderId,
  title,
  tokens,
}: {
  badge: number;
  body: string;
  orderId: string;
  title: string;
  tokens: string[];
}) {
  const validTokens = tokens.filter(isExpoPushToken);

  if (validTokens.length === 0) {
    return;
  }

  for (let index = 0; index < validTokens.length; index += 100) {
    const tokenBatch = validTokens.slice(index, index + 100);
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      body: JSON.stringify(
        tokenBatch.map((to) => ({
          badge,
          body,
          channelId: "orders",
          data: {
            orderId,
            url: `/order/${orderId}`,
          },
          priority: "high",
          sound: "default",
          title,
          to,
        })),
      ),
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
        ...(process.env.EXPO_ACCESS_TOKEN
          ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
          : {}),
      },
      method: "POST",
    });

    const responseBody = (await response.json().catch(() => null)) as
      | { data?: ExpoPushTicket[] }
      | null;

    if (!response.ok || !responseBody?.data) {
      throw new Error(`Expo push service returned ${response.status}.`);
    }

    const invalidTokens = responseBody.data.flatMap((ticket, ticketIndex) =>
      ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered"
        ? [tokenBatch[ticketIndex]]
        : [],
    );
    await disablePushTokens(invalidTokens);

    responseBody.data.forEach((ticket) => {
      if (ticket.status === "error" && ticket.details?.error !== "DeviceNotRegistered") {
        console.error("Expo push notification failed:", ticket.message ?? ticket.details?.error);
      }
    });
  }
}

export async function createAndSendCustomerNotification(
  notification: CustomerPushNotification,
) {
  const supabase = createSupabaseServiceRoleClient();
  const { error: insertError } = await supabase.from("customer_notifications").insert({
    body: notification.body,
    customer_id: notification.customerId,
    data: {
      orderId: notification.orderId,
      orderNumber: notification.orderNumber,
      url: `/order/${notification.orderId}`,
    },
    notification_key: notification.notificationKey,
    notification_type: notification.type,
    order_id: notification.orderId,
    title: notification.title,
  });

  if (insertError?.code === "23505") {
    return;
  }

  if (insertError) {
    throw new Error(`Unable to create customer notification: ${insertError.message}`);
  }

  try {
    const [{ count, error: countError }, { data: tokenRows, error: tokenError }] =
      await Promise.all([
        supabase
          .from("customer_notifications")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", notification.customerId)
          .is("read_at", null),
        supabase
          .from("mobile_push_tokens")
          .select("expo_push_token")
          .eq("customer_id", notification.customerId)
          .eq("is_active", true),
      ]);

    if (countError) {
      throw new Error(`Unable to count unread notifications: ${countError.message}`);
    }

    if (tokenError) {
      throw new Error(`Unable to load mobile push tokens: ${tokenError.message}`);
    }

    await sendExpoPushMessages({
      badge: count ?? 1,
      body: notification.body,
      orderId: notification.orderId,
      title: notification.title,
      tokens: (tokenRows ?? []).map((row) => row.expo_push_token),
    });
  } catch (error) {
    console.error("Unable to deliver Expo push notification:", error);
  }
}

export async function notifyCustomerOrderPaid(checkoutSessionId: string) {
  const supabase = createSupabaseServiceRoleClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id,customer_id,order_number")
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .maybeSingle();

  if (error || !order?.customer_id) {
    if (error) {
      throw new Error(`Unable to load paid order for notification: ${error.message}`);
    }
    return;
  }

  await createAndSendCustomerNotification({
    body: `Payment for order ${order.order_number} was successful. Tap to view the order.`,
    customerId: order.customer_id,
    notificationKey: `order-paid:${order.id}`,
    orderId: order.id,
    orderNumber: order.order_number,
    title: "Order confirmed",
    type: "order_created",
  });
}
