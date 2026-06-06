import { cookies } from "next/headers";
import { getProductsByIds, type StoreProduct } from "@/lib/products";

export const CART_COOKIE = "harmonylab_cart";
const MAX_CART_QUANTITY = 20;

export type CartItem = {
  productId: string;
  quantity: number;
};

export type CartLine = {
  product: StoreProduct;
  quantity: number;
  lineTotalCents: number;
};

export type CartSummary = {
  itemCount: number;
  lines: CartLine[];
  subtotalCents: number;
};

function normalizeQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.min(Math.max(Math.trunc(quantity), 1), MAX_CART_QUANTITY);
}

function parseCartCookie(value: string | undefined): CartItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (
          !item ||
          typeof item !== "object" ||
          typeof (item as CartItem).productId !== "string" ||
          typeof (item as CartItem).quantity !== "number"
        ) {
          return null;
        }

        return {
          productId: (item as CartItem).productId,
          quantity: normalizeQuantity((item as CartItem).quantity),
        };
      })
      .filter((item): item is CartItem => Boolean(item));
  } catch {
    return [];
  }
}

export async function getCartItems() {
  const cookieStore = await cookies();
  return parseCartCookie(cookieStore.get(CART_COOKIE)?.value);
}

export async function setCartItems(items: CartItem[]) {
  const cookieStore = await cookies();
  const normalizedItems = items
    .filter((item) => item.productId)
    .map((item) => ({
      productId: item.productId,
      quantity: normalizeQuantity(item.quantity),
    }));

  if (normalizedItems.length === 0) {
    cookieStore.delete(CART_COOKIE);
    return;
  }

  cookieStore.set(CART_COOKIE, JSON.stringify(normalizedItems), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
  });
}

export async function addCartItem(productId: string, quantity = 1) {
  const items = await getCartItems();
  const existingItem = items.find((item) => item.productId === productId);

  if (existingItem) {
    existingItem.quantity = normalizeQuantity(existingItem.quantity + quantity);
  } else {
    items.push({ productId, quantity: normalizeQuantity(quantity) });
  }

  await setCartItems(items);
}

export async function updateCartItem(productId: string, quantity: number) {
  const items = await getCartItems();
  const nextItems = quantity <= 0
    ? items.filter((item) => item.productId !== productId)
    : items.map((item) => (item.productId === productId ? { ...item, quantity: normalizeQuantity(quantity) } : item));

  await setCartItems(nextItems);
}

export async function clearCart() {
  await setCartItems([]);
}

export async function getCartSummary(): Promise<CartSummary> {
  const items = await getCartItems();
  const products = await getProductsByIds(items.map((item) => item.productId));
  const productsById = new Map(products.map((product) => [product.id, product]));

  const lines = items
    .map((item) => {
      const product = productsById.get(item.productId);

      if (!product) {
        return null;
      }

      return {
        product,
        quantity: item.quantity,
        lineTotalCents: product.priceCents * item.quantity,
      };
    })
    .filter((line): line is CartLine => Boolean(line));

  return {
    itemCount: lines.reduce((total, line) => total + line.quantity, 0),
    lines,
    subtotalCents: lines.reduce((total, line) => total + line.lineTotalCents, 0),
  };
}
