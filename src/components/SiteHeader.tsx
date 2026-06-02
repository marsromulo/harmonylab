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
    <header className="nav">
      <Link className="brand" href="/">
        <Image
          src="/asset/logo.png"
          alt="Harmony Lab"
          width={192}
          height={35}
          priority
          unoptimized
        />
      </Link>
      <nav className="menu" aria-label="Primary navigation">
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
      <div className="icons" aria-label="Shop tools">
        <Link className={active === "account" ? "account-link active" : "account-link"} href="/account" aria-label="Account">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            width="25"
            height="25"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1.6-4 4.2-6 8-6s6.4 2 8 6" />
          </svg>
        </Link>
        <Link
          className="bag-link"
          href="/cart"
          aria-label={`Cart with ${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"}`}
          data-cart-animation-target="true"
        >
          <span className="bag" aria-hidden="true">
            <i>{cart.itemCount}</i>
          </span>
        </Link>
      </div>
    </header>
  );
}
