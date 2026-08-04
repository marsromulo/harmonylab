import Image from "next/image";
import Link from "next/link";
import { getCartSummary } from "@/lib/cart";
import { SiteMobileMenu } from "./SiteMobileMenu";
import { siteNavItems, type SiteNavKey } from "./site-navigation";

type SiteHeaderProps = {
  active?: SiteNavKey;
};

export async function SiteHeader({ active = "home" }: SiteHeaderProps) {
  const cart = await getCartSummary();

  return (
    <>
      <div className="store-topbar">
        <div className="store-container store-topbar-inner">
          <p>Discover science-backed skincare for every skin type. Gentle, effective, and made for you.</p>
          <div className="store-topbar-meta">
            <span>Free Shipping over HKD500</span>
          </div>
        </div>
      </div>

      <header className="site-header">
        <div className="store-container site-header-inner">
          <Link className="site-brand" href="/" aria-label="Harmony Lab Beauty home">
            <Image
              src="/new-design/assets/harmony_lab_logo_final.png"
              alt="Harmony Lab Beauty"
              width={634}
              height={149}
              priority
            />
          </Link>
          <nav className="site-nav" aria-label="Primary navigation">
            {siteNavItems.map((item) => (
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
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="8" r="4" />
              </svg>
            </Link>
            <Link
              className="site-icon-bag"
              href="/cart"
              aria-label={`Cart with ${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"}`}
              data-cart-animation-target="true"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 7h12l-1 13H7L6 7Z" />
                <path d="M9 7a3 3 0 0 1 6 0" />
              </svg>
              <em>{cart.itemCount}</em>
            </Link>
            <SiteMobileMenu active={active} />
          </div>
        </div>
      </header>
    </>
  );
}
