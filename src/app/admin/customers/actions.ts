"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeReferralCode(value: string) {
  return value.replace(/[^\w-]/g, "").toUpperCase().slice(0, 40);
}

export async function updateCustomerReferralAction(customerId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const referralId = normalizeReferralCode(getString(formData, "referral_id"));
  const { error } = await supabase
    .from("customer_profiles")
    .update({ referral_id: referralId || null })
    .eq("id", customerId);

  if (error) {
    redirect(`/admin/customers/${customerId}?error=referral-update-failed`);
  }

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/account");
  redirect(`/admin/customers/${customerId}?success=referral-updated`);
}
