import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{
    order?: string;
  }>;
};

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const { order } = await searchParams;

  return (
    <div className="page">
      <SiteHeader active="products" />
      <main className="checkout-page">
        <section className="checkout-success">
          <p className="eyebrow">ORDER RECEIVED</p>
          <h2>Thank you for your order.</h2>
          {order ? <p>Your order number is {order}.</p> : null}
          <Link className="cart-checkout" href="/products">
            CONTINUE SHOPPING
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
