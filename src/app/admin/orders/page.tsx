import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin-auth";
import { ADMIN_ORDERS_PAGE_SIZE, adminOrderFilters, type AdminOrderFilter, formatOrderDate, formatOrderMoney, getAdminOrdersPage, getOrderStatusLabel } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Orders | Harmony Lab Admin",
  description: "Order management for Harmony Lab admin.",
};

function getCustomerLabel(customerName: string | null, customerEmail: string | null) {
  return customerName || customerEmail || "Guest customer";
}

function ordersHref(status: AdminOrderFilter, page = 1) {
  return `/admin/orders?status=${status}&page=${page}`;
}

const filterLabels: Record<AdminOrderFilter, string> = {
  all: "All orders", unpaid: "Unpaid", paid: "Paid", shipped: "Shipped", completed: "Completed",
};

export default async function AdminOrdersPage({ searchParams }: {
  searchParams: Promise<{ status?: string | string[]; page?: string | string[] }>;
}) {
  await connection();
  await requireAdmin();
  const params = await searchParams;
  const status = adminOrderFilters.find((filter) => filter === params.status) ?? "all";
  const requestedPage = typeof params.page === "string" && /^\d+$/.test(params.page) ? Number(params.page) : 1;
  const { orders, total, page, totalPages } = await getAdminOrdersPage(status, requestedPage);

  return (
    <AdminShell active="orders">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">ORDER MANAGEMENT</p>
          <h1>Orders</h1>
        </div>
        <span>{total} {status === "all" ? "orders" : `${filterLabels[status].toLowerCase()} orders`}</span>
      </section>

      <section className="admin-panel admin-table-panel admin-orders-panel">
        <div className="admin-panel-head">
          <h2>Order Items</h2>
          <span className="admin-orders-sort">Newest First</span>
        </div>

        <nav className="admin-order-filters" aria-label="Filter orders by status">
          {adminOrderFilters.map((filter) => (
            <Link key={filter} href={ordersHref(filter)} aria-current={status === filter ? "page" : undefined}>
              {filterLabels[filter]}
            </Link>
          ))}
        </nav>

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
                    <span className={`admin-status ${order.status}`}>
                      {order.status === "pending" ? "Unpaid" : order.status === "delivered" ? "Completed" : getOrderStatusLabel(order.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty-state">{status === "all" ? "No orders have been placed yet." : `No ${filterLabels[status].toLowerCase()} orders found.`}</p>
        )}
        <div className="admin-orders-pagination">
          <span>
            Showing {orders.length ? (page - 1) * ADMIN_ORDERS_PAGE_SIZE + 1 : 0}–{orders.length ? (page - 1) * ADMIN_ORDERS_PAGE_SIZE + orders.length : 0} of {total} orders
          </span>
          <nav aria-label="Orders pagination">
            {page > 1 ? <Link href={ordersHref(status, page - 1)}>Previous</Link> : <span aria-disabled="true">Previous</span>}
            <span>Page {page} of {totalPages}</span>
            {page < totalPages ? <Link href={ordersHref(status, page + 1)}>Next</Link> : <span aria-disabled="true">Next</span>}
          </nav>
        </div>
      </section>
    </AdminShell>
  );
}
