import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatAdminCustomerDate, getAdminCustomers } from "@/lib/admin-customers";
import { formatOrderMoney } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Customers | Harmony Lab Admin",
  description: "Customer records and referral code management for Harmony Lab admin.",
};

type AdminCustomersPageProps = {
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

export default async function AdminCustomersPage({ searchParams }: AdminCustomersPageProps) {
  await connection();
  const [{ error, success }, customers] = await Promise.all([searchParams, getAdminCustomers(100)]);
  const errorMessage = error ? errorMessages[error] : null;
  const successMessage = success ? successMessages[success] : null;

  return (
    <AdminShell active="customers">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">CUSTOMER RECORDS</p>
          <h1>Customers</h1>
        </div>
        <span>{customers.length} customers</span>
      </section>

      {errorMessage ? <p className="admin-form-alert error">{errorMessage}</p> : null}
      {successMessage ? <p className="admin-form-alert success">{successMessage}</p> : null}

      <section className="admin-panel admin-table-panel admin-customers-panel">
        <div className="admin-panel-head">
          <h2>Customer Items</h2>
          <a>Manage Referrals</a>
        </div>

        {customers.length > 0 ? (
          <table className="admin-customers-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Joined</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Points</th>
                <th>Referred By</th>
                <th>Customer Referral ID</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className="admin-customer-cell">
                      <span>
                        <Link className="admin-record-title" href={`/admin/customers/${customer.id}`}>
                          {getCustomerName(customer.fullName, customer.email)}
                        </Link>
                        {customer.email ? <small>{customer.email}</small> : null}
                        {customer.phone ? <small>{customer.phone}</small> : null}
                      </span>
                    </div>
                  </td>
                  <td>{formatAdminCustomerDate(customer.createdAt)}</td>
                  <td>{customer.orderCount}</td>
                  <td>{formatOrderMoney(customer.totalSpentCents)}</td>
                  <td>{customer.referralPointsBalance}</td>
                  <td>
                    {customer.referralCode ? (
                      <span className="admin-referral">{customer.referralCode}</span>
                    ) : (
                      <span className="admin-empty-text">None</span>
                    )}
                  </td>
                  <td>
                    {customer.referralId ? (
                      <span className="admin-referral">{customer.referralId}</span>
                    ) : (
                      <span className="admin-empty-text">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty-state">No customers have registered yet.</p>
        )}
      </section>
    </AdminShell>
  );
}
