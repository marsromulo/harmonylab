import { createSupabaseAuthServerClient } from "@/lib/supabase/server";

export type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

export type StoreOrder = {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  status: OrderStatus;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  referralCodeEntered: string | null;
  referralOwnerCustomerId: string | null;
  referralPointsAwarded: number;
  deliveryNotes: string | null;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingRegion: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StoreOrderItem = {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type OrderRelatedCustomer = {
  id: string;
  email: string | null;
  fullName: string | null;
  referralId: string | null;
};

type StoreOrderRow = {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  status: OrderStatus;
  currency: string;
  subtotal_cents: number;
  shipping_cents: number;
  discount_cents: number;
  total_cents: number;
  referral_code_entered: string | null;
  referral_owner_customer_id: string | null;
  referral_points_awarded: number;
  delivery_notes: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_region: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  created_at: string;
  updated_at: string;
};

type StoreOrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

type RelatedCustomerRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  full_name: string | null;
  last_name: string | null;
  referral_id: string | null;
};

const orderSelect = [
  "id",
  "order_number",
  "customer_id",
  "customer_email",
  "customer_name",
  "status",
  "currency",
  "subtotal_cents",
  "shipping_cents",
  "discount_cents",
  "total_cents",
  "referral_code_entered",
  "referral_owner_customer_id",
  "referral_points_awarded",
  "delivery_notes",
  "shipping_address_line1",
  "shipping_address_line2",
  "shipping_city",
  "shipping_region",
  "shipping_postal_code",
  "shipping_country",
  "created_at",
  "updated_at",
].join(",");

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

function mapOrder(row: StoreOrderRow): StoreOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    status: row.status,
    currency: row.currency,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    discountCents: row.discount_cents,
    totalCents: row.total_cents,
    referralCodeEntered: row.referral_code_entered,
    referralOwnerCustomerId: row.referral_owner_customer_id,
    referralPointsAwarded: row.referral_points_awarded,
    deliveryNotes: row.delivery_notes,
    shippingAddressLine1: row.shipping_address_line1,
    shippingAddressLine2: row.shipping_address_line2,
    shippingCity: row.shipping_city,
    shippingRegion: row.shipping_region,
    shippingPostalCode: row.shipping_postal_code,
    shippingCountry: row.shipping_country,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrderItem(row: StoreOrderItemRow): StoreOrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
    lineTotalCents: row.line_total_cents,
  };
}

function getRelatedCustomerName(row: RelatedCustomerRow) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ") || row.full_name;
}

function mapRelatedCustomer(row: RelatedCustomerRow): OrderRelatedCustomer {
  return {
    id: row.id,
    email: row.email,
    fullName: getRelatedCustomerName(row),
    referralId: row.referral_id,
  };
}

export function formatOrderMoney(cents: number, currency = "HKD") {
  return new Intl.NumberFormat("en-HK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("en-HK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function getOrderStatusLabel(status: OrderStatus) {
  return statusLabels[status];
}

export async function getAdminOrders(limit = 100) {
  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Unable to load orders: ${error.message}`);
  }

  return (data as unknown as StoreOrderRow[]).map(mapOrder);
}

export async function getCustomerOrders(customerId: string, limit = 20) {
  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Unable to load customer orders: ${error.message}`);
  }

  return (data as unknown as StoreOrderRow[]).map(mapOrder);
}

export async function getAdminOrderDetails(orderId: string) {
  const supabase = await createSupabaseAuthServerClient();
  const { data: order, error: orderError } = await supabase.from("orders").select(orderSelect).eq("id", orderId).maybeSingle();

  if (orderError) {
    throw new Error(`Unable to load order: ${orderError.message}`);
  }

  if (!order) {
    return null;
  }

  const mappedOrder = mapOrder(order as unknown as StoreOrderRow);
  const [
    { data: items, error: itemError },
    { data: customer, error: customerError },
    { data: referralOwner, error: referralOwnerError },
  ] = await Promise.all([
    supabase
      .from("order_items")
      .select("id,order_id,product_id,product_name,quantity,unit_price_cents,line_total_cents")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    mappedOrder.customerId
      ? supabase
          .from("customer_profiles")
          .select("id,email,first_name,last_name,full_name,referral_id")
          .eq("id", mappedOrder.customerId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    mappedOrder.referralOwnerCustomerId
      ? supabase
          .from("customer_profiles")
          .select("id,email,first_name,last_name,full_name,referral_id")
          .eq("id", mappedOrder.referralOwnerCustomerId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (itemError) {
    throw new Error(`Unable to load order items: ${itemError.message}`);
  }

  if (customerError) {
    throw new Error(`Unable to load order customer: ${customerError.message}`);
  }

  if (referralOwnerError) {
    throw new Error(`Unable to load referral owner: ${referralOwnerError.message}`);
  }

  return {
    customer: customer ? mapRelatedCustomer(customer as unknown as RelatedCustomerRow) : null,
    items: ((items ?? []) as unknown as StoreOrderItemRow[]).map(mapOrderItem),
    order: mappedOrder,
    referralOwner: referralOwner ? mapRelatedCustomer(referralOwner as unknown as RelatedCustomerRow) : null,
  };
}
