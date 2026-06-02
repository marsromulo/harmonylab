import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { MemberCreatePanel } from "@/components/admin/MemberCreatePanel";
import { getAdminMemberName, getAdminMembers } from "@/lib/admin-members";
import { createMemberAction } from "./actions";

export const metadata: Metadata = {
  title: "Members | Harmony Lab Admin",
  description: "Manage members and referral NUC point totals.",
};

type AdminMembersPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "member-delete-failed": "Unable to delete that member.",
  "member-invalid": "Please enter first name, last name, and referral code.",
  "member-save-failed": "Unable to save member. Check that the referral code is not already used.",
};

const successMessages: Record<string, string> = {
  "member-deleted": "Member deleted.",
  "member-saved": "Member saved.",
};

export default async function AdminMembersPage({ searchParams }: AdminMembersPageProps) {
  await connection();
  const [{ error, success }, members] = await Promise.all([searchParams, getAdminMembers()]);
  const errorMessage = error ? errorMessages[error] : null;
  const successMessage = success ? successMessages[success] : null;

  return (
    <AdminShell active="members">
      <MemberCreatePanel action={createMemberAction} memberCount={members.length} />

      {errorMessage ? <p className="admin-form-alert error">{errorMessage}</p> : null}
      {successMessage ? <p className="admin-form-alert success">{successMessage}</p> : null}

      <section className="admin-panel admin-table-panel admin-members-panel">
        <div className="admin-panel-head">
          <h2>Member List</h2>
          <a>Manage Members</a>
        </div>

        {members.length > 0 ? (
          <table className="admin-members-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Phone No.</th>
                <th>Referral Code</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <Link className="admin-record-title" href={`/admin/members/${member.id}`}>
                      {getAdminMemberName(member)}
                    </Link>
                  </td>
                  <td>{member.phone ?? "Not provided"}</td>
                  <td>
                    <span className="admin-referral">{member.referralCode}</span>
                  </td>
                  <td>
                    <Link className="admin-table-action" href={`/admin/members/${member.id}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty-state">No members have been created yet.</p>
        )}
      </section>
    </AdminShell>
  );
}
