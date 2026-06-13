import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type StaticPageShellProps = {
  active: "products" | "faq" | "shipping" | "contact";
  children?: React.ReactNode;
  label: string;
};

export function StaticPageShell({ active, children, label }: StaticPageShellProps) {
  return (
    <div className="page">
      <SiteHeader active={active} />
      <main className="static-page" aria-label={label}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
