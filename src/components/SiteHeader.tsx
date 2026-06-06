import Image from "next/image";
import Link from "next/link";
import { getCartSummary } from "@/lib/cart";

type SiteHeaderProps = {
  active?: "home" | "products" | "faq" | "shipping" | "contact" | "account";
};

const navItems = [
  { key: "home", label: "Home", href: "/" },
  { key: "products", label: "Products", href: "/products" },
  { key: "faq", label: "FAQ", href: "/faq" },
  { key: "shipping", label: "Shipping", href: "/shipping" },
  { key: "contact", label: "Contact Us", href: "/contact-us" },
] as const;

export async function SiteHeader({ active = "home" }: SiteHeaderProps) {
  const cart = await getCartSummary();

  return (
    <header className="site-header">
      <Link className="site-brand" href="/" aria-label="Harmony Lab Beauty home">
        <Image
          src="/hl-logo.png"
          alt="Harmony Lab Beauty"
          width={1089}
          height={287}
          priority
          unoptimized
        />
      </Link>
      <nav className="site-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <Link
            className={active === item.key ? "active" : undefined}
            href={item.href}
            key={item.key}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="site-actions" aria-label="Account and cart">
        <Link
          className={active === "account" ? "site-icon-user active" : "site-icon-user"}
          href="/account"
          aria-label="Account"
        >
          <span aria-hidden="true" />
        </Link>
        <Link
          className="site-icon-bag"
          href="/cart"
          aria-label={`Cart with ${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"}`}
          data-cart-animation-target="true"
        >
          <span aria-hidden="true" />
          <em>{cart.itemCount}</em>
        </Link>
      </div>
    </header>
  );
}
