"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type CheckoutDeliveryMethod = "delivery" | "outside_hk" | "pickup";

const CheckoutDeliveryContext = createContext<{
  deliveryMethod: CheckoutDeliveryMethod;
  setDeliveryMethod: (method: CheckoutDeliveryMethod) => void;
} | null>(null);

export function CheckoutDeliveryProvider({
  children,
  initialMethod,
}: {
  children: ReactNode;
  initialMethod: CheckoutDeliveryMethod;
}) {
  const [deliveryMethod, setDeliveryMethod] = useState(initialMethod);

  return (
    <CheckoutDeliveryContext.Provider value={{ deliveryMethod, setDeliveryMethod }}>
      {children}
    </CheckoutDeliveryContext.Provider>
  );
}

export function useCheckoutDelivery() {
  const context = useContext(CheckoutDeliveryContext);
  if (!context) {
    throw new Error("Checkout delivery must be used inside its provider.");
  }
  return context;
}
