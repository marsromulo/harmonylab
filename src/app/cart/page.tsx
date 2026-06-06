import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { clearCartAction, removeCartItemAction } from "@/app/cart/actions";
import { CartQuantityForm } from "@/components/CartQuantityForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCartSummary } from "@/lib/cart";
import { formatProductPrice } from "@/lib/products";

function formatPrice(cents: number, currency = "HKD") {
  return formatProductPrice({ currency, priceCents: cents });
}

export default async function CartPage() {
  await connection();
  const cart = await getCartSummary();
  const currency = cart.lines[0]?.product.currency ?? "HKD";

  return (
    <div className="page">
      <SiteHeader active="products" />
      <main className="cart-page">
        <div className="section-head cart-page-head">
          <div>
            <p className="eyebrow">YOUR BAG</p>
            <h2>Shopping Cart</h2>
          </div>
        </div>

        {cart.lines.length === 0 ? (
          <section className="cart-empty">
            <h3>Your cart is empty.</h3>
            <p>Add your skincare essentials before checkout.</p>
            <Link className="btn" href="/products">
              SHOP NOW
            </Link>
          </section>
        ) : (
          <section className="cart-layout">
            <div className="cart-items">
              {cart.lines.map((line) => (
                <article className="cart-item" key={line.product.id}>
                  <Image src={line.product.imageUrl} alt={line.product.name} width={108} height={108} />
                  <div>
                    <h3>
                      <Link href={`/products/${line.product.slug}`}>{line.product.name}</Link>
                    </h3>
                    <p>{formatProductPrice(line.product)}</p>
                    <div className="cart-item-controls">
                      <CartQuantityForm productId={line.product.id} quantity={line.quantity} />
                      <form action={removeCartItemAction} className="cart-remove-form">
                        <input name="product_id" type="hidden" value={line.product.id} />
                        <button className="cart-remove" type="submit" aria-label={`Remove ${line.product.name}`} title="Remove item">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 7h16" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M6 7l1 14h10l1-14" />
                            <path d="M9 7V4h6v3" />
                          </svg>
                        </button>
                      </form>
                    </div>
                  </div>
                  <div className="cart-item-side">
                    <strong>{formatPrice(line.lineTotalCents, line.product.currency)}</strong>
                  </div>
                </article>
              ))}
            </div>

            <aside className="cart-summary">
              <h3>Order Summary</h3>
              <div>
                <span>Items</span>
                <strong>{cart.itemCount}</strong>
              </div>
              <div>
                <span>Subtotal</span>
                <strong>{formatPrice(cart.subtotalCents, currency)}</strong>
              </div>
              <p>Shipping and discounts are calculated at checkout.</p>
              <Link className="cart-checkout" href="/checkout">
                CHECKOUT
              </Link>
              <form action={clearCartAction}>
                <button className="cart-clear" type="submit">
                  Clear cart
                </button>
              </form>
            </aside>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
