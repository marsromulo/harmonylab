import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type PaidOrderRewardRow = {
  currency: string;
  id: string;
  order_number: string;
  referral_code_entered: string | null;
  referral_points_awarded: number;
  total_cents: number;
};

function getAinettRewardConfiguration() {
  const url = process.env.AINETT_ORDER_REWARD_URL?.trim();
  const secret = process.env.HARMONY_LAB_ORDER_REWARD_SECRET?.trim();

  if (!url || !secret) {
    return null;
  }

  return { secret, url };
}

export async function notifyAinettOrderReward(orderId: string) {
  const config = getAinettRewardConfiguration();

  if (!config) {
    console.warn("AI.NETT order reward webhook is not configured.");
    return;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id,order_number,referral_code_entered,referral_points_awarded,total_cents,currency")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load order for AI.NETT reward: ${error.message}`);
  }

  const order = data as PaidOrderRewardRow | null;

  if (!order?.referral_code_entered?.trim()) {
    return;
  }

  const response = await fetch(config.url, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-harmony-lab-secret": config.secret,
    },
    body: JSON.stringify({
      order_id: order.id,
      order_number: order.order_number,
      referral_code: order.referral_code_entered,
      reward_amount: Number(order.referral_points_awarded ?? 0),
      total_amount: Number(order.total_cents ?? 0) / 100,
      currency: order.currency,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI.NETT order reward webhook failed: ${response.status} ${body}`);
  }
}
