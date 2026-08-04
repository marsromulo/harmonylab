export function CheckoutPaymentMethod({ formId }: { formId: string }) {
  return (
    <section className="checkout-payment">
      <h3>Payment Method</h3>
      <input form={formId} name="payment_method" type="hidden" value="credit_card" />
      <div className="checkout-payment-options">
        <div className="checkout-payment-option active">
          <span>
            <b>Wonder Online Payment</b>
            <small>
              Choose from all available payment methods, including cards, AlipayHK,
              FPS, WeChat Pay, PayMe, and supported wallets.
            </small>
          </span>
        </div>
      </div>
    </section>
  );
}
