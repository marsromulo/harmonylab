import type { Session } from '@supabase/supabase-js';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

async function parseResponse<T>(response: Response): Promise<T> {
  const responseText = await response.text();
  let data: (T & { error?: string }) | null = null;

  try {
    data = JSON.parse(responseText) as T & { error?: string };
  } catch {
    throw new Error(
      response.ok
        ? 'The server returned an invalid response.'
        : `The server could not complete the request (${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(data.error || 'The request could not be completed.');
  }

  return data;
}

export async function validateReferralCode(referralCode: string) {
  if (!configuredApiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured.');
  }

  const response = await fetch(`${configuredApiUrl}/api/mobile/referral/validate`, {
    body: JSON.stringify({ referralCode }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  const data = await parseResponse<{ valid: boolean }>(response);

  return data.valid;
}

export async function publicApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!configuredApiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured.');
  }

  const response = await fetch(`${configuredApiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  return parseResponse<T>(response);
}

export type MobileAddress = {
  address_line1: string;
  address_line2: string | null;
  city: string;
  country: string;
  first_name: string | null;
  id: string;
  is_default: boolean;
  label: string | null;
  last_name: string | null;
  phone: string | null;
  postal_code: string | null;
  region: string | null;
};

export type MobileOrder = {
  created_at: string;
  currency: string;
  fulfillment_carrier: string | null;
  fulfillment_tracking_number: string | null;
  fulfillment_tracking_url: string | null;
  id: string;
  order_items: { product_name: string; quantity: number }[];
  order_number: string;
  payment_status: string;
  status: string;
  total_cents: number;
};

export type MobileOrderDetails = Omit<MobileOrder, 'order_items'> & {
  delivered_at: string | null;
  delivery_notes: string | null;
  discount_cents: number;
  order_items: {
    id: string;
    line_total_cents: number;
    product_name: string;
    quantity: number;
    unit_price_cents: number;
  }[];
  paid_at: string | null;
  payment_method: string | null;
  payment_provider: string | null;
  shipped_at: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
  shipping_cents: number;
  shipping_postal_code: string | null;
  shipping_region: string | null;
  subtotal_cents: number;
  wonder_order_number: string | null;
  wonder_transaction_id: string | null;
};

export type MobileNotification = {
  body: string;
  created_at: string;
  data: {
    orderId?: string;
    orderNumber?: string;
    url?: string;
  };
  id: string;
  notification_type: 'order_created' | 'order_status';
  order_id: string | null;
  read_at: string | null;
  title: string;
};

export type MobileAccount = {
  addresses: MobileAddress[];
  isAdmin: boolean;
  orders: MobileOrder[];
  profile: {
    email: string | null;
    firstName: string | null;
    fullName: string | null;
    lastName: string | null;
    phone: string | null;
    referralId: string | null;
    referralPointsBalance: number;
  };
};

export type MobileAdminOrder = {
  created_at: string;
  currency: string;
  customer_email: string | null;
  customer_name: string | null;
  id: string;
  order_number: string;
  payment_status: string;
  referral_code_entered: string | null;
  referral_payout_status: 'paid' | 'unpaid';
  referral_points_awarded: number;
  status: string;
  total_cents: number;
};

export type MobileAdminOrderDetails = MobileAdminOrder & {
  customer_id: string | null;
  delivered_at: string | null;
  delivery_notes: string | null;
  discount_cents: number;
  fulfillment_carrier: string | null;
  fulfillment_notes: string | null;
  fulfillment_tracking_number: string | null;
  fulfillment_tracking_url: string | null;
  order_items: {
    id: string;
    line_total_cents: number;
    product_name: string;
    quantity: number;
    unit_price_cents: number;
  }[];
  paid_at: string | null;
  payment_method: string | null;
  payment_provider: string | null;
  shipped_at: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
  shipping_region: string | null;
  shipping_cents: number;
  subtotal_cents: number;
  wonder_order_number: string | null;
  wonder_transaction_id: string | null;
};

export async function apiRequest<T>(
  path: string,
  session: Session,
  init?: RequestInit,
): Promise<T> {
  if (!configuredApiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured.');
  }

  const response = await fetch(`${configuredApiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  return parseResponse<T>(response);
}
