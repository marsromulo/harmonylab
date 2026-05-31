import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";

export function getAdminDisplayName(user: User) {
  const displayName = user.user_metadata?.display_name;
  return typeof displayName === "string" && displayName.trim() ? displayName.trim() : user.email ?? "Harmony Admin";
}

export function getAdminAvatarUrl(user: User) {
  const avatarUrl = user.user_metadata?.avatar_url;
  return typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : "/asset/admin/avatar.png";
}

export async function requireAdmin() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    redirect("/admin/login");
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("email")
    .ilike("email", user.email)
    .maybeSingle();

  if (error || !data) {
    redirect("/admin/login?error=not-admin");
  }

  return {
    user,
    email: user.email,
    supabase,
  };
}
