import "server-only";

import { requireAdmin } from "@/lib/admin-auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type DiscountType = "minimum_order" | "referral" | "shipping";
export type DiscountCalculationType = "fixed" | "free_shipping" | "percentage";

export type DiscountRule = {
  calculationType: DiscountCalculationType;
  country: string | null;
  createdAt: string;
  currency: string;
  discountType: DiscountType;
  id: string;
  isActive: boolean;
  minimumSubtotalCents: number;
  name: string;
  priority: number;
  value: number;
};

export type DiscountDetail = {
  amount_cents: number;
  name: string;
  rule_id: string;
  type: DiscountType;
};

export type CheckoutDiscountQuote = {
  discountCents: number;
  discountDetails: DiscountDetail[];
  shippingCents: number;
  totalCents: number;
};

type DiscountRuleRow = {
  calculation_type: DiscountCalculationType;
  country: string | null;
  created_at: string;
  currency: string;
  discount_type: DiscountType;
  id: string;
  is_active: boolean;
  minimum_subtotal_cents: number;
  name: string;
  priority: number;
  value: number;
};

type CheckoutDiscountQuoteRow = {
  discount_cents: number;
  discount_details: DiscountDetail[] | null;
  shipping_cents: number;
  total_cents: number;
};

const discountRuleSelect =
  "id,name,discount_type,calculation_type,minimum_subtotal_cents,value,country,currency,priority,is_active,created_at";

function mapDiscountRule(row: DiscountRuleRow): DiscountRule {
  return {
    calculationType: row.calculation_type,
    country: row.country,
    createdAt: row.created_at,
    currency: row.currency,
    discountType: row.discount_type,
    id: row.id,
    isActive: row.is_active,
    minimumSubtotalCents: row.minimum_subtotal_cents,
    name: row.name,
    priority: row.priority,
    value: row.value,
  };
}

export async function getAdminDiscountRules() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("discount_rules")
    .select(discountRuleSelect)
    .order("discount_type")
    .order("minimum_subtotal_cents", { ascending: false })
    .order("priority", { ascending: false });

  if (error) {
    throw new Error(`Unable to load discount rules: ${error.message}`);
  }

  return ((data ?? []) as unknown as DiscountRuleRow[]).map(mapDiscountRule);
}

export async function getAdminDiscountRule(id: string) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("discount_rules")
    .select(discountRuleSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load discount rule: ${error.message}`);
  }

  return data ? mapDiscountRule(data as unknown as DiscountRuleRow) : null;
}

export async function getCheckoutDiscountQuote({
  country = "Hong Kong",
  currency = "HKD",
  referralCode = "",
  region = "",
  subtotalCents,
}: {
  country?: string;
  currency?: string;
  referralCode?: string;
  region?: string;
  subtotalCents: number;
}): Promise<CheckoutDiscountQuote> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("get_checkout_discount_quote", {
    p_currency: currency,
    p_referral_code: referralCode,
    p_shipping_country: country,
    p_shipping_region: region,
    p_subtotal_cents: subtotalCents,
  });
  const quote = Array.isArray(data)
    ? (data[0] as CheckoutDiscountQuoteRow | undefined)
    : undefined;

  if (error || !quote) {
    throw new Error(`Unable to calculate discounts: ${error?.message ?? "Invalid response."}`);
  }

  return {
    discountCents: Number(quote.discount_cents),
    discountDetails: Array.isArray(quote.discount_details) ? quote.discount_details : [],
    shippingCents: Number(quote.shipping_cents),
    totalCents: Number(quote.total_cents),
  };
}
