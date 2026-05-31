import type { Metadata } from "next";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin Dashboard | Harmony Lab",
  description: "Harmony Lab ecommerce admin dashboard.",
};

const recentOrders = [
  {
    id: "#HL-1028",
    customer: "Mia Chen",
    date: "May 31, 2026",
    total: "HK$ 580",
    status: "Processing",
  },
  {
    id: "#HL-1027",
    customer: "Avery Wong",
    date: "May 31, 2026",
    total: "HK$ 220",
    status: "Paid",
  },
  {
    id: "#HL-1026",
    customer: "Sofia Lee",
    date: "May 30, 2026",
    total: "HK$ 790",
    status: "Shipped",
  },
  {
    id: "#HL-1025",
    customer: "Nora Lau",
    date: "May 30, 2026",
    total: "HK$ 360",
    status: "Delivered",
  },
  {
    id: "#HL-1024",
    customer: "Chloe Tang",
    date: "May 29, 2026",
    total: "HK$ 430",
    status: "Delivered",
  },
];

const recentCustomers = [
  {
    name: "Mia Chen",
    email: "mia.chen@email.com",
    joined: "May 31, 2026",
    orders: "2",
    referralId: "MIA2026",
  },
  {
    name: "Avery Wong",
    email: "avery.wong@email.com",
    joined: "May 31, 2026",
    orders: "1",
    referralId: "AVERY10",
  },
  {
    name: "Sofia Lee",
    email: "sofia.lee@email.com",
    joined: "May 30, 2026",
    orders: "3",
    referralId: "SOFIA88",
  },
  {
    name: "Nora Lau",
    email: "nora.lau@email.com",
    joined: "May 30, 2026",
    orders: "1",
    referralId: "NORAHL",
  },
  {
    name: "Chloe Tang",
    email: "chloe.tang@email.com",
    joined: "May 29, 2026",
    orders: "2",
    referralId: "CHLOE25",
  },
];

const stats = [
  {
    label: "Number of Orders",
    value: "128",
    link: "View all orders",
    icon: "bag",
  },
  {
    label: "Total Amount Orders",
    value: "HK$ 86,420",
    link: "View transactions",
    icon: "wallet",
  },
  {
    label: "Pending Orders",
    value: "14",
    link: "Review queue",
    icon: "clock",
  },
  {
    label: "New Customers",
    value: "32",
    link: "View customers",
    icon: "users",
  },
];

export default async function AdminPage() {
  await requireAdmin();

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
                  <a>{stat.link} →</a>
                </div>
              </article>
            ))}
      </section>

      <section className="admin-content-grid">
            <div className="admin-panel admin-table-panel">
              <div className="admin-panel-head">
                <h2>Recent Orders</h2>
                <a>View All Orders</a>
              </div>
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
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
                      <td>
                        <b>{order.customer}</b>
                        <span>{order.date}</span>
                      </td>
                      <td>{order.total}</td>
                      <td>
                        <span className={`admin-status ${order.status.toLowerCase()}`}>{order.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-panel admin-table-panel">
              <div className="admin-panel-head">
                <h2>Recent Customers</h2>
                <a>View All Customers</a>
              </div>
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
                  {recentCustomers.map((customer) => (
                    <tr key={customer.email}>
                      <td>
                        <div className="admin-customer-cell">
                          <span>
                            <b>{customer.name}</b>
                            <small>{customer.email}</small>
                          </span>
                        </div>
                      </td>
                      <td>{customer.joined}</td>
                      <td>{customer.orders}</td>
                      <td>
                        <span className="admin-referral">{customer.referralId}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      </section>
    </AdminShell>
  );
}
