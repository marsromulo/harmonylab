import Image from "next/image";
import Link from "next/link";
import { logoutAdminAction } from "@/app/admin/login/actions";
import { getAdminAvatarUrl, getAdminDisplayName, requireAdmin } from "@/lib/admin-auth";
import { AdminIcon } from "./AdminIcon";

type AdminShellProps = {
  active:
    | "dashboard"
    | "orders"
    | "products"
    | "discounts"
    | "customers"
    | "members"
    | "reports"
    | "settings"
    | "profile";
  children: React.ReactNode;
};

const navItems = [
  { key: "dashboard", label: "Dashboard", href: "/admin", icon: "dashboard" },
  { key: "orders", label: "Orders", href: "/admin/orders", icon: "bag" },
  { key: "products", label: "Products", href: "/admin/products", icon: "dashboard" },
  { key: "discounts", label: "Discounts", href: "/admin/discounts", icon: "discount" },
  { key: "customers", label: "Customers", href: "/admin/customers", icon: "users" },
  { key: "members", label: "Members", href: "/admin/members", icon: "users" },
  { key: "reports", label: "Reports", href: "/admin/reports", icon: "dashboard" },
  { key: "settings", label: "Settings", href: "/admin/settings", icon: "dashboard" },
  { key: "profile", label: "Profile", href: "/admin/profile", icon: "users" },
] as const;

export async function AdminShell({ active, children }: AdminShellProps) {
  const { user } = await requireAdmin();
  const displayName = getAdminDisplayName(user);
  const avatarUrl = getAdminAvatarUrl(user);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Image
          src="/hl-logo.png"
          className="admin-logo"
          alt="Harmony Lab"
          width={1154}
          height={271}
          priority
          unoptimized
        />
        <div className="admin-top-actions">
          <div className="admin-icon-circle">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
          </div>
          <div className="admin-icon-circle">
            <span className="admin-badge">3</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
          </div>
          <div className="admin-user">
            <Link className="admin-avatar-link" href="/admin/profile" aria-label="Edit admin profile">
              <Image src={avatarUrl} className="admin-avatar" alt="Admin avatar" width={48} height={47} />
            </Link>
            <div>
              <Link className="admin-profile-name" href="/admin/profile">
                {displayName}
              </Link>
              <span>Administrator</span>
            </div>
            <form action={logoutAdminAction}>
              <button className="admin-logout" type="submit">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-menu">
            <p className="admin-section-title">Admin Panel</p>
            {navItems.map((item) => (
              <Link
                className={active === item.key ? "admin-nav-item active" : "admin-nav-item"}
                href={item.href}
                key={item.key}
              >
                <AdminIcon name={item.icon} />
                {item.label}
              </Link>
            ))}
            <div className="admin-divider" />
            <Link className="admin-nav-item" href="/">
              <AdminIcon name="dashboard" />
              Storefront
            </Link>
          </div>
        </aside>

        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
