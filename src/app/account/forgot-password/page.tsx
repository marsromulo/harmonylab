import Link from "next/link";
import { connection } from "next/server";
import { requestPasswordResetAction } from "@/app/account/actions";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  await connection();
  const { error, success } = await searchParams;

  return (
    <div className="page">
      <SiteHeader active="account" />
      <main className="account-page account-auth-page">
        <div className="section-head account-page-head">
          <div>
            <p className="eyebrow">CUSTOMER ACCOUNT</p>
            <h2>Forgot password</h2>
          </div>
        </div>

        {error === "email-required" ? <p className="account-alert error">Please enter your email address.</p> : null}
        {success === "email-sent" ? (
          <p className="account-alert success">
            If an account exists for that email, a password-reset link has been sent.
          </p>
        ) : null}

        <form action={requestPasswordResetAction} className="account-panel account-form account-auth-panel">
          <h3>Reset your password</h3>
          <p>Enter the email used for your Harmony Lab account.</p>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <button type="submit">SEND RESET LINK</button>
          <Link className="account-form-link" href="/account">
            Back to sign in
          </Link>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
