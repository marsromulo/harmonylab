"use client";

import { useEffect, useState } from "react";
import type { CheckoutDiscountQuote } from "@/lib/discounts";
import { getPickupQuote } from "@/lib/pickup";

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
  const [isPickup, setIsPickup] = useState(false);
  const displayedQuote = isPickup ? getPickupQuote(quote) : quote;

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
      const deliveryMethod = new FormData(form).get("delivery_method") ?? "delivery";
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      setIsPickup(deliveryMethod === "pickup");

      try {
        const response = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referralCode, deliveryMethod }),
          signal: requestController.signal,
        });

        if (response.ok) {
          const nextQuote = (await response.json()) as CheckoutDiscountQuote;
          if (!requestController.signal.aborted) {
            setQuote(nextQuote);
          }
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Unable to refresh checkout total.", error);
        }
      }
    }

    function handleInput(event: Event) {
      const target = event.target;

      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement) ||
        !["referral_code", "delivery_method", "customer_address_id"].includes(target.name)) {
        return;
      }

      clearTimeout(timeoutId);
      controller?.abort();
      setIsPickup(new FormData(form).get("delivery_method") === "pickup");
      timeoutId = setTimeout(updateQuote, 250);
    }

    void updateQuote();
    form.addEventListener("input", handleInput);
    form.addEventListener("change", handleInput);

    return () => {
      form.removeEventListener("input", handleInput);
      form.removeEventListener("change", handleInput);
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
        <span>{isPickup ? "Pickup" : "Shipping"}</span>
        <strong>{formatMoney(displayedQuote.shippingCents, currency)}</strong>
      </div>
      {displayedQuote.discountCents > 0 ? (
        <div className="checkout-total discount">
          <span>Discount</span>
          <strong>-{formatMoney(displayedQuote.discountCents, currency)}</strong>
        </div>
      ) : null}
      <div className="checkout-total grand">
        <span>Total</span>
        <strong>{formatMoney(displayedQuote.totalCents, currency)}</strong>
      </div>
    </>
  );
}
