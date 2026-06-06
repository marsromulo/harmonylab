import Link from "next/link";
import { connection } from "next/server";
import {
  createCustomerAddressAction,
  deleteCustomerAddressAction,
  loginCustomerAction,
  logoutCustomerAction,
  payPendingOrderAction,
  registerCustomerAction,
  updateCustomerAddressAction,
} from "@/app/account/actions";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentCustomer, getCustomerAddresses, type CustomerAddress } from "@/lib/customers";
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
  "address-delete-failed": "We could not delete that address.",
  "address-invalid": "Please enter first name, last name, shipping address, and city.",
  "address-save-failed": "We could not save that address.",
  "payment-cancelled": "Payment was cancelled. You can pay again from your order history.",
  "payment-order-not-found": "We could not find that order.",
  "payment-order-not-payable": "That order cannot be paid online.",
  "payment-session-failed": "We could not start payment for that order.",
};

const successMessages: Record<string, string> = {
  "address-deleted": "Address deleted.",
  "address-saved": "Address saved.",
  "order-already-paid": "That order is already paid.",
  "confirm-email": "Account created. Check your email if confirmation is enabled.",
  registered: "Account created. You are signed in.",
};

const regionOptions = ["Hong Kong", "Kowloon", "New Territories"];
const countryOptions = ["Hong Kong", "Philippines"];

function AddressFields({ address, profile }: { address?: CustomerAddress; profile?: { firstName: string | null; lastName: string | null; phone: string | null } | null }) {
  return (
    <>
      <label>
        Label
        <input name="label" placeholder="Home, office, etc." defaultValue={address?.label ?? ""} />
      </label>
      <div className="account-form-split">
        <label>
          First name
          <input name="first_name" required defaultValue={address?.firstName ?? profile?.firstName ?? ""} />
        </label>
        <label>
          Last name
          <input name="last_name" required defaultValue={address?.lastName ?? profile?.lastName ?? ""} />
        </label>
      </div>
      <label>
        Phone
        <input name="phone" type="tel" defaultValue={address?.phone ?? profile?.phone ?? ""} />
      </label>
      <label>
        Shipping address
        <input name="address_line1" required defaultValue={address?.addressLine1 ?? ""} />
      </label>
      <label>
        Address line 2
        <input name="address_line2" defaultValue={address?.addressLine2 ?? ""} />
      </label>
      <div className="account-form-split">
        <label>
          District / City
          <input name="city" required defaultValue={address?.city ?? ""} />
        </label>
        <label>
          Region
          <select name="region" defaultValue={address?.region ?? "Hong Kong"}>
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="account-form-split">
        <label>
          Postal code
          <input name="postal_code" defaultValue={address?.postalCode ?? ""} />
        </label>
        <label>
          Country
          <select name="country" required defaultValue="Hong Kong">
            {countryOptions.map((country) => (
              <option key={country} value={country} disabled={country === "Philippines"}>
                {country}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="account-checkbox-row">
        <input name="is_default" type="checkbox" defaultChecked={address?.isDefault ?? false} />
        Use as default shipping address
      </label>
    </>
  );
}

function canPayOrder(order: { paymentStatus: string; status: string }) {
  return order.paymentStatus !== "paid" && !["paid", "cancelled", "refunded"].includes(order.status);
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  await connection();
  const [{ error, success }, { profile, user }] = await Promise.all([searchParams, getCurrentCustomer()]);
  const orders = profile ? await getCustomerOrders(profile.id, 10) : [];
  const addresses = profile ? await getCustomerAddresses(profile.id) : [];
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

            <div className="account-panel account-addresses">
              <div className="account-orders-head">
                <h3>Shipping Addresses</h3>
                <span>{addresses.length} saved</span>
              </div>

              {addresses.length > 0 ? (
                <div className="account-address-list">
                  {addresses.map((address) => (
                    <details className="account-address-card" key={address.id}>
                      <summary>
                        <span>
                          <b>{address.isDefault ? "Default address" : "Saved address"}</b>
                          <small>
                            {[address.addressLine1, address.city, address.region].filter(Boolean).join(", ")}
                          </small>
                        </span>
                        {address.isDefault ? <em>Default</em> : null}
                      </summary>
                      <form action={updateCustomerAddressAction.bind(null, address.id)} className="account-form account-address-form">
                        <AddressFields address={address} profile={profile} />
                        <div className="account-address-actions">
                          <button className="account-address-save-button" type="submit">
                            SAVE ADDRESS
                          </button>
                          <button
                            className="cart-clear account-delete-address"
                            form={`delete-address-${address.id}`}
                            type="submit"
                          >
                            Delete address
                          </button>
                        </div>
                      </form>
                      <form action={deleteCustomerAddressAction.bind(null, address.id)} id={`delete-address-${address.id}`} />
                    </details>
                  ))}
                </div>
              ) : (
                <p className="account-empty-state">No saved shipping addresses yet.</p>
              )}

              <details className="account-address-create">
                <summary>Add new address</summary>
                <form action={createCustomerAddressAction} className="account-form account-address-form">
                  <AddressFields profile={profile} />
                  <button type="submit">ADD ADDRESS</button>
                </form>
              </details>
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
                      <div className="account-order-summary">
                        <div>
                          <strong>{formatOrderMoney(order.totalCents, order.currency)}</strong>
                          <span className={`account-order-status ${order.status}`}>{getOrderStatusLabel(order.status)}</span>
                        </div>
                        {canPayOrder(order) ? (
                          <form action={payPendingOrderAction.bind(null, order.id)}>
                            <button className="account-pay-now" type="submit">
                              PAY NOW
                            </button>
                          </form>
                        ) : null}
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
