import type { Metadata } from "next";
import Image from "next/image";
import { loginAdminAction } from "./actions";

export const metadata: Metadata = {
  title: "Admin Login | Harmony Lab",
  description: "Sign in to Harmony Lab admin.",
};

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Invalid email or password.",
  missing: "Email and password are required.",
  "not-admin": "This account is not allowed to access admin.",
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : null;

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <Image src="/asset/logo.png" alt="Harmony Lab" width={220} height={40} priority unoptimized />
        <div>
          <p className="admin-eyebrow">ADMIN ACCESS</p>
          <h1>Sign in</h1>
        </div>
        {errorMessage ? <p className="admin-login-error">{errorMessage}</p> : null}
        <form action={loginAdminAction} className="admin-product-form">
          <input type="hidden" name="next" value={params.next ?? "/admin"} />
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="admin-btn" type="submit">
            Sign In
          </button>
        </form>
      </section>
    </main>
  );
}