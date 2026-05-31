import Image from "next/image";
import Link from "next/link";

type SiteHeaderProps = {
  active?: "home" | "products" | "faq" | "shipping" | "contact";
};

const navItems = [
  { key: "home", label: "Home", href: "/" },
  { key: "products", label: "Products", href: "/products" },
  { key: "faq", label: "FAQ", href: "/faq" },
  { key: "shipping", label: "Shipping", href: "/shipping" },
  { key: "contact", label: "Contact Us", href: "/contact-us" },
] as const;

export function SiteHeader({ active = "home" }: SiteHeaderProps) {
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
        <span className="search" aria-hidden="true" />
        <span className="bag" aria-label="Cart with 1 item">
          <i>1</i>
        </span>
      </div>
    </header>
  );
}
