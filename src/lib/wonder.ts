import {
  createHmac,
  createSign,
  createVerify,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { readFileSync } from "node:fs";

const WONDER_ALGORITHM = "Wonder-RSA-SHA256";
const CREATE_ORDER_PATH = "/svc/payment/api/v1/openapi/orders";
const CHECK_ORDER_PATH = "/svc/payment/api/v1/openapi/orders/check";
const NONCE_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

type WonderLineItem = {
  label: string;
  priceCents: number;
  quantity: number;
};

type CreateWonderPaymentLinkInput = {
  callbackUrl: string;
  currency: string;
  lineItems: WonderLineItem[];
  note?: string;
  redirectUrl: string;
  referenceNumber: string;
  totalCents: number;
};

export type WonderPaymentMethod = "alipay_hk" | "credit_card" | "fps";

export type WonderOrder = {
  correspondence_state: "over_paid" | "paid" | "partial_paid" | "unpaid";
  currency: string;
  initial_total: number;
  number: string;
  reference_number: string;
  state: string;
  transactions?: Array<{
    amount: number;
    payment_method: string;
    payment_data?: {
      brn?: string;
      new_gateway_txn_id?: string;
      rrn?: string;
    };
    success: boolean;
    uuid: string;
  }>;
};

type WonderOrderResponse = {
  code: number;
  data?: {
    order?: WonderOrder;
    payment_link?: string;
  };
  message: string;
};

function getPemFromEnvironment(valueName: string, pathName: string) {
  const value = process.env[valueName]?.replace(/\\n/g, "\n").trim();

  if (value) {
    return value;
  }

  const path = process.env[pathName]?.trim();
  return path ? readFileSync(path, "utf8").trim() : undefined;
}

function getWonderConfig() {
  const appId = process.env.WONDER_APP_ID?.trim();
  const privateKey = getPemFromEnvironment("WONDER_PRIVATE_KEY", "WONDER_PRIVATE_KEY_PATH");
  const environment = process.env.WONDER_ENVIRONMENT?.trim().toLowerCase() || "sandbox";

  if (!appId || !privateKey) {
    throw new Error("Missing WONDER_APP_ID or WONDER_PRIVATE_KEY.");
  }

  if (environment !== "sandbox" && environment !== "production") {
    throw new Error("WONDER_ENVIRONMENT must be sandbox or production.");
  }

  return {
    appId,
    baseUrl:
      environment === "production"
        ? "https://gateway.wonder.today"
        : "https://gateway-stg.wonder.today",
    privateKey,
  };
}

function formatUtcTimestamp(date = new Date()) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    String(date.getUTCSeconds()).padStart(2, "0"),
  ].join("");
}

function createNonce() {
  return Array.from(
    { length: 16 },
    () => NONCE_ALPHABET[randomInt(0, NONCE_ALPHABET.length)],
  ).join("");
}

function getSignatureMessage({
  body,
  credential,
  method,
  nonce,
  uri,
}: {
  body: string;
  credential: string;
  method: string;
  nonce: string;
  uri: string;
}) {
  const [, requestTime, algorithm] = credential.split("/");

  if (!requestTime || !algorithm) {
    throw new Error("Invalid Wonder credential.");
  }

  let signatureKey = createHmac("sha256", nonce).update(requestTime).digest();
  signatureKey = createHmac("sha256", signatureKey).update(algorithm).digest();

  const content = body ? `${method.toUpperCase()}\n${uri}\n${body}` : `${method.toUpperCase()}\n${uri}`;
  return createHmac("sha256", signatureKey).update(content).digest("hex");
}

function signWonderRequest({
  body,
  credential,
  method,
  nonce,
  privateKey,
  uri,
}: {
  body: string;
  credential: string;
  method: string;
  nonce: string;
  privateKey: string;
  uri: string;
}) {
  const signer = createSign("RSA-SHA256");
  signer.update(getSignatureMessage({ body, credential, method, nonce, uri }));
  signer.end();
  return signer.sign(privateKey, "base64");
}

