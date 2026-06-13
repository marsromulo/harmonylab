"use client";

import { useState } from "react";

const paymentMethods = [
  {
    id: "credit_card",
    label: "Credit Card",
    detail: "Visa, Mastercard, and supported card networks.",
  },
  {
    id: "alipay_hk",
    label: "AlipayHK",
    detail: "Continue to Wonder and complete payment with AlipayHK.",
  },
  {
    id: "fps",
    label: "FPS",
    detail: "Continue to Wonder and complete payment with Hong Kong FPS.",
  },
];

export function CheckoutPaymentMethod({ formId }: { formId: string }) {
  const [selectedMethod, setSelectedMethod] = useState(paymentMethods[0].id);

  return (
    <section className="checkout-payment">
      <h3>Payment Method</h3>
      <div className="checkout-payment-options">
        {paymentMethods.map((method) => (
          <label className={selectedMethod === method.id ? "checkout-payment-option active" : "checkout-payment-option"} key={method.id}>
            <input
              form={formId}
              name="payment_method"
              type="radio"
              value={method.id}
              checked={selectedMethod === method.id}
              onChange={() => setSelectedMethod(method.id)}
            />
            <span>
              <b>{method.label}</b>
              <small>{method.detail}</small>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
