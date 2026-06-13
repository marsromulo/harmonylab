import sgMail from "@sendgrid/mail";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type OrderEmailRecipient = "admin" | "customer";

type EmailOrder = {
  id: string;
  order_number: string;
  customer_email: string | null;
  customer_name: string | null;
  currency: string;
  delivery_notes: string | null;
  discount_cents: number;
  paid_at: string | null;
  referral_code_entered: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
  shipping_cents: number;
  shipping_postal_code: string | null;
  shipping_region: string | null;
  subtotal_cents: number;
  total_cents: number;
};

type EmailOrderItem = {
  line_total_cents: number;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
};

type OrderEmailData = {
  items: EmailOrderItem[];
  order: EmailOrder;
};

type EmailMessage = {
  html: string;
  subject: string;
  text: string;
};

function getSendGridConfiguration() {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim();

  if (!apiKey || !fromEmail) {
    throw new Error("Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL.");
  }

  sgMail.setApiKey(apiKey);

  return {
    from: {
      email: fromEmail,
      name: "Harmony Lab",
    },
    replyTo: {
      email: "harmonylabhk@gmail.com",
      name: "Harmony Lab",
    },
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[character];
  });
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-HK", {
    currency,
    style: "currency",
  }).format(cents / 100);
}

function formatDate(value: string | null) {
  return new Intl.DateTimeFormat("en-HK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Hong_Kong",
  }).format(value ? new Date(value) : new Date());
}

function getShippingAddress(order: EmailOrder) {
  return [
    order.shipping_address_line1,
    order.shipping_address_line2,
    order.shipping_city,
    order.shipping_region,
    order.shipping_postal_code,
    order.shipping_country,
  ].filter((part): part is string => Boolean(part?.trim()));
}

