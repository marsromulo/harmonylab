import Link from "next/link";
import { connection } from "next/server";
import { updateCustomerPasswordAction } from "@/app/account/actions";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "invalid-link": "This password-reset link is invalid or has expired. Please request a new one.",
  "password-invalid": "Your new password must contain at least 6 characters.",
  "password-mismatch": "Please make sure both password fields match.",
  "update-failed": "We could not update your password. Please request a new reset link.",
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  await connection();
  const [{ error }, supabase] = await Promise.all([searchParams, createSupabaseAuthServerClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const errorMessage = error ? errorMessages[error] : null;

  return (
    <div className="page">
      <SiteHeader active="account" />
      <main className="account-page account-auth-page">
        <div className="section-head account-page-head">
          <div>
            <p className="eyebrow">CUSTOMER ACCOUNT</p>
            <h2>Choose a new password</h2>
          </div>
        </div>

        {errorMessage ? <p className="account-alert error">{errorMessage}</p> : null}

        {user ? (
          <form action={updateCustomerPasswordAction} className="account-panel account-form account-auth-panel">
            <h3>New password</h3>
            <label>
              Password
              <input name="password" type="password" autoComplete="new-password" minLength={6} required />
            </label>
            <label>
              Confirm password
              <input name="password_confirmation" type="password" autoComplete="new-password" minLength={6} required />
            </label>
            <button type="submit">UPDATE PASSWORD</button>
          </form>
        ) : (
          <section className="account-panel account-auth-panel">
            <h3>Request a new link</h3>
            <p>Open the link from your reset email, or request another password-reset email.</p>
            <Link className="account-guest-button" href="/account/forgot-password">
              REQUEST RESET LINK
            </Link>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
