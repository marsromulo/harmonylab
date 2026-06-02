import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatAdminCustomerDate, getAdminCustomerDetails } from "@/lib/admin-customers";
import { formatOrderDate, formatOrderMoney } from "@/lib/orders";
import { updateCustomerReferralAction } from "../actions";

export const metadata: Metadata = {
  title: "Customer Details | Harmony Lab Admin",
  description: "Customer profile, addresses, orders, and referral code management.",
};

type AdminCustomerDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "referral-update-failed": "Unable to update referral code. Check that the code is not already assigned to another customer.",
};

const successMessages: Record<string, string> = {
  "referral-updated": "Referral code updated.",
};

function getCustomerName(fullName: string | null, email: string | null) {
  return fullName || email || "Customer";
}

function getStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function AdminCustomerDetailPage({ params, searchParams }: AdminCustomerDetailPageProps) {
  await connection();
  const [{ id }, { error, success }] = await Promise.all([params, searchParams]);
  const details = await getAdminCustomerDetails(id);

  if (!details) {
    notFound();
  }

  const { addresses, customer, orders } = details;
  const errorMessage = error ? errorMessages[error] : null;
  const successMessage = success ? successMessages[success] : null;

  return (
    <AdminShell active="customers">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">CUSTOMER DETAILS</p>
          <h1>{getCustomerName(customer.fullName, customer.email)}</h1>
        </div>
        <Link className="admin-btn admin-link-btn" href="/admin/customers">
          Back to Customers
        </Link>
      </section>

      {errorMessage ? <p className="admin-form-alert error">{errorMessage}</p> : null}
      {successMessage ? <p className="admin-form-alert success">{successMessage}</p> : null}

      <section className="admin-detail-grid">
        <div className="admin-panel admin-detail-panel">
          <h2>Customer Profile</h2>
          <dl className="admin-detail-list">
            <div>
              <dt>Email</dt>
              <dd>{customer.email ?? "Not provided"}</dd>
            </div>
            <div>
              <dt>First name</dt>
              <dd>{customer.firstName ?? "Not provided"}</dd>
            </div>
            <div>
              <dt>Last name</dt>
              <dd>{customer.lastName ?? "Not provided"}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{customer.phone ?? "Not provided"}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{formatAdminCustomerDate(customer.createdAt)}</dd>
            </div>
            <div>
              <dt>Referral points</dt>
              <dd>{customer.referralPointsBalance}</dd>
            </div>
          </dl>
        </div>

        <div className="admin-panel admin-detail-panel">
          <h2>Referral Code</h2>
          <form action={updateCustomerReferralAction.bind(null, customer.id)} className="admin-detail-form">
            <label>
              Referral code
              <input name="referral_id" placeholder="Blank" defaultValue={customer.referralId ?? ""} />
            </label>
            <button className="admin-btn" type="submit">
              Save Referral Code
            </button>
          </form>
        </div>
      </section>

      <section className="admin-panel admin-detail-panel">
        <div className="admin-panel-head">
          <h2>Addresses</h2>
          <a>{addresses.length} saved</a>
        </div>
        {addresses.length > 0 ? (
          <div className="admin-address-grid">
            {addresses.map((address) => (
              <article className="admin-address-card" key={address.id}>
                <div>
                  <b>{address.label || (address.isDefault ? "Default address" : "Address")}</b>
                  {address.isDefault ? <span>Default</span> : null}
                </div>
                <p>
                  {[address.firstName, address.lastName].filter(Boolean).join(" ")}
                  {address.phone ? `, ${address.phone}` : ""}
                </p>
                <p>{address.addressLine1}</p>
                {address.addressLine2 ? <p>{address.addressLine2}</p> : null}
                <p>{[address.city, address.region, address.postalCode].filter(Boolean).join(", ")}</p>
                <p>{address.country}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-empty-state">No saved addresses yet.</p>
        )}
      </section>

      <section className="admin-panel admin-table-panel">
        <div className="admin-panel-head">
          <h2>Orders</h2>
          <a>{orders.length} orders</a>
        </div>
        {orders.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link className="admin-record-title" href={`/admin/orders/${order.id}`}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td>{formatOrderDate(order.createdAt)}</td>
                  <td>{formatOrderMoney(order.totalCents, order.currency)}</td>
                  <td>
                    <span className={`admin-status ${order.status}`}>{getStatusLabel(order.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty-state">No orders yet.</p>
        )}
      </section>
    </AdminShell>
  );
}
