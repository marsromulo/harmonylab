"use client";

import type { FormEvent } from "react";
import { addToCartAction } from "@/app/cart/actions";

type AddToCartFormProps = {
  buttonClassName?: string;
  productId: string;
  showQuantity?: boolean;
};

function animateToCart(form: HTMLFormElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const button = form.querySelector("button[type='submit']");
  const cartTarget = document.querySelector("[data-cart-animation-target='true']");

  if (!button || !cartTarget) {
    return;
  }

  const buttonRect = button.getBoundingClientRect();
  const cartRect = cartTarget.getBoundingClientRect();
  const startX = buttonRect.left + buttonRect.width / 2;
  const startY = buttonRect.top + buttonRect.height / 2;
  const endX = cartRect.left + cartRect.width / 2;
  const endY = cartRect.top + cartRect.height / 2;
  const dot = document.createElement("span");

  dot.className = "cart-fly-dot";
  dot.style.left = `${startX}px`;
  dot.style.top = `${startY}px`;
  document.body.appendChild(dot);

  const animation = dot.animate(
    [
      {
        opacity: 1,
        transform: "translate(-50%, -50%) scale(1)",
      },
      {
        opacity: 0.85,
        transform: `translate(-50%, -50%) translate(${(endX - startX) * 0.62}px, ${endY - startY - 54}px) scale(0.8)`,
      },
      {
        opacity: 0,
        transform: `translate(-50%, -50%) translate(${endX - startX}px, ${endY - startY}px) scale(0.35)`,
      },
    ],
    {
      duration: 2000,
      easing: "cubic-bezier(0.2, 0.75, 0.25, 1)",
      fill: "forwards",
    },
  );

  animation.addEventListener("finish", () => dot.remove());
  window.setTimeout(() => dot.remove(), 2200);
}

export function AddToCartForm({ buttonClassName, productId, showQuantity = false }: AddToCartFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    animateToCart(event.currentTarget);
  }

  return (
    <form action={addToCartAction} className={showQuantity ? "add-cart-form with-quantity" : "add-cart-form"} onSubmit={handleSubmit}>
      <input name="product_id" type="hidden" value={productId} />
      {showQuantity ? (
        <label>
          <span>Quantity</span>
          <input min="1" name="quantity" type="number" defaultValue="1" />
        </label>
      ) : (
        <input name="quantity" type="hidden" value="1" />
      )}
      <button className={buttonClassName} type="submit">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6h15l-2 8H8L6 6Z" />
          <path d="M6 6 5 3H2" />
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
        </svg>
        <span>ADD TO CART</span>
      </button>
    </form>
  );
}
