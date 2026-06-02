import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminDashboardData } from "@/lib/admin-dashboard";
import { formatOrderDate, formatOrderMoney, getOrderStatusLabel } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Admin Dashboard | Harmony Lab",
  description: "Harmony Lab ecommerce admin dashboard.",
};

function getCustomerLabel(customerName: string | null, customerEmail: string | null) {
  return customerName || customerEmail || "Guest customer";
}

export default async function AdminPage() {
  await connection();
  const dashboard = await getAdminDashboardData();
  const stats = [
    {
      href: "/admin/orders",
      icon: "bag",
      label: "Number of Orders",
      link: "View all orders",
      value: dashboard.orderCount.toLocaleString("en-HK"),
    },
    {
      href: "/admin/orders",
      icon: "wallet",
      label: "Total Amount Orders",
      link: "View transactions",
      value: formatOrderMoney(dashboard.totalOrderAmountCents),
    },
    {
      href: "/admin/orders",
      icon: "clock",
      label: "Pending Orders",
      link: "Review queue",
      value: dashboard.pendingOrderCount.toLocaleString("en-HK"),
    },
    {
      href: "/admin/customers",
      icon: "users",
      label: "New Customers",
      link: "View customers",
      value: dashboard.newCustomerCount.toLocaleString("en-HK"),
    },
  ];

  return (
    <AdminShell active="dashboard">
      <section className="admin-cards" aria-label="Store performance">
        {stats.map((stat) => (
          <article className="admin-stat-card" key={stat.label}>
            <div className="admin-round">
              <AdminIcon name={stat.icon} />
            </div>
            <div>
              <p>{stat.label}</p>
              <h3>{stat.value}</h3>
              <Link href={stat.href}>{stat.link} →</Link>
            </div>
          </article>
        ))}
      </section>

      <section className="admin-content-grid">
        <div className="admin-panel admin-table-panel">
          <div className="admin-panel-head">
            <h2>Recent Orders</h2>
            <Link href="/admin/orders">View All Orders</Link>
          </div>
          {dashboard.recentOrders.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link className="admin-record-title admin-order-number" href={`/admin/orders/${order.id}`}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>
                      <b>{getCustomerLabel(order.customerName, order.customerEmail)}</b>
                      <span>{formatOrderDate(order.createdAt)}</span>
                    </td>
                    <td>{formatOrderMoney(order.totalCents, order.currency)}</td>
                    <td>
                      <span className={`admin-status ${order.status}`}>{getOrderStatusLabel(order.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="admin-empty-state">No orders have been placed yet.</p>
          )}
        </div>

        <div className="admin-panel admin-table-panel">
          <div className="admin-panel-head">
            <h2>Recent Customers</h2>
            <Link href="/admin/customers">View All Customers</Link>
          </div>
          {dashboard.recentCustomers.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Joined</th>
                  <th>Orders</th>
                  <th>Referral ID</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="admin-customer-cell">
                        <span>
                          <Link className="admin-record-title" href={`/admin/customers/${customer.id}`}>
                            {customer.fullName || customer.email || "Customer"}
                          </Link>
                          {customer.email ? <small>{customer.email}</small> : null}
                        </span>
                      </div>
                    </td>
                    <td>{formatOrderDate(customer.createdAt)}</td>
                    <td>{customer.orderCount}</td>
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
        </div>
      </section>
    </AdminShell>
  );
}
