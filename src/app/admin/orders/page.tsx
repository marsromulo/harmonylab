import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin-auth";
import { formatOrderDate, formatOrderMoney, getAdminOrders, getOrderStatusLabel } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Orders | Harmony Lab Admin",
  description: "Order management for Harmony Lab admin.",
};

function getCustomerLabel(customerName: string | null, customerEmail: string | null) {
  return customerName || customerEmail || "Guest customer";
}

export default async function AdminOrdersPage() {
  await connection();
  await requireAdmin();
  const orders = await getAdminOrders(100);

  return (
    <AdminShell active="orders">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">ORDER MANAGEMENT</p>
          <h1>Orders</h1>
        </div>
        <span>{orders.length} orders</span>
      </section>

      <section className="admin-panel admin-table-panel admin-orders-panel">
        <div className="admin-panel-head">
          <h2>Order Items</h2>
          <a>Newest First</a>
        </div>

        {orders.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Referral Code</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link className="admin-record-title admin-order-number" href={`/admin/orders/${order.id}`}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td>
                    <b>{getCustomerLabel(order.customerName, order.customerEmail)}</b>
                    {order.customerEmail ? <small>{order.customerEmail}</small> : null}
                  </td>
                  <td>{formatOrderDate(order.createdAt)}</td>
                  <td>{formatOrderMoney(order.totalCents, order.currency)}</td>
                  <td>
                    {order.referralCodeEntered ? (
                      <details className="admin-referral-details">
                        <summary className="admin-referral">{order.referralCodeEntered}</summary>
                        <span className={`admin-referral-payout ${order.referralPayoutStatus}`}>
                          {order.referralPayoutStatus === "paid" ? "Paid" : "Unpaid"}:{" "}
                          {order.referralPointsAwarded}
                        </span>
                      </details>
                    ) : (
                      <span className="admin-empty-text">None</span>
                    )}
                  </td>
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
      </section>
    </AdminShell>
  );
}