async function wonderRequest<T>(uri: string, body: unknown): Promise<T> {
  const { appId, baseUrl, privateKey } = getWonderConfig();
  const method = "POST";
  const payload = JSON.stringify(body);
  const nonce = createNonce();
  const credential = `${appId}/${formatUtcTimestamp()}/${WONDER_ALGORITHM}`;
  const signature = signWonderRequest({
    body: payload,
    credential,
    method,
    nonce,
    privateKey,
    uri,
  });
  const response = await fetch(`${baseUrl}${uri}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Credential: credential,
      Nonce: nonce,
      Signature: signature,
      "X-Request-ID": randomUUID(),
    },
    body: payload,
    cache: "no-store",
  });
  const text = await response.text();
  let data: T;

  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error(`Wonder returned an invalid response (${response.status}).`);
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : `HTTP ${response.status}`;
    throw new Error(`Wonder API request failed: ${message}`);
  }

  return data;
}

function formatMoney(cents: number) {
  return (cents / 100).toFixed(2);
}

function getPayableLineItems(lineItems: WonderLineItem[], totalCents: number) {
  const lineItemTotal = lineItems.reduce(
    (total, item) => total + item.priceCents * item.quantity,
    0,
  );

  if (lineItemTotal === totalCents) {
    return lineItems;
  }

  if (totalCents <= 0 || totalCents > lineItemTotal) {
    throw new Error("Wonder line items do not match the payable order total.");
  }

  let reductionCents = lineItemTotal - totalCents;
  const flattenedItems = lineItems.map((item) => ({
    label: item.quantity > 1 ? `${item.quantity}x ${item.label}` : item.label,
    originalCents: item.priceCents * item.quantity,
    priceCents: item.priceCents * item.quantity,
    quantity: 1,
  }));
  const reductionOrder = [
    ...flattenedItems
      .map((item, index) => ({ index, item }))
      .filter(({ item }) => item.label !== "Shipping")
      .reverse(),
    ...flattenedItems
      .map((item, index) => ({ index, item }))
      .filter(({ item }) => item.label === "Shipping"),
  ];

  for (const { index } of reductionOrder) {
    if (reductionCents === 0) {
      break;
    }

    const reduction = Math.min(flattenedItems[index].priceCents, reductionCents);
    flattenedItems[index].priceCents -= reduction;
    reductionCents -= reduction;
  }

  return flattenedItems
    .filter((item) => item.priceCents > 0)
    .map((item) => ({
      label:
        item.priceCents < item.originalCents
          ? `${item.label} (after discount)`
          : item.label,
      priceCents: item.priceCents,
      quantity: 1,
    }));
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export async function createWonderPaymentLink(input: CreateWonderPaymentLinkInput) {
  const { appId } = getWonderConfig();
  const payableLineItems = getPayableLineItems(input.lineItems, input.totalCents);
  const response = await wonderRequest<WonderOrderResponse>(`${CREATE_ORDER_PATH}?with_payment_link=true`, {
    app_id: appId,
    order: {
      callback_url: input.callbackUrl,
      charge_fee: formatMoney(input.totalCents),
      currency: input.currency.toUpperCase(),
      line_items: payableLineItems.map((item) => ({
        label: item.label.slice(0, 255),
        price: formatMoney(item.priceCents),
        purchasable_type: "Charge",
        quantity: item.quantity,
        total: formatMoney(item.priceCents * item.quantity),
      })),
      note: input.note?.slice(0, 255),
      redirect_url: input.redirectUrl,
      reference_number: input.referenceNumber,
    },
  });
  const order = response.data?.order;
  const paymentLink = response.data?.payment_link;

  if (!order?.number || !paymentLink) {
    throw new Error(`Wonder did not create a payment link: ${response.message || "Invalid response."}`);
  }

  return { order, paymentLink };
}

export async function getWonderOrder(referenceNumber: string) {
  const response = await wonderRequest<WonderOrderResponse>(CHECK_ORDER_PATH, {
    order: { reference_number: referenceNumber },
  });

  if (!response.data?.order) {
    throw new Error(`Wonder order lookup failed: ${response.message || "Order not found."}`);
  }

  return response.data.order;
}

export function verifyWonderWebhook({
  body,
  credential,
  nonce,
  signature,
  uri,
}: {
  body: string;
  credential: string;
  nonce: string;
  signature: string;
  uri: string;
}) {
  const publicKey = getPemFromEnvironment(
    "WONDER_WEBHOOK_PUBLIC_KEY",
    "WONDER_WEBHOOK_PUBLIC_KEY_PATH",
  );
  const configuredAppId = process.env.WONDER_APP_ID?.trim();
  const [appId, requestTime, algorithm] = credential.split("/");

  if (
    !publicKey ||
    !configuredAppId ||
    !appId ||
    !requestTime ||
    appId !== configuredAppId ||
    algorithm !== WONDER_ALGORITHM
  ) {
    return false;
  }

  const parsedTime = Date.UTC(
    Number(requestTime.slice(0, 4)),
    Number(requestTime.slice(4, 6)) - 1,
    Number(requestTime.slice(6, 8)),
    Number(requestTime.slice(8, 10)),
    Number(requestTime.slice(10, 12)),
    Number(requestTime.slice(12, 14)),
  );

  if (!Number.isFinite(parsedTime) || Math.abs(Date.now() - parsedTime) > 10 * 60 * 1000) {
    return false;
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(getSignatureMessage({ body, credential, method: "POST", nonce, uri }));
  verifier.end();

  try {
    const signatureBytes = Buffer.from(signature, "base64");
    const verified = verifier.verify(publicKey, signatureBytes);
    const expectedAppId = Buffer.from(configuredAppId);
    const receivedAppId = Buffer.from(appId);
    return (
      verified &&
      expectedAppId.length === receivedAppId.length &&
      timingSafeEqual(expectedAppId, receivedAppId)
    );
  } catch {
    return false;
  }
}
