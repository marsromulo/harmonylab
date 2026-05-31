import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type StaticPageShellProps = {
  active: "products" | "faq" | "shipping" | "contact";
  label: string;
};

export function StaticPageShell({ active, label }: StaticPageShellProps) {
  return (
    <div className="page">
      <SiteHeader active={active} />
      <main className="static-page" aria-label={label} />
      <SiteFooter />
    </div>
  );
}
