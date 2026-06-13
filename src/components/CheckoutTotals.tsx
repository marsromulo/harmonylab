"use client";

import { useEffect, useState } from "react";
import type { CheckoutDiscountQuote } from "@/lib/discounts";

type CheckoutTotalsProps = {
  currency: string;
  formId: string;
  initialQuote: CheckoutDiscountQuote;
  itemCount: number;
  subtotalCents: number;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-HK", {
    currency,
    style: "currency",
  }).format(cents / 100);
}

export function CheckoutTotals({
  currency,
  formId,
  initialQuote,
  itemCount,
  subtotalCents,
}: CheckoutTotalsProps) {
  const [quote, setQuote] = useState(initialQuote);

  useEffect(() => {
    const formElement = document.getElementById(formId);

    if (!(formElement instanceof HTMLFormElement)) {
      return;
    }

    const form = formElement;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    async function updateQuote() {
      const referralInput = form.elements.namedItem("referral_code");
      const referralCode =
        referralInput instanceof HTMLInputElement ? referralInput.value : "";
      controller?.abort();
      controller = new AbortController();

      try {
        const response = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referralCode }),
          signal: controller.signal,
        });

        if (response.ok) {
          setQuote((await response.json()) as CheckoutDiscountQuote);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Unable to refresh checkout total.", error);
        }
      }
    }

    function handleInput(event: Event) {
      const target = event.target;

      if (!(target instanceof HTMLInputElement) || target.name !== "referral_code") {
        return;
      }

      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateQuote, 250);
    }

    form.addEventListener("input", handleInput);

    return () => {
      form.removeEventListener("input", handleInput);
      clearTimeout(timeoutId);
      controller?.abort();
    };
  }, [formId]);

  return (
    <>
      <div className="checkout-total">
        <span>Items</span>
        <strong>{itemCount}</strong>
      </div>
      <div className="checkout-total">
        <span>Subtotal</span>
        <strong>{formatMoney(subtotalCents, currency)}</strong>
      </div>
      <div className="checkout-total">
        <span>Shipping</span>
        <strong>{formatMoney(quote.shippingCents, currency)}</strong>
      </div>
      {quote.discountCents > 0 ? (
        <div className="checkout-total discount">
          <span>Discount</span>
          <strong>-{formatMoney(quote.discountCents, currency)}</strong>
        </div>
      ) : null}
      <div className="checkout-total grand">
        <span>Total</span>
        <strong>{formatMoney(quote.totalCents, currency)}</strong>
      </div>
    </>
  );
}
