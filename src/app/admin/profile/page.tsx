import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminProfileForm } from "@/components/admin/AdminProfileForm";
import { getAdminAvatarUrl, getAdminDisplayName, requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Administrator Profile | Harmony Lab Admin",
  description: "Manage the Harmony Lab administrator profile.",
};

type AdminProfilePageProps = {
  searchParams: Promise<{
    updated?: string;
  }>;
};

export default async function AdminProfilePage({ searchParams }: AdminProfilePageProps) {
  const [{ user, email }, params] = await Promise.all([requireAdmin(), searchParams]);

  return (
    <AdminShell active="profile">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">ADMINISTRATOR</p>
          <h1>Profile</h1>
        </div>
      </section>

      <section className="admin-panel admin-form-panel admin-profile-panel">
        <AdminProfileForm
          avatarUrl={getAdminAvatarUrl(user)}
          displayName={getAdminDisplayName(user)}
          email={email}
          updated={params.updated === "1"}
        />
      </section>
    </AdminShell>
  );
}
