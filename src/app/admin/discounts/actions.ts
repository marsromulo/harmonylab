"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import type { DiscountCalculationType, DiscountType } from "@/lib/discounts";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseDecimal(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function getDiscountPayload(formData: FormData) {
  const name = getString(formData, "name").slice(0, 100);
  const discountType = getString(formData, "discount_type") as DiscountType;
  const requestedCalculationType = getString(
    formData,
    "calculation_type",
  ) as DiscountCalculationType;
  const minimumSubtotal = parseDecimal(getString(formData, "minimum_subtotal"));
  const enteredValue = parseDecimal(getString(formData, "value"));
  const enteredPriority = Number.parseInt(getString(formData, "priority") || "0", 10);
  const validDiscountTypes: DiscountType[] = [
    "shipping",
    "referral",
    "minimum_order",
  ];

  if (
    !name ||
    !validDiscountTypes.includes(discountType) ||
    !Number.isFinite(minimumSubtotal) ||
    minimumSubtotal < 0 ||
    !Number.isInteger(enteredPriority)
  ) {
    return null;
  }

  const calculationType: DiscountCalculationType =
    discountType === "shipping" ? "free_shipping" : requestedCalculationType;

  if (
    discountType !== "shipping" &&
    calculationType !== "fixed" &&
    calculationType !== "percentage"
  ) {
    return null;
  }

  if (
    discountType !== "shipping" &&
    (!Number.isFinite(enteredValue) ||
      enteredValue <= 0 ||
      (calculationType === "percentage" && enteredValue > 100))
  ) {
    return null;
  }

  return {
    calculation_type: calculationType,
    country: discountType === "shipping" ? "Hong Kong" : null,
    currency: "HKD",
    discount_type: discountType,
    is_active: formData.get("is_active") === "on",
    minimum_subtotal_cents: Math.round(minimumSubtotal * 100),
    name,
    priority: enteredPriority,
    value: calculationType === "free_shipping" ? 0 : Math.round(enteredValue * 100),
  };
}

export async function createDiscountRuleAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const payload = getDiscountPayload(formData);

  if (!payload) {
    redirect("/admin/discounts?error=discount-invalid");
  }

  const { data, error } = await supabase
    .from("discount_rules")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    redirect("/admin/discounts?error=discount-save-failed");
  }

  revalidatePath("/admin/discounts");
  revalidatePath("/checkout");
  redirect(`/admin/discounts/${data.id}?success=discount-saved`);
}

export async function updateDiscountRuleAction(ruleId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const payload = getDiscountPayload(formData);

  if (!payload) {
    redirect(`/admin/discounts/${ruleId}?error=discount-invalid`);
  }

  const { error } = await supabase.from("discount_rules").update(payload).eq("id", ruleId);

  if (error) {
    redirect(`/admin/discounts/${ruleId}?error=discount-save-failed`);
  }

  revalidatePath("/admin/discounts");
  revalidatePath(`/admin/discounts/${ruleId}`);
  revalidatePath("/checkout");
  redirect(`/admin/discounts/${ruleId}?success=discount-saved`);
}

export async function deleteDiscountRuleAction(ruleId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("discount_rules").delete().eq("id", ruleId);

  if (error) {
    redirect(`/admin/discounts/${ruleId}?error=discount-delete-failed`);
  }

  revalidatePath("/admin/discounts");
  revalidatePath("/checkout");
  redirect("/admin/discounts?success=discount-deleted");
}
