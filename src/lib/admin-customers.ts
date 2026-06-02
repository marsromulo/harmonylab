import { requireAdmin } from "@/lib/admin-auth";

export type AdminCustomer = {
  id: string;
  email: string | null;
  firstName: string | null;
  fullName: string | null;
  lastName: string | null;
  phone: string | null;
  referralId: string | null;
  referralPointsBalance: number;
  createdAt: string;
  orderCount: number;
  totalSpentCents: number;
};

export type AdminCustomerAddress = {
  id: string;
  label: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
};

export type AdminCustomerOrder = {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  totalCents: number;
  createdAt: string;
};

type CustomerRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  full_name: string | null;
  last_name: string | null;
  phone: string | null;
  referral_id: string | null;
  referral_points_balance: number;
  created_at: string;
};

type OrderRow = {
  id?: string;
  customer_id: string | null;
  order_number?: string;
  status?: string;
  currency?: string;
  total_cents: number;
  created_at?: string;
};

type CustomerAddressRow = {
  id: string;
  label: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  region: string | null;
  postal_code: string | null;
  country: string;
  is_default: boolean;
};

const adminCustomerSelect = [
  "id",
  "email",
  "first_name",
  "full_name",
  "last_name",
  "phone",
  "referral_id",
  "referral_points_balance",
  "created_at",
].join(",");

function getFullName(firstName: string | null, lastName: string | null, fallbackFullName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || fallbackFullName;
}

function mapCustomer(customer: CustomerRow, totals = { count: 0, totalCents: 0 }): AdminCustomer {
  return {
    id: customer.id,
    email: customer.email,
    firstName: customer.first_name,
    fullName: getFullName(customer.first_name, customer.last_name, customer.full_name),
    lastName: customer.last_name,
    phone: customer.phone,
    referralId: customer.referral_id,
    referralPointsBalance: customer.referral_points_balance,
    createdAt: customer.created_at,
    orderCount: totals.count,
    totalSpentCents: totals.totalCents,
  };
}

function mapAddress(address: CustomerAddressRow): AdminCustomerAddress {
  return {
    id: address.id,
    label: address.label,
    firstName: address.first_name,
    lastName: address.last_name,
    phone: address.phone,
    addressLine1: address.address_line1,
    addressLine2: address.address_line2,
    city: address.city,
    region: address.region,
    postalCode: address.postal_code,
    country: address.country,
    isDefault: address.is_default,
  };
}

export function formatAdminCustomerDate(value: string) {
  return new Intl.DateTimeFormat("en-HK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export async function getAdminCustomers(limit = 100) {
  const { supabase } = await requireAdmin();
  const [{ data: customers, error: customerError }, { data: orders, error: orderError }] = await Promise.all([
    supabase.from("customer_profiles").select(adminCustomerSelect).order("created_at", { ascending: false }).limit(limit),
    supabase.from("orders").select("customer_id,total_cents"),
  ]);

  if (customerError) {
    throw new Error(`Unable to load customers: ${customerError.message}`);
  }

  if (orderError) {
    throw new Error(`Unable to load customer order totals: ${orderError.message}`);
  }

  const orderTotalsByCustomer = new Map<string, { count: number; totalCents: number }>();

  for (const order of (orders ?? []) as unknown as OrderRow[]) {
    if (!order.customer_id) {
      continue;
    }

    const current = orderTotalsByCustomer.get(order.customer_id) ?? { count: 0, totalCents: 0 };
    orderTotalsByCustomer.set(order.customer_id, {
      count: current.count + 1,
      totalCents: current.totalCents + order.total_cents,
    });
  }

  return ((customers ?? []) as unknown as CustomerRow[]).map((customer) => {
    const totals = orderTotalsByCustomer.get(customer.id) ?? { count: 0, totalCents: 0 };

    return mapCustomer(customer, totals);
  });
}

export async function getAdminCustomerDetails(customerId: string) {
  const { supabase } = await requireAdmin();
  const [
    { data: customer, error: customerError },
    { data: addresses, error: addressError },
    { data: orders, error: orderError },
  ] = await Promise.all([
    supabase.from("customer_profiles").select(adminCustomerSelect).eq("id", customerId).maybeSingle(),
    supabase
      .from("customer_addresses")
      .select(
        "id,label,first_name,last_name,phone,address_line1,address_line2,city,region,postal_code,country,is_default",
      )
      .eq("customer_id", customerId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id,customer_id,order_number,status,currency,total_cents,created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
  ]);

  if (customerError) {
    throw new Error(`Unable to load customer: ${customerError.message}`);
  }

  if (addressError) {
    throw new Error(`Unable to load customer addresses: ${addressError.message}`);
  }

  if (orderError) {
    throw new Error(`Unable to load customer orders: ${orderError.message}`);
  }

  if (!customer) {
    return null;
  }

  const orderRows = (orders ?? []) as unknown as OrderRow[];
  const totalSpentCents = orderRows.reduce((sum, order) => sum + order.total_cents, 0);

  return {
    addresses: ((addresses ?? []) as unknown as CustomerAddressRow[]).map(mapAddress),
    customer: mapCustomer(customer as unknown as CustomerRow, {
      count: orderRows.length,
      totalCents: totalSpentCents,
    }),
    orders: orderRows.map((order) => ({
      id: order.id ?? "",
      orderNumber: order.order_number ?? "",
      status: order.status ?? "pending",
      currency: order.currency ?? "HKD",
      totalCents: order.total_cents,
      createdAt: order.created_at ?? "",
    })),
  };
}
