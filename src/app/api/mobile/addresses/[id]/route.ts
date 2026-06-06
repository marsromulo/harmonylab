import { ensureCustomerProfile } from "@/lib/customers";
import { getMobileUser, mobileJson, mobileOptions } from "@/lib/mobile-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export function OPTIONS() {
  return mobileOptions();
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getMobileUser(request);

  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const profile = await ensureCustomerProfile(auth.user);
    const supabase = createSupabaseServiceRoleClient();
    const { data: deletedAddress, error } = await supabase
      .from("customer_addresses")
      .delete()
      .eq("id", id)
      .eq("customer_id", profile.id)
      .select("id,is_default")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!deletedAddress) {
      return mobileJson({ error: "Address not found." }, { status: 404 });
    }

    if (deletedAddress.is_default) {
      const { data: nextAddress } = await supabase
        .from("customer_addresses")
        .select("id")
        .eq("customer_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (nextAddress) {
        await supabase.from("customer_addresses").update({ is_default: true }).eq("id", nextAddress.id);
      }
    }

    return mobileJson({ success: true });
  } catch (error) {
    console.error("Mobile address delete failed:", error);
    return mobileJson({ error: "Unable to delete this address." }, { status: 500 });
  }
}

