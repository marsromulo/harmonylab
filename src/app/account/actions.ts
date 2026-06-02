"use server";

import { redirect } from "next/navigation";
import { ensureCustomerProfile } from "@/lib/customers";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getRedirectPath(formData: FormData) {
  const redirectTo = getString(formData, "redirect_to");

  if (redirectTo === "/checkout") {
    return "/checkout";
  }

  return "/account";
}

function getRedirectUrl(path: string, key: "error" | "success", value: string) {
  return `${path}?${key}=${encodeURIComponent(value)}`;
}

export async function registerCustomerAction(formData: FormData) {
  const redirectPath = getRedirectPath(formData);
  const firstName = getString(formData, "first_name");
  const lastName = getString(formData, "last_name");
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const passwordConfirmation = getString(formData, "password_confirmation");
  const phone = getString(formData, "phone");
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  if (!firstName || !lastName || !email || password.length < 8) {
    redirect(getRedirectUrl(redirectPath, "error", "register-invalid"));
  }

  if (password !== passwordConfirmation) {
    redirect(getRedirectUrl(redirectPath, "error", "register-password-mismatch"));
  }

  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        full_name: fullName,
        last_name: lastName,
      },
    },
  });

  if (error) {
    redirect(getRedirectUrl(redirectPath, "error", "register-failed"));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user ?? data.user) {
    try {
      await ensureCustomerProfile(user ?? data.user!, { firstName, fullName, lastName, phone });
    } catch (profileError) {
      console.warn(profileError instanceof Error ? profileError.message : "Unable to create customer profile.");
    }
  }

  redirect(getRedirectUrl(redirectPath, "success", data.session ? "registered" : "confirm-email"));
}

export async function loginCustomerAction(formData: FormData) {
  const redirectPath = getRedirectPath(formData);
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!email || !password) {
    redirect(getRedirectUrl(redirectPath, "error", "login-invalid"));
  }

  const supabase = await createSupabaseAuthServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(getRedirectUrl(redirectPath, "error", "login-failed"));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    try {
      await ensureCustomerProfile(user);
    } catch (profileError) {
      console.warn(profileError instanceof Error ? profileError.message : "Unable to create customer profile.");
    }
  }

  redirect(redirectPath);
}

export async function logoutCustomerAction() {
  const supabase = await createSupabaseAuthServerClient();
  await supabase.auth.signOut();
  redirect("/account");
}