function getItemRows(data: OrderEmailData) {
  return data.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #e6e6e6;">${escapeHtml(item.product_name)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e6e6e6;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e6e6e6;text-align:right;">${escapeHtml(formatMoney(item.unit_price_cents, data.order.currency))}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e6e6e6;text-align:right;">${escapeHtml(formatMoney(item.line_total_cents, data.order.currency))}</td>
        </tr>`,
    )
    .join("");
}

function getItemsText(data: OrderEmailData) {
  return data.items
    .map(
      (item) =>
        `${item.product_name} x ${item.quantity} - ${formatMoney(item.line_total_cents, data.order.currency)}`,
    )
    .join("\n");
}

function getOrderTable(data: OrderEmailData) {
  const { order } = data;

  return `
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <thead>
        <tr style="background:#f5f1eb;">
          <th style="padding:10px 8px;text-align:left;">Item</th>
          <th style="padding:10px 8px;text-align:center;">Qty</th>
          <th style="padding:10px 8px;text-align:right;">Price</th>
          <th style="padding:10px 8px;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${getItemRows(data)}</tbody>
      <tfoot>
        <tr><td colspan="3" style="padding:10px 8px;text-align:right;">Subtotal</td><td style="padding:10px 8px;text-align:right;">${escapeHtml(formatMoney(order.subtotal_cents, order.currency))}</td></tr>
        <tr><td colspan="3" style="padding:10px 8px;text-align:right;">Shipping</td><td style="padding:10px 8px;text-align:right;">${escapeHtml(formatMoney(order.shipping_cents, order.currency))}</td></tr>
        <tr><td colspan="3" style="padding:10px 8px;text-align:right;">Discount</td><td style="padding:10px 8px;text-align:right;">${escapeHtml(formatMoney(order.discount_cents, order.currency))}</td></tr>
        <tr style="font-weight:700;"><td colspan="3" style="padding:10px 8px;text-align:right;">Order total</td><td style="padding:10px 8px;text-align:right;">${escapeHtml(formatMoney(order.total_cents, order.currency))}</td></tr>
      </tfoot>
    </table>`;
}

function getEmailLogoUrl() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://harmonylab-beauty.com";

  return `${siteUrl}/email/harmony-lab-icon.png`;
}

function getEmailShell(content: string, showLogo = false) {
  const header = showLogo
    ? `
      <table role="presentation" style="border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:0 12px 0 0;vertical-align:middle;">
            <img
              src="${escapeHtml(getEmailLogoUrl())}"
              alt="Harmony Lab"
              width="48"
              height="48"
              style="display:block;width:48px;height:48px;border:0;border-radius:8px;"
            >
          </td>
          <td style="padding:0;vertical-align:middle;font-size:24px;font-weight:700;letter-spacing:1px;">
            Harmony Lab
          </td>
        </tr>
      </table>`
    : `<div style="font-size:24px;font-weight:700;letter-spacing:1px;margin-bottom:24px;">HARMONY LAB</div>`;

  return `
    <!doctype html>
    <html lang="en">
      <body style="margin:0;background:#f4f4f4;color:#242424;font-family:Arial,sans-serif;">
        <div style="max-width:680px;margin:0 auto;padding:24px;">
          <div style="background:#ffffff;padding:32px;border-radius:12px;">
            ${header}
            ${content}
          </div>
        </div>
      </body>
    </html>`;
}

function buildAdminMessage(data: OrderEmailData): EmailMessage {
  const { order } = data;
  const address = getShippingAddress(order);
  const customerName = order.customer_name?.trim() || "Customer";
  const customerEmail = order.customer_email?.trim() || "Not provided";

  return {
    subject: `New paid order ${order.order_number} - Harmony Lab`,
    html: getEmailShell(`
      <h1 style="font-size:22px;margin:0 0 16px;">New paid order</h1>
      <p><strong>Order:</strong> ${escapeHtml(order.order_number)}<br>
      <strong>Paid:</strong> ${escapeHtml(formatDate(order.paid_at))}<br>
      <strong>Customer:</strong> ${escapeHtml(customerName)}<br>
      <strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
      ${getOrderTable(data)}
      <h2 style="font-size:18px;">Delivery address</h2>
      <p>${address.length ? address.map(escapeHtml).join("<br>") : "Not provided"}</p>
      ${order.delivery_notes ? `<h2 style="font-size:18px;">Delivery notes</h2><p>${escapeHtml(order.delivery_notes)}</p>` : ""}
      ${order.referral_code_entered ? `<p><strong>Referral code:</strong> ${escapeHtml(order.referral_code_entered)}</p>` : ""}
    `),
    text: [
      `New paid order ${order.order_number}`,
      `Paid: ${formatDate(order.paid_at)}`,
      `Customer: ${customerName}`,
      `Email: ${customerEmail}`,
      "",
      getItemsText(data),
      "",
      `Subtotal: ${formatMoney(order.subtotal_cents, order.currency)}`,
      `Shipping: ${formatMoney(order.shipping_cents, order.currency)}`,
      `Discount: ${formatMoney(order.discount_cents, order.currency)}`,
      `Order total: ${formatMoney(order.total_cents, order.currency)}`,
      "",
      "Delivery address:",
      address.length ? address.join("\n") : "Not provided",
      order.delivery_notes ? `\nDelivery notes:\n${order.delivery_notes}` : "",
      order.referral_code_entered ? `\nReferral code: ${order.referral_code_entered}` : "",
    ].join("\n"),
  };
}

function buildCustomerMessage(data: OrderEmailData): EmailMessage {
  const { order } = data;
  const address = getShippingAddress(order);
  const customerName = order.customer_name?.trim() || "Customer";

  return {
    subject: `Harmony Lab order confirmation ${order.order_number}`,
    html: getEmailShell(`
      <h1 style="font-size:22px;margin:0 0 16px;">Thank you for your order</h1>
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>We have received payment for order <strong>${escapeHtml(order.order_number)}</strong>. Here are your order details.</p>
      ${getOrderTable(data)}
      <h2 style="font-size:18px;">Delivery address</h2>
      <p>${address.length ? address.map(escapeHtml).join("<br>") : "Not provided"}</p>
      ${order.delivery_notes ? `<h2 style="font-size:18px;">Delivery notes</h2><p>${escapeHtml(order.delivery_notes)}</p>` : ""}
      <p>We will contact you when your order is ready for delivery.</p>
      <p>Harmony Lab</p>
    `, true),
    text: [
      `Hi ${customerName},`,
      "",
      `We have received payment for order ${order.order_number}.`,
      "",
      getItemsText(data),
      "",
      `Subtotal: ${formatMoney(order.subtotal_cents, order.currency)}`,
      `Shipping: ${formatMoney(order.shipping_cents, order.currency)}`,
      `Discount: ${formatMoney(order.discount_cents, order.currency)}`,
      `Order total: ${formatMoney(order.total_cents, order.currency)}`,
      "",
      "Delivery address:",
      address.length ? address.join("\n") : "Not provided",
      order.delivery_notes ? `\nDelivery notes:\n${order.delivery_notes}` : "",
      "",
      "We will contact you when your order is ready for delivery.",
      "",
      "Harmony Lab",
    ].join("\n"),
  };
}

async function loadOrderEmailDataByColumn(
  column: "id" | "stripe_checkout_session_id",
  value: string,
): Promise<OrderEmailData> {
  const supabase = createSupabaseServiceRoleClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id,order_number,customer_email,customer_name,currency,delivery_notes,discount_cents,paid_at,referral_code_entered,shipping_address_line1,shipping_address_line2,shipping_city,shipping_country,shipping_cents,shipping_postal_code,shipping_region,subtotal_cents,total_cents",
    )
    .eq(column, value)
    .maybeSingle();

  if (orderError || !order) {
    throw new Error(
      `Unable to load paid order for email: ${orderError?.message ?? "Order not found."}`,
    );
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_name,quantity,unit_price_cents,line_total_cents")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    throw new Error(`Unable to load paid order items for email: ${itemsError.message}`);
  }

  return {
    items: (items ?? []) as EmailOrderItem[],
    order: order as EmailOrder,
  };
}

async function claimNotification(orderId: string, recipient: OrderEmailRecipient) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("claim_order_email_notification", {
    p_order_id: orderId,
    p_recipient_type: recipient,
  });

  if (error) {
    throw new Error(`Unable to claim ${recipient} order email: ${error.message}`);
  }

  return typeof data === "string" ? data : null;
}

async function finishNotification(
  notificationId: string,
  status: "failed" | "sent",
  errorMessage: string | null,
) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("order_email_notifications")
    .update({
      last_error: errorMessage,
      locked_at: null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      status,
    })
    .eq("id", notificationId)
    .eq("status", "sending");

  if (error) {
    throw new Error(`Unable to record order email status: ${error.message}`);
  }
}

async function sendClaimedEmail({
  data,
  message,
  recipient,
  to,
}: {
  data: OrderEmailData;
  message: EmailMessage;
  recipient: OrderEmailRecipient;
  to: string;
}) {
  const notificationId = await claimNotification(data.order.id, recipient);

  if (!notificationId) {
    return;
  }

  try {
    const { from, replyTo } = getSendGridConfiguration();

    await sgMail.send({
      from,
      html: message.html,
      replyTo,
      subject: message.subject,
      text: message.text,
      to,
    });
    await finishNotification(notificationId, "sent", null);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email delivery error.";

    try {
      await finishNotification(notificationId, "failed", message.slice(0, 2000));
    } catch (statusError) {
      console.error("Unable to record failed order email:", statusError);
    }

    throw error;
  }
}

export async function sendPaidOrderEmails(checkoutSessionId: string) {
  const data = await loadOrderEmailDataByColumn("stripe_checkout_session_id", checkoutSessionId);
  await sendPaidOrderEmailData(data);
}

export async function sendPaidOrderEmailsForOrder(orderId: string) {
  const data = await loadOrderEmailDataByColumn("id", orderId);
  await sendPaidOrderEmailData(data);
}

async function sendPaidOrderEmailData(data: OrderEmailData) {
  const adminEmail = process.env.ADMIN_ORDER_EMAIL?.trim() || "harmonylabhk@gmail.com";
  const deliveries: Promise<void>[] = [
    sendClaimedEmail({
      data,
      message: buildAdminMessage(data),
      recipient: "admin",
      to: adminEmail,
    }),
  ];

  if (data.order.customer_email?.trim()) {
    deliveries.push(
      sendClaimedEmail({
        data,
        message: buildCustomerMessage(data),
        recipient: "customer",
        to: data.order.customer_email.trim(),
      }),
    );
  } else {
    console.warn(`Order ${data.order.order_number} has no customer email address.`);
  }

  const results = await Promise.allSettled(deliveries);
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  if (failures.length > 0) {
    const messages = failures.map((failure) =>
      failure.reason instanceof Error ? failure.reason.message : String(failure.reason),
    );
    throw new Error(`Order email delivery failed: ${messages.join("; ")}`);
  }
}
