import type { Metadata } from "next";
import { StaticPageShell } from "@/components/StaticPageShell";

export const metadata: Metadata = {
  title: "Shipping Policy | Harmony Lab",
  description: "Harmony Lab order processing, delivery, tracking, and international shipping policy.",
};

export default function ShippingPage() {
  return (
    <StaticPageShell active="shipping" label="Shipping Policy">
      <article className="policy-page">
        <header className="policy-header">
          <p>DELIVERY INFORMATION</p>
          <h1>Shipping Policy</h1>
        </header>

        <div className="policy-sections">
          <section>
            <h2>Order Processing</h2>
            <p>
              All orders are processed within 1–3 business days (excluding weekends and public
              holidays) after payment confirmation.
            </p>
            <p>
              During peak periods, promotions, or holiday seasons, processing times may be slightly
              longer.
            </p>
          </section>

          <section>
            <h2>Shipping Rates</h2>
            <p>
              Shipping costs are calculated at checkout based on the delivery destination, order
              size, and selected shipping method.
            </p>
            <p>
              Any applicable shipping fees will be clearly displayed before you complete your
              purchase.
            </p>
          </section>

          <section>
            <h2>Delivery Timeframes</h2>
            <p>Estimated delivery times:</p>
            <ul>
              <li>
                <strong>Local Deliveries:</strong> 2–7 business days
              </li>
              <li>
                <strong>International Deliveries:</strong> 7–21 business days
              </li>
            </ul>
            <p>
              Please note that delivery times are estimates and may vary due to customs processing,
              carrier delays, weather conditions, or other circumstances beyond our control.
            </p>
          </section>

          <section>
            <h2>Order Tracking</h2>
            <p>
              Once your order has been shipped, you will receive a shipping confirmation email with
              tracking details, where available.
            </p>
            <p>
              Please allow up to 24 hours for tracking information to become active after receiving
              your shipment notification.
            </p>
          </section>

          <section>
            <h2>Incorrect Address Information</h2>
            <p>Customers are responsible for providing accurate shipping information.</p>
            <p>
              Harmony Lab is not responsible for delays, additional charges, or failed deliveries
              resulting from incorrect or incomplete shipping addresses provided during checkout.
            </p>
          </section>

          <section>
            <h2>Customs, Duties &amp; Taxes</h2>
            <p>
              For international orders, customs duties, taxes, and import fees may be imposed by the
              destination country.
            </p>
            <p>
              These charges are the responsibility of the customer and are not included in the
              product or shipping price unless otherwise stated.
            </p>
          </section>

          <section>
            <h2>Lost or Delayed Shipments</h2>
            <p>
              If your order has not arrived within the expected delivery timeframe, please contact
              our customer support team. We will work with the shipping carrier to investigate and
              assist where possible.
            </p>
          </section>

          <section>
            <h2>Damaged Shipments</h2>
            <p>
              If your order arrives damaged, please contact us within 7 days of delivery and provide
              photographs of the package and products received.
            </p>
            <p>We will review the issue and provide an appropriate resolution.</p>
          </section>

          <section>
            <h2>Contact Information</h2>
            <p>
              If you have any questions regarding shipping, delivery, or your order, please contact
              our customer support team through the contact page on our website.
            </p>
            <p>We are committed to providing a smooth and reliable shopping experience.</p>
          </section>
        </div>
      </article>
    </StaticPageShell>
  );
}
