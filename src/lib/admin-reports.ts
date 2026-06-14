import { requireAdmin } from "@/lib/admin-auth";
import { getOrderStatusLabel, getPaymentMethodLabel, type OrderStatus } from "@/lib/orders";

export type AdminReportRange = "7" | "30" | "90" | "all";

type ReportOrderRow = {
  id: string;
  status: OrderStatus;
  payment_status: string;
  payment_method: string | null;
  currency: string;
  shipping_cents: number;
  discount_cents: number;
  total_cents: number;
  referral_code_entered: string | null;
  referral_points_awarded: number;
  referral_payout_status: "paid" | "unpaid";
  created_at: string;
};

export type ReportBreakdownItem = {
  label: string;
  count: number;
  percentage: number;
};

export type DailySalesItem = {
  date: string;
  orderCount: number;
  totalCents: number;
};

export type ReferralReportItem = {
  code: string;
  orderCount: number;
  paidOrderCount: number;
  paidOrderValueCents: number;
  pointsAwarded: number;
  paidPoints: number;
  unpaidPoints: number;
};

export type AdminReportData = {
  currency: string;
  sales: {
    paidOrderCount: number;
    paidSalesCents: number;
    averageOrderCents: number;
    discountCents: number;
    shippingCents: number;
    daily: DailySalesItem[];
  };
  orders: {
    totalCount: number;
    paymentStatuses: ReportBreakdownItem[];
    deliveryStatuses: ReportBreakdownItem[];
    paymentMethods: ReportBreakdownItem[];
  };
  referrals: {
    orderCount: number;
    paidOrderValueCents: number;
    pointsAwarded: number;
    unpaidPoints: number;
    items: ReferralReportItem[];
  };
};

const reportOrderSelect = [
  "id",
  "status",
  "payment_status",
  "payment_method",
  "currency",
  "shipping_cents",
  "discount_cents",
  "total_cents",
  "referral_code_entered",
  "referral_points_awarded",
  "referral_payout_status",
  "created_at",
].join(",");

function getRangeStartIso(range: AdminReportRange) {
  if (range === "all") {
    return null;
  }

  const start = new Date();
  start.setDate(start.getDate() - Number(range));
  return start.toISOString();
}

function toTitleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function createBreakdown(values: string[], total: number, labelForValue: (value: string) => string) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({
      label: labelForValue(value),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

async function getReportOrders(range: AdminReportRange) {
  const { supabase } = await requireAdmin();
  const rows: ReportOrderRow[] = [];
  const pageSize = 1000;
  const rangeStart = getRangeStartIso(range);

  for (let start = 0; ; start += pageSize) {
    let query = supabase
      .from("orders")
      .select(reportOrderSelect)
      .order("created_at", { ascending: false })
      .range(start, start + pageSize - 1);

    if (rangeStart) {
      query = query.gte("created_at", rangeStart);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Unable to load report data: ${error.message}`);
    }

    const page = (data ?? []) as unknown as ReportOrderRow[];
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }
  }

  return rows;
}

export function normalizeAdminReportRange(value: string | string[] | undefined): AdminReportRange {
  const range = Array.isArray(value) ? value[0] : value;
  return range === "7" || range === "90" || range === "all" ? range : "30";
}

export async function getAdminReportData(range: AdminReportRange): Promise<AdminReportData> {
  const orders = await getReportOrders(range);
  const paidOrders = orders.filter((order) => order.payment_status === "paid");
  const currency = orders[0]?.currency ?? "HKD";
  const paidSalesCents = paidOrders.reduce((sum, order) => sum + order.total_cents, 0);
  const dailySales = new Map<string, DailySalesItem>();

  for (const order of paidOrders) {
    const date = order.created_at.slice(0, 10);
    const current = dailySales.get(date) ?? { date, orderCount: 0, totalCents: 0 };
    current.orderCount += 1;
    current.totalCents += order.total_cents;
    dailySales.set(date, current);
  }

  const referralMap = new Map<string, ReferralReportItem>();

  for (const order of orders) {
    const enteredCode = order.referral_code_entered?.trim();

    if (!enteredCode) {
      continue;
    }

    const code = enteredCode.toUpperCase();
    const current = referralMap.get(code) ?? {
      code,
      orderCount: 0,
      paidOrderCount: 0,
      paidOrderValueCents: 0,
      pointsAwarded: 0,
      paidPoints: 0,
      unpaidPoints: 0,
    };

    current.orderCount += 1;
    current.pointsAwarded += order.referral_points_awarded;

    if (order.payment_status === "paid") {
      current.paidOrderCount += 1;
      current.paidOrderValueCents += order.total_cents;
    }

    if (order.referral_payout_status === "paid") {
      current.paidPoints += order.referral_points_awarded;
    } else {
      current.unpaidPoints += order.referral_points_awarded;
    }

    referralMap.set(code, current);
  }

  const referralItems = Array.from(referralMap.values()).sort(
    (left, right) =>
      right.paidOrderValueCents - left.paidOrderValueCents ||
      right.pointsAwarded - left.pointsAwarded ||
      left.code.localeCompare(right.code),
  );

  return {
    currency,
    sales: {
      paidOrderCount: paidOrders.length,
      paidSalesCents,
      averageOrderCents: paidOrders.length > 0 ? Math.round(paidSalesCents / paidOrders.length) : 0,
      discountCents: paidOrders.reduce((sum, order) => sum + order.discount_cents, 0),
      shippingCents: paidOrders.reduce((sum, order) => sum + order.shipping_cents, 0),
      daily: Array.from(dailySales.values())
        .sort((left, right) => right.date.localeCompare(left.date))
        .slice(0, 14),
    },
    orders: {
      totalCount: orders.length,
      paymentStatuses: createBreakdown(
        orders.map((order) => order.payment_status),
        orders.length,
        toTitleCase,
      ),
      deliveryStatuses: createBreakdown(
        orders.map((order) => order.status),
        orders.length,
        (status) => getOrderStatusLabel(status as OrderStatus),
      ),
      paymentMethods: createBreakdown(
        orders.map((order) => order.payment_method ?? "not_selected"),
        orders.length,
        (method) => (method === "not_selected" ? "Not selected" : getPaymentMethodLabel(method)),
      ),
    },
    referrals: {
      orderCount: referralItems.reduce((sum, item) => sum + item.orderCount, 0),
      paidOrderValueCents: referralItems.reduce((sum, item) => sum + item.paidOrderValueCents, 0),
      pointsAwarded: referralItems.reduce((sum, item) => sum + item.pointsAwarded, 0),
      unpaidPoints: referralItems.reduce((sum, item) => sum + item.unpaidPoints, 0),
      items: referralItems,
    },
  };
}
