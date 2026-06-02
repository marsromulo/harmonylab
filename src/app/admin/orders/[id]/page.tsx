import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatOrderDate, formatOrderMoney, getAdminOrderDetails, getOrderStatusLabel } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Order Details | Harmony Lab Admin",
  description: "Full order record for Harmony Lab admin.",
};

type AdminOrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getCustomerLabel(name: string | null, email: string | null) {
  return name || email || "Customer";
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  await connection();
  const { id } = await params;
  const details = await getAdminOrderDetails(id);

  if (!details) {
    notFound();
  }

  const { customer, items, order, referralOwner } = details;

  return (
    <AdminShell active="orders">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">ORDER DETAILS</p>
          <h1>{order.orderNumber}</h1>
        </div>
        <Link className="admin-btn admin-link-btn" href="/admin/orders">
          Back to Orders
        </Link>
      </section>

      <section className="admin-detail-grid">
        <div className="admin-panel admin-detail-panel">
          <h2>Order Record</h2>
          <dl className="admin-detail-list">
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`admin-status ${order.status}`}>{getOrderStatusLabel(order.status)}</span>
              </dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatOrderDate(order.createdAt)}</dd>
            </div>
            <div>
              <dt>Customer</dt>
              <dd>
                {customer ? (
                  <Link className="admin-record-link" href={`/admin/customers/${customer.id}`}>
                    {getCustomerLabel(customer.fullName, customer.email)}
                  </Link>
                ) : (
                  getCustomerLabel(order.customerName, order.customerEmail)
                )}
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{order.customerEmail ?? customer?.email ?? "Not provided"}</dd>
            </div>
          </dl>
        </div>

        <div className="admin-panel admin-detail-panel">
          <h2>Referral</h2>
          <dl className="admin-detail-list">
            <div>
              <dt>Entered code</dt>
              <dd>{order.referralCodeEntered || "None"}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>
                {referralOwner ? (
                  <Link className="admin-record-link" href={`/admin/customers/${referralOwner.id}`}>
                    {getCustomerLabel(referralOwner.fullName, referralOwner.email)}
                  </Link>
                ) : (
                  "None"
                )}
              </dd>
            </div>
            <div>
              <dt>Owner code</dt>
              <dd>{referralOwner?.referralId ?? "None"}</dd>
            </div>
            <div>
              <dt>Points awarded</dt>
              <dd>{order.referralPointsAwarded}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="admin-panel admin-detail-panel">
        <h2>Shipping Address</h2>
        <dl className="admin-detail-list">
          <div>
            <dt>Address</dt>
            <dd>{order.shippingAddressLine1 ?? "Not provided"}</dd>
          </div>
          {order.shippingAddressLine2 ? (
            <div>
              <dt>Address line 2</dt>
              <dd>{order.shippingAddressLine2}</dd>
            </div>
          ) : null}
          <div>
            <dt>District / City</dt>
            <dd>{order.shippingCity ?? "Not provided"}</dd>
          </div>
          <div>
            <dt>Region</dt>
            <dd>{order.shippingRegion ?? "Not provided"}</dd>
          </div>
          <div>
            <dt>Postal code</dt>
            <dd>{order.shippingPostalCode ?? "Not provided"}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>{order.shippingCountry ?? "Not provided"}</dd>
          </div>
          <div>
            <dt>Delivery notes</dt>
            <dd>{order.deliveryNotes ?? "None"}</dd>
          </div>
        </dl>
      </section>

      <section className="admin-panel admin-table-panel">
        <div className="admin-panel-head">
          <h2>Order Items</h2>
          <a>{items.length} items</a>
        </div>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <b>{item.productName}</b>
                </td>
                <td>{item.quantity}</td>
                <td>{formatOrderMoney(item.unitPriceCents, order.currency)}</td>
                <td>{formatOrderMoney(item.lineTotalCents, order.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="admin-order-totals">
          <div>
            <span>Subtotal</span>
            <strong>{formatOrderMoney(order.subtotalCents, order.currency)}</strong>
          </div>
          <div>
            <span>Shipping</span>
            <strong>{formatOrderMoney(order.shippingCents, order.currency)}</strong>
          </div>
          <div>
            <span>Discount</span>
            <strong>{formatOrderMoney(order.discountCents, order.currency)}</strong>
          </div>
          <div className="grand">
            <span>Total</span>
            <strong>{formatOrderMoney(order.totalCents, order.currency)}</strong>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
