import Link from "next/link";
import { connection } from "next/server";
import { loginCustomerAction, logoutCustomerAction, registerCustomerAction } from "@/app/account/actions";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentCustomer } from "@/lib/customers";
import { formatOrderDate, formatOrderMoney, getCustomerOrders, getOrderStatusLabel } from "@/lib/orders";

type AccountPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "login-failed": "We could not sign you in with those details.",
  "login-invalid": "Please enter your email and password.",
  "register-failed": "We could not create this account. Try again or sign in.",
  "register-invalid": "Please enter your first name, last name, email, and a password with at least 8 characters.",
  "register-password-mismatch": "Please make sure both password fields match.",
};

const successMessages: Record<string, string> = {
  "confirm-email": "Account created. Check your email if confirmation is enabled.",
  registered: "Account created. You are signed in.",
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  await connection();
  const [{ error, success }, { profile, user }] = await Promise.all([searchParams, getCurrentCustomer()]);
  const orders = profile ? await getCustomerOrders(profile.id, 10) : [];
  const errorMessage = error ? errorMessages[error] : null;
  const successMessage = success ? successMessages[success] : null;

  return (
    <div className="page">
      <SiteHeader active="account" />
      <main className="account-page">
        <div className="section-head account-page-head">
          <div>
            <p className="eyebrow">CUSTOMER ACCOUNT</p>
            <h2>Account</h2>
          </div>
        </div>

        {errorMessage ? <p className="account-alert error">{errorMessage}</p> : null}
        {successMessage ? <p className="account-alert success">{successMessage}</p> : null}

        {user ? (
          <section className="account-stack">
            <div className="account-panel account-profile">
              <div>
                <h3>{profile?.fullName ?? user.email}</h3>
                <p>{profile?.email ?? user.email}</p>
                {profile?.phone ? <p>{profile.phone}</p> : null}
                {profile?.referralId ? <span>Referral ID: {profile.referralId}</span> : null}
              </div>
              <div className="account-actions">
                <Link className="cart-checkout" href="/checkout">
                  CHECKOUT
                </Link>
                <form action={logoutCustomerAction}>
                  <button className="cart-clear" type="submit">
                    Sign out
                  </button>
                </form>
              </div>
            </div>

            <div className="account-panel account-orders">
              <div className="account-orders-head">
                <h3>Order History</h3>
                <span>{orders.length} recent orders</span>
              </div>
              {orders.length > 0 ? (
                <div className="account-order-list">
                  {orders.map((order) => (
                    <article className="account-order-card" key={order.id}>
                      <div>
                        <b>{order.orderNumber}</b>
                        <span>{formatOrderDate(order.createdAt)}</span>
                      </div>
                      <div>
                        <strong>{formatOrderMoney(order.totalCents, order.currency)}</strong>
                        <span className={`account-order-status ${order.status}`}>{getOrderStatusLabel(order.status)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="account-empty-state">No orders yet.</p>
              )}
            </div>
          </section>
        ) : (
          <section className="account-grid">
            <form action={loginCustomerAction} className="account-panel account-form">
              <h3>Sign in</h3>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Password
                <input name="password" type="password" required />
              </label>
              <button type="submit">SIGN IN</button>
            </form>

            <form action={registerCustomerAction} className="account-panel account-form">
              <h3>Create account</h3>
              <div className="account-form-split">
                <label>
                  First name
                  <input name="first_name" required />
                </label>
                <label>
                  Last name
                  <input name="last_name" required />
                </label>
              </div>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Phone
                <input name="phone" type="tel" />
              </label>
              <label>
                Password
                <input minLength={8} name="password" type="password" required />
              </label>
              <label>
                Confirm password
                <input minLength={8} name="password_confirmation" type="password" required />
              </label>
              <button type="submit">REGISTER</button>
            </form>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
