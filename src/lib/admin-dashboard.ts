import { requireAdmin } from "@/lib/admin-auth";
import type { OrderStatus } from "@/lib/orders";

export type AdminDashboardOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  status: OrderStatus;
  currency: string;
  totalCents: number;
  createdAt: string;
};

export type AdminDashboardCustomer = {
  id: string;
  email: string | null;
  fullName: string | null;
  referralId: string | null;
  createdAt: string;
  orderCount: number;
};

export type AdminDashboardData = {
  newCustomerCount: number;
  orderCount: number;
  pendingOrderCount: number;
  recentCustomers: AdminDashboardCustomer[];
  recentOrders: AdminDashboardOrder[];
  totalOrderAmountCents: number;
};

type DashboardOrderRow = {
  id: string;
  order_number: string;
  customer_email: string | null;
  customer_id: string | null;
  customer_name: string | null;
  status: OrderStatus;
  currency: string;
  total_cents: number;
  created_at: string;
};

type DashboardCustomerRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  full_name: string | null;
  last_name: string | null;
  referral_id: string | null;
  created_at: string;
};

type CustomerOrderCountRow = {
  customer_id: string | null;
};

const recentOrderSelect = [
  "id",
  "order_number",
  "customer_id",
  "customer_email",
  "customer_name",
  "status",
  "currency",
  "total_cents",
  "created_at",
].join(",");

const recentCustomerSelect = "id,email,first_name,last_name,full_name,referral_id,created_at";

function getCustomerName(firstName: string | null, lastName: string | null, fallbackFullName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || fallbackFullName;
}

function getThirtyDaysAgoIso() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString();
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const { supabase } = await requireAdmin();
  const [
    { count: orderCount, error: orderCountError },
    { data: orderTotals, error: orderTotalsError },
    { count: pendingOrderCount, error: pendingOrderError },
    { count: newCustomerCount, error: newCustomerError },
    { data: recentOrders, error: recentOrdersError },
    { data: recentCustomers, error: recentCustomersError },
    { data: customerOrders, error: customerOrdersError },
  ] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("total_cents"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("customer_profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", getThirtyDaysAgoIso()),
    supabase.from("orders").select(recentOrderSelect).order("created_at", { ascending: false }).limit(5),
    supabase.from("customer_profiles").select(recentCustomerSelect).order("created_at", { ascending: false }).limit(5),
    supabase.from("orders").select("customer_id"),
  ]);

  if (orderCountError) {
    throw new Error(`Unable to load dashboard order count: ${orderCountError.message}`);
  }

  if (orderTotalsError) {
    throw new Error(`Unable to load dashboard order totals: ${orderTotalsError.message}`);
  }

  if (pendingOrderError) {
    throw new Error(`Unable to load dashboard pending orders: ${pendingOrderError.message}`);
  }

  if (newCustomerError) {
    throw new Error(`Unable to load dashboard new customers: ${newCustomerError.message}`);
  }

  if (recentOrdersError) {
    throw new Error(`Unable to load dashboard recent orders: ${recentOrdersError.message}`);
  }

  if (recentCustomersError) {
    throw new Error(`Unable to load dashboard recent customers: ${recentCustomersError.message}`);
  }

  if (customerOrdersError) {
    throw new Error(`Unable to load dashboard customer order counts: ${customerOrdersError.message}`);
  }

  const orderCountByCustomerId = new Map<string, number>();

  for (const order of (customerOrders ?? []) as unknown as CustomerOrderCountRow[]) {
    if (!order.customer_id) {
      continue;
    }

    orderCountByCustomerId.set(order.customer_id, (orderCountByCustomerId.get(order.customer_id) ?? 0) + 1);
  }

  return {
    newCustomerCount: newCustomerCount ?? 0,
    orderCount: orderCount ?? 0,
    pendingOrderCount: pendingOrderCount ?? 0,
    recentCustomers: ((recentCustomers ?? []) as unknown as DashboardCustomerRow[]).map((customer) => ({
      id: customer.id,
      email: customer.email,
      fullName: getCustomerName(customer.first_name, customer.last_name, customer.full_name),
      referralId: customer.referral_id,
      createdAt: customer.created_at,
      orderCount: orderCountByCustomerId.get(customer.id) ?? 0,
    })),
    recentOrders: ((recentOrders ?? []) as unknown as DashboardOrderRow[]).map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      status: order.status,
      currency: order.currency,
      totalCents: order.total_cents,
      createdAt: order.created_at,
    })),
    totalOrderAmountCents: ((orderTotals ?? []) as unknown as Pick<DashboardOrderRow, "total_cents">[]).reduce(
      (sum, order) => sum + order.total_cents,
      0,
    ),
  };
}
