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

function normalizeEmail(value: string) {
  return value.trim().toLowerCase().slice(0, 254);
}

function getMemberPayload(formData: FormData) {
  const firstName = getString(formData, "first_name");
  const lastName = getString(formData, "last_name");
  const referralCode = normalizeReferralCode(getString(formData, "referral_code"));

  if (!firstName || !lastName || !referralCode) {
    return null;
  }

  return {
    first_name: firstName,
    last_name: lastName,
    email: normalizeEmail(getString(formData, "email")) || null,
    phone: getString(formData, "phone") || null,
    referral_code: referralCode,
  };
}

export async function createMemberAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const payload = getMemberPayload(formData);

  if (!payload) {
    redirect("/admin/members?error=member-invalid");
  }

  const { data, error } = await supabase.from("members").insert(payload).select("id").single();

  if (error) {
    redirect("/admin/members?error=member-save-failed");
  }

  revalidatePath("/admin/members");
  redirect(`/admin/members/${data.id}?success=member-saved`);
}

export async function updateMemberAction(memberId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const payload = getMemberPayload(formData);

  if (!payload) {
    redirect(`/admin/members/${memberId}?error=member-invalid`);
  }

  const { error } = await supabase.from("members").update(payload).eq("id", memberId);

  if (error) {
    redirect(`/admin/members/${memberId}?error=member-save-failed`);
  }

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${memberId}`);
  redirect(`/admin/members/${memberId}?success=member-saved`);
}

export async function deleteMemberAction(memberId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("members").delete().eq("id", memberId);

  if (error) {
    redirect(`/admin/members/${memberId}?error=member-delete-failed`);
  }

  revalidatePath("/admin/members");
  redirect("/admin/members?success=member-deleted");
}
