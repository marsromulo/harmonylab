import type { User } from "@supabase/supabase-js";
import { createSupabaseAuthServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function isMemberUser(user: Pick<User, "email" | "is_anonymous"> | null) {
  if (!user?.email || user.is_anonymous) {
    return false;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("members")
    .select("id")
    .eq("email", user.email.trim().toLowerCase())
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Unable to check member pricing eligibility:", error.message);
    return false;
  }

  return Boolean(data);
}

export async function isCurrentUserMember() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return isMemberUser(user);
}
