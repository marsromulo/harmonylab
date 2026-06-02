"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addCartItem, clearCart, updateCartItem } from "@/lib/cart";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getQuantity(formData: FormData) {
  const quantity = Number.parseInt(getString(formData, "quantity"), 10);
  return Number.isFinite(quantity) ? quantity : 1;
}

export async function addToCartAction(formData: FormData) {
  const productId = getString(formData, "product_id");

  if (!productId) {
    return;
  }

  await addCartItem(productId, getQuantity(formData));
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/cart");
}

export async function updateCartItemAction(formData: FormData) {
  const productId = getString(formData, "product_id");

  if (!productId) {
    return;
  }

  await updateCartItem(productId, getQuantity(formData));
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function removeCartItemAction(formData: FormData) {
  const productId = getString(formData, "product_id");

  if (!productId) {
    return;
  }

  await updateCartItem(productId, 0);
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function clearCartAction() {
  await clearCart();
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function buyNowAction(formData: FormData) {
  await addToCartAction(formData);
  redirect("/checkout");
}
