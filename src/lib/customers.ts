import type { User } from "@supabase/supabase-js";
import { createSupabaseAuthServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type CustomerProfile = {
  id: string;
  authUserId: string | null;
  email: string | null;
  firstName: string | null;
  fullName: string | null;
  lastName: string | null;
  phone: string | null;
  referralCode: string | null;
  referralId: string | null;
  referralPointsBalance: number;
};

export type CustomerAddress = {
  id: string;
  customerId: string;
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

type CustomerProfileRow = {
  id: string;
  auth_user_id: string | null;
  email: string | null;
  first_name: string | null;
  full_name: string | null;
  last_name: string | null;
  phone: string | null;
  referral_code: string | null;
  referral_id: string | null;
  referral_points_balance: number;
};

type CustomerAddressRow = {
  id: string;
  customer_id: string;
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

const customerProfileSelect =
  "id,auth_user_id,email,first_name,last_name,full_name,phone,referral_code,referral_id,referral_points_balance";
const customerAddressSelect =
  "id,customer_id,label,first_name,last_name,phone,address_line1,address_line2,city,region,postal_code,country,is_default";

function getFullName(firstName: string | null, lastName: string | null, fallbackFullName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || fallbackFullName;
}

function mapCustomerProfile(row: CustomerProfileRow): CustomerProfile {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email,
    firstName: row.first_name,
    fullName: getFullName(row.first_name, row.last_name, row.full_name),
    lastName: row.last_name,
    phone: row.phone,
    referralCode: row.referral_code,
    referralId: row.referral_id,
    referralPointsBalance: row.referral_points_balance,
  };
}

function mapCustomerAddress(row: CustomerAddressRow): CustomerAddress {
  return {
    id: row.id,
    customerId: row.customer_id,
    label: row.label,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    region: row.region,
    postalCode: row.postal_code,
    country: row.country,
    isDefault: row.is_default,
  };
}

export async function getCurrentCustomer() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { profile: null, supabase, user: null };
  }

  const { data, error } = await supabase
    .from("customer_profiles")
    .select(customerProfileSelect)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("Unable to load customer profile:", error.message);
  }

  return {
    profile: data ? mapCustomerProfile(data as CustomerProfileRow) : null,
    supabase,
    user,
  };
}

export async function ensureCustomerProfile(
  user: User,
  values?: {
    email?: string;
    firstName?: string;
    fullName?: string;
    lastName?: string;
    phone?: string;
    referralCode?: string | null;
  },
) {
  const supabase = createSupabaseServiceRoleClient();
  const firstName = values?.firstName ?? (typeof user.user_metadata?.first_name === "string" ? user.user_metadata.first_name : null);
  const lastName = values?.lastName ?? (typeof user.user_metadata?.last_name === "string" ? user.user_metadata.last_name : null);
  const fullName =
    values?.fullName ??
    getFullName(firstName, lastName, typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null);
  const phone =
    values?.phone ??
    (typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : null);
  const hasReferralCode = Object.prototype.hasOwnProperty.call(values ?? {}, "referralCode");

  const { data: existingProfile, error: existingError } = await supabase
    .from("customer_profiles")
    .select(customerProfileSelect)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to load customer profile: ${existingError.message}`);
  }

  if (existingProfile) {
    const existingRow = existingProfile as CustomerProfileRow;
    const email = values?.email ?? user.email ?? existingRow.email;
    const { data, error } = await supabase
      .from("customer_profiles")
      .update({
        email,
        first_name: firstName ?? existingRow.first_name,
        full_name: fullName ?? existingRow.full_name,
        last_name: lastName ?? existingRow.last_name,
        phone: phone ?? existingRow.phone,
        ...(hasReferralCode ? { referral_code: values?.referralCode ?? null } : {}),
      })
      .eq("auth_user_id", user.id)
      .select(customerProfileSelect)
      .single();

    if (error) {
      throw new Error(`Unable to update customer profile: ${error.message}`);
    }

    return mapCustomerProfile(data as CustomerProfileRow);
  }

  const { data, error } = await supabase
    .from("customer_profiles")
    .insert({
      auth_user_id: user.id,
      email: values?.email ?? user.email ?? null,
      first_name: firstName,
      full_name: fullName,
      last_name: lastName,
      phone,
      referral_code: values?.referralCode ?? null,
    })
    .select(customerProfileSelect)
    .single();

  if (error) {
    throw new Error(`Unable to create customer profile: ${error.message}`);
  }

  return mapCustomerProfile(data as CustomerProfileRow);
}

export async function getDefaultCustomerAddress(customerId: string): Promise<CustomerAddress | null> {
  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase
    .from("customer_addresses")
    .select(customerAddressSelect)
    .eq("customer_id", customerId)
    .eq("is_default", true)
    .maybeSingle();

  if (error) {
    console.warn("Unable to load default customer address:", error.message);
    return null;
  }

  return data ? mapCustomerAddress(data as CustomerAddressRow) : null;
}

export async function getCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase
    .from("customer_addresses")
    .select(customerAddressSelect)
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Unable to load customer addresses:", error.message);
    return [];
  }

  return ((data ?? []) as CustomerAddressRow[]).map(mapCustomerAddress);
}

export async function upsertDefaultCustomerAddress(
  customerId: string,
  values: {
    firstName: string;
    lastName: string;
    phone: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    region: string | null;
    postalCode: string | null;
    country: string;
  },
) {
  const supabase = createSupabaseServiceRoleClient();
  const { data: existingAddress, error: existingError } = await supabase
    .from("customer_addresses")
    .select("id")
    .eq("customer_id", customerId)
    .eq("is_default", true)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to load default customer address: ${existingError.message}`);
  }

  const payload = {
    customer_id: customerId,
    first_name: values.firstName,
    last_name: values.lastName,
    phone: values.phone,
    address_line1: values.addressLine1,
    address_line2: values.addressLine2,
    city: values.city,
    region: values.region,
    postal_code: values.postalCode,
    country: values.country,
    is_default: true,
  };

  if (existingAddress) {
    const { error } = await supabase.from("customer_addresses").update(payload).eq("id", existingAddress.id);

    if (error) {
      throw new Error(`Unable to update default customer address: ${error.message}`);
    }

    return;
  }

  const { error } = await supabase.from("customer_addresses").insert(payload);

  if (error) {
    throw new Error(`Unable to save default customer address: ${error.message}`);
  }
}
