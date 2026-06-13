import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { payPendingOrderAction } from "@/app/account/actions";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentCustomer } from "@/lib/customers";
import {
  formatCustomerPaymentReference,
  formatOrderDate,
  formatOrderMoney,
  getCustomerOrderDetails,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getPaymentProviderLabel,
} from "@/lib/orders";

export const metadata: Metadata = {
  title: "Order Details | Harmony Lab",
  description: "View your Harmony Lab order details.",
};

type CustomerOrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function canPayOrder(order: { paymentStatus: string; status: string }) {
  return order.paymentStatus !== "paid" && !["paid", "cancelled", "refunded"].includes(order.status);
}

export default async function CustomerOrderDetailPage({ params }: CustomerOrderDetailPageProps) {
  await connection();
  const [{ id }, { profile, user }] = await Promise.all([params, getCurrentCustomer()]);

  if (!user || !profile) {
    redirect("/account?error=login-invalid");
  }

  const details = await getCustomerOrderDetails(profile.id, id);

  if (!details) {
    notFound();
  }

  const { items, order } = details;

  return (
    <div className="page">
      <SiteHeader active="account" />
      <main className="account-page account-order-detail-page">
        <div className="account-order-detail-head">
          <div>
            <p className="eyebrow">ORDER HISTORY</p>
            <h2>{order.orderNumber}</h2>
            <p>Placed on {formatOrderDate(order.createdAt)}</p>
          </div>
          <div className="account-order-detail-actions">
            {canPayOrder(order) ? (
              <form action={payPendingOrderAction.bind(null, order.id)}>
                <button className="account-pay-now" type="submit">
                  PAY NOW
                </button>
              </form>
            ) : null}
            <Link className="account-order-back" href="/account">
              Back to Account
            </Link>
          </div>
        </div>

        <section className="account-order-detail-grid">
          <div className="account-panel account-order-detail-panel">
            <h3>Order Information</h3>
            <dl className="account-order-detail-list">
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={`account-order-status ${order.status}`}>{getOrderStatusLabel(order.status)}</span>
                </dd>
              </div>
              <div>
                <dt>Customer</dt>
                <dd>{order.customerName ?? profile.fullName ?? "Customer"}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{order.customerEmail ?? profile.email ?? "Not provided"}</dd>
              </div>
              {order.referralCodeEntered ? (
                <div>
                  <dt>Referral code</dt>
                  <dd>{order.referralCodeEntered}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="account-panel account-order-detail-panel">
            <h3>Payment Information</h3>
            <dl className="account-order-detail-list">
              <div>
                <dt>Payment method</dt>
                <dd>{getPaymentMethodLabel(order.paymentMethod)}</dd>
              </div>
              <div>
                <dt>Payment status</dt>
                <dd>{order.paymentStatus}</dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd>{getPaymentProviderLabel(order.paymentProvider)}</dd>
              </div>
              <div>
                <dt>Invoice reference</dt>
                <dd>{order.wonderOrderNumber ?? order.orderNumber}</dd>
              </div>
              <div>
                <dt>Transaction reference</dt>
                <dd>{formatCustomerPaymentReference(order.wonderTransactionId)}</dd>
              </div>
              <div>
                <dt>Paid on</dt>
                <dd>{order.paidAt ? formatOrderDate(order.paidAt) : "Not paid"}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="account-panel account-order-detail-panel">
          <h3>Shipping &amp; Fulfillment</h3>
          <dl className="account-order-detail-list account-order-shipping-list">
            <div>
              <dt>Address</dt>
              <dd>
                {[
                  order.shippingAddressLine1,
                  order.shippingAddressLine2,
                  order.shippingCity,
                  order.shippingRegion,
                  order.shippingPostalCode,
                  order.shippingCountry,
                ]
                  .filter(Boolean)
                  .join(", ") || "Not provided"}
              </dd>
            </div>
            <div>
              <dt>Delivery notes</dt>
              <dd>{order.deliveryNotes ?? "None"}</dd>
            </div>
            <div>
              <dt>Carrier</dt>
              <dd>{order.fulfillmentCarrier ?? "Not assigned"}</dd>
            </div>
            <div>
              <dt>Tracking number</dt>
              <dd>{order.fulfillmentTrackingNumber ?? "Not available"}</dd>
            </div>
            <div>
              <dt>Shipped on</dt>
              <dd>{order.shippedAt ? formatOrderDate(order.shippedAt) : "Not shipped"}</dd>
            </div>
            <div>
              <dt>Delivered on</dt>
              <dd>{order.deliveredAt ? formatOrderDate(order.deliveredAt) : "Not delivered"}</dd>
            </div>
          </dl>
          {order.fulfillmentTrackingUrl ? (
            <a className="account-order-track" href={order.fulfillmentTrackingUrl} rel="noreferrer" target="_blank">
              Track shipment
            </a>
          ) : null}
        </section>

        <section className="account-panel account-order-items-panel">
          <div className="account-orders-head">
            <h3>Order Items</h3>
            <span>{items.length} items</span>
          </div>
          <div className="account-order-items-table-wrap">
            <table className="account-order-items-table">
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
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                    <td>{formatOrderMoney(item.unitPriceCents, order.currency)}</td>
                    <td>{formatOrderMoney(item.lineTotalCents, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="account-order-totals">
            <div>
              <span>Subtotal</span>
              <strong>{formatOrderMoney(order.subtotalCents, order.currency)}</strong>
            </div>
            <div>
              <span>Shipping</span>
              <strong>{formatOrderMoney(order.shippingCents, order.currency)}</strong>
            </div>
            {order.discountCents > 0 ? (
              <div>
                <span>Discount</span>
                <strong>-{formatOrderMoney(order.discountCents, order.currency)}</strong>
              </div>
            ) : null}
            <div className="grand">
              <span>Total</span>
              <strong>{formatOrderMoney(order.totalCents, order.currency)}</strong>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
