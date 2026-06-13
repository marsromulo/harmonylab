import { getCheckoutDiscountQuote } from "@/lib/discounts";
import { getRequiredString, mobileJson, mobileOptions } from "@/lib/mobile-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type CartLine = {
  productId: string;
  quantity: number;
};

type ProductRow = {
  currency: string;
  id: string;
  price_cents: number;
};

function normalizeLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const quantities = new Map<string, number>();

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const productId = "productId" in item && typeof item.productId === "string" ? item.productId : "";
    const quantity =
      "quantity" in item && typeof item.quantity === "number" && Number.isInteger(item.quantity)
        ? item.quantity
        : 0;

    if (productId && quantity > 0 && quantity <= 20) {
      quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
    }
  }

  return [...quantities.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .filter((line) => line.quantity <= 20);
}

export function OPTIONS() {
  return mobileOptions();
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return mobileJson({ error: "Invalid quote request." }, { status: 400 });
  }

  const lines = normalizeLines(body.items);

  if (lines.length === 0) {
    return mobileJson({
      currency: "HKD",
      discountCents: 0,
      discountDetails: [],
      shippingCents: 0,
      subtotalCents: 0,
      totalCents: 0,
    });
  }

  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("products")
      .select("id,price_cents,currency")
      .in(
        "id",
        lines.map((line) => line.productId),
      )
      .eq("is_active", true);

    if (error) {
      throw new Error(error.message);
    }

    const products = (data ?? []) as ProductRow[];
    const productsById = new Map(products.map((product) => [product.id, product]));

    if (products.length !== lines.length) {
      return mobileJson({ error: "One or more products are unavailable." }, { status: 400 });
    }

    let currency = "";
    let subtotalCents = 0;

    for (const line of lines) {
      const product = productsById.get(line.productId);

      if (!product || (currency && currency !== product.currency)) {
        return mobileJson({ error: "Products must use the same currency." }, { status: 400 });
      }

      currency = product.currency;
      subtotalCents += product.price_cents * line.quantity;
    }

    const referralCode = getRequiredString(body.referralCode, 40)
      .replace(/[^\w-]/g, "")
      .toUpperCase();
    const quote = await getCheckoutDiscountQuote({
      country: "Hong Kong",
      currency,
      referralCode,
      subtotalCents,
    });

    return mobileJson({
      currency,
      subtotalCents,
      ...quote,
    });
  } catch (error) {
    console.error("Mobile checkout quote failed:", error);
    return mobileJson({ error: "Unable to calculate checkout total." }, { status: 500 });
  }
}
