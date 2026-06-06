import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ShippingRateRule = {
  country: string;
  currency: string;
  freeShippingThresholdCents: number;
  region: string | null;
  shippingFeeCents: number;
};

type ShippingRateRuleRow = {
  country: string;
  currency: string;
  free_shipping_threshold_cents: number;
  region: string | null;
  shipping_fee_cents: number;
};

const shippingRateSelect = "country,region,currency,free_shipping_threshold_cents,shipping_fee_cents";

function normalizeLocation(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function mapShippingRateRule(row: ShippingRateRuleRow): ShippingRateRule {
  return {
    country: row.country,
    currency: row.currency,
    freeShippingThresholdCents: row.free_shipping_threshold_cents,
    region: row.region,
    shippingFeeCents: row.shipping_fee_cents,
  };
}

export async function getShippingRateRule(country = "Hong Kong", region?: string | null) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("shipping_rate_rules")
    .select(shippingRateSelect)
    .eq("country", country)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Unable to load shipping rate rule: ${error.message}`);
  }

  const rules = ((data ?? []) as unknown as ShippingRateRuleRow[]).map(mapShippingRateRule);
  const normalizedRegion = normalizeLocation(region);
  const exactRule = rules.find((rule) => normalizeLocation(rule.region) === normalizedRegion);

  return exactRule ?? rules.find((rule) => rule.region === null) ?? null;
}

export async function calculateShippingCents({
  country = "Hong Kong",
  region,
  subtotalCents,
}: {
  country?: string | null;
  region?: string | null;
  subtotalCents: number;
}) {
  const rule = await getShippingRateRule(country ?? "Hong Kong", region);

  if (!rule) {
    throw new Error(`No active shipping rate rule found for ${country ?? "Hong Kong"}.`);
  }

  return subtotalCents >= rule.freeShippingThresholdCents ? 0 : rule.shippingFeeCents;
}
