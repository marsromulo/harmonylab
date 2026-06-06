"use client";

import { useFormStatus } from "react-dom";

export function CheckoutPlaceOrderButton() {
  const { pending } = useFormStatus();

  return (
    <button className="checkout-place-order" disabled={pending} type="submit">
      {pending ? (
        <>
          Processing
          <span className="checkout-button-spinner" aria-hidden="true" />
        </>
      ) : (
        "PLACE ORDER"
      )}
    </button>
  );
}
