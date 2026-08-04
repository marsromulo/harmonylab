export const siteNavItems = [
  { key: "home", label: "Home", href: "/" },
  { key: "products", label: "Products", href: "/products" },
  { key: "faq", label: "FAQ", href: "/faq" },
  { key: "shipping", label: "Shipping", href: "/shipping" },
  { key: "contact", label: "Contact Us", href: "/contact-us" },
] as const;

export type SiteNavKey = (typeof siteNavItems)[number]["key"] | "account";
