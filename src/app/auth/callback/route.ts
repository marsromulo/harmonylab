import { NextResponse } from "next/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";

function getSafeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/account/reset-password?error=invalid-link", requestUrl.origin));
  }

  const supabase = await createSupabaseAuthServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/account/reset-password?error=invalid-link", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
