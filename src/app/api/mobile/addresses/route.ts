import { ensureCustomerProfile } from "@/lib/customers";
import { getMobileUser, getRequiredString, mobileJson, mobileOptions } from "@/lib/mobile-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export function OPTIONS() {
  return mobileOptions();
}

export async function POST(request: Request) {
  const auth = await getMobileUser(request);

  if (auth.response) {
    return auth.response;
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return mobileJson({ error: "Invalid address data." }, { status: 400 });
  }

  const firstName = getRequiredString(body.firstName, 80);
  const lastName = getRequiredString(body.lastName, 80);
  const addressLine1 = getRequiredString(body.addressLine1, 200);
  const city = getRequiredString(body.city, 100);

  if (!firstName || !lastName || !addressLine1 || !city) {
    return mobileJson(
      { error: "First name, last name, address, and city are required." },
      { status: 400 },
    );
  }

  try {
    const profile = await ensureCustomerProfile(auth.user, {
      firstName,
      fullName: `${firstName} ${lastName}`,
      lastName,
      phone: getRequiredString(body.phone, 40),
    });
    const supabase = createSupabaseServiceRoleClient();
    const { count, error: countError } = await supabase
      .from("customer_addresses")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", profile.id);

    if (countError) {
      throw new Error(countError.message);
    }

    const shouldBeDefault = count === 0 || body.isDefault === true;
    const { data: address, error: insertError } = await supabase
      .from("customer_addresses")
      .insert({
        customer_id: profile.id,
        label: getRequiredString(body.label, 50) || null,
        first_name: firstName,
        last_name: lastName,
        phone: getRequiredString(body.phone, 40) || null,
        address_line1: addressLine1,
        address_line2: getRequiredString(body.addressLine2, 200) || null,
        city,
        region: getRequiredString(body.region, 100) || null,
        postal_code: getRequiredString(body.postalCode, 30) || null,
        country: "Hong Kong",
        is_default: count === 0,
      })
      .select(
        "id,label,first_name,last_name,phone,address_line1,address_line2,city,region,postal_code,country,is_default",
      )
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    if (shouldBeDefault && count !== 0) {
      const { error: resetError } = await supabase
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("customer_id", profile.id);

      if (resetError) {
        throw new Error(resetError.message);
      }

      const { error: defaultError } = await supabase
        .from("customer_addresses")
        .update({ is_default: true })
        .eq("id", address.id)
        .eq("customer_id", profile.id);

      if (defaultError) {
        throw new Error(defaultError.message);
      }

      address.is_default = true;
    }

    return mobileJson({ address }, { status: 201 });
  } catch (error) {
    console.error("Mobile address API failed:", error);
    return mobileJson({ error: "Unable to save this address." }, { status: 500 });
  }
}

