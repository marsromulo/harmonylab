"use client";

import { useRef } from "react";
import { updateCartItemAction } from "@/app/cart/actions";

export function CartQuantityForm({ productId, quantity }: { productId: string; quantity: number }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateCartItemAction} className="cart-quantity-form">
      <input name="product_id" type="hidden" value={productId} />
      <label>
        <span>Qty</span>
        <input
          min="1"
          name="quantity"
          type="number"
          defaultValue={quantity}
          onChange={() => {
            formRef.current?.requestSubmit();
          }}
        />
      </label>
    </form>
  );
}
