import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatNucPoints, getAdminMemberDetails, getAdminMemberName } from "@/lib/admin-members";
import { formatOrderDate } from "@/lib/orders";
import { deleteMemberAction, updateMemberAction } from "../actions";

export const metadata: Metadata = {
  title: "Member Details | Harmony Lab Admin",
  description: "Member information and referral NUC point totals.",
};

type AdminMemberDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
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
  "member-saved": "Member saved.",
};

export default async function AdminMemberDetailPage({ params, searchParams }: AdminMemberDetailPageProps) {
  await connection();
  const [{ id }, { error, success }] = await Promise.all([params, searchParams]);
  const details = await getAdminMemberDetails(id);

  if (!details) {
    notFound();
  }

  const { member, referralOrders } = details;
  const errorMessage = error ? errorMessages[error] : null;
  const successMessage = success ? successMessages[success] : null;

  return (
    <AdminShell active="members">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">MEMBER DETAILS</p>
          <h1>{getAdminMemberName(member)}</h1>
        </div>
        <Link className="admin-btn admin-link-btn" href="/admin/members">
          Back to Members
        </Link>
      </section>

      {errorMessage ? <p className="admin-form-alert error">{errorMessage}</p> : null}
      {successMessage ? <p className="admin-form-alert success">{successMessage}</p> : null}

      <section className="admin-detail-grid">
        <div className="admin-panel admin-detail-panel">
          <h2>Member Information</h2>
          <form action={updateMemberAction.bind(null, member.id)} className="admin-member-form">
            <div className="admin-form-grid">
              <label>
                First Name
                <input name="first_name" required defaultValue={member.firstName} />
              </label>
              <label>
                Last Name
                <input name="last_name" required defaultValue={member.lastName} />
              </label>
              <label>
                Phone No.
                <input name="phone" type="tel" defaultValue={member.phone ?? ""} />
              </label>
              <label>
                Referral Code
                <input name="referral_code" required defaultValue={member.referralCode} />
              </label>
            </div>
            <div className="admin-form-actions">
              <button className="admin-btn" type="submit">
                Save Member
              </button>
            </div>
          </form>
          <form action={deleteMemberAction.bind(null, member.id)} className="admin-delete-form">
            <button className="admin-table-action danger" type="submit">
              Delete Member
            </button>
          </form>
        </div>

        <div className="admin-panel admin-detail-panel">
          <h2>Referral Totals</h2>
          <dl className="admin-detail-list">
            <div>
              <dt>Referral code</dt>
              <dd>{member.referralCode}</dd>
            </div>
            <div>
              <dt>Referred orders</dt>
              <dd>{member.referredOrderCount}</dd>
            </div>
            <div>
              <dt>Total NUC points</dt>
              <dd>{formatNucPoints(member.totalNucPoints)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="admin-panel admin-table-panel">
        <div className="admin-panel-head">
          <h2>Referred Orders</h2>
          <a>{referralOrders.length} orders</a>
        </div>
        {referralOrders.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>NUC Points</th>
              </tr>
            </thead>
            <tbody>
              {referralOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link className="admin-record-title" href={`/admin/orders/${order.id}`}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td>{formatOrderDate(order.createdAt)}</td>
                  <td>{formatNucPoints(order.nucPoints)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty-state">No orders have used this referral code yet.</p>
        )}
      </section>
    </AdminShell>
  );
}
