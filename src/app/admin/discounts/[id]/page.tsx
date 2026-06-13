import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { DiscountRuleForm } from "@/components/admin/DiscountRuleForm";
import { getAdminDiscountRule } from "@/lib/discounts";
import { deleteDiscountRuleAction, updateDiscountRuleAction } from "../actions";

export const metadata: Metadata = {
  title: "Discount Details | Harmony Lab Admin",
  description: "Edit a checkout discount rule.",
};

type AdminDiscountDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "discount-delete-failed": "Unable to delete that discount.",
  "discount-invalid": "Check the discount values and try again.",
  "discount-save-failed": "Unable to save that discount.",
};

const successMessages: Record<string, string> = {
  "discount-saved": "Discount saved.",
};

export default async function AdminDiscountDetailPage({
  params,
  searchParams,
}: AdminDiscountDetailPageProps) {
  await connection();
  const [{ id }, { error, success }] = await Promise.all([params, searchParams]);
  const rule = await getAdminDiscountRule(id);

  if (!rule) {
    notFound();
  }

  return (
    <AdminShell active="discounts">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">DISCOUNT RULE</p>
          <h1>{rule.name}</h1>
        </div>
        <Link className="admin-btn admin-link-btn" href="/admin/discounts">
          Back to Discounts
        </Link>
      </section>

      {error ? <p className="admin-form-alert error">{errorMessages[error]}</p> : null}
      {success ? (
        <p className="admin-form-alert success">{successMessages[success]}</p>
      ) : null}

      <section className="admin-panel admin-form-panel">
        <DiscountRuleForm
          action={updateDiscountRuleAction.bind(null, rule.id)}
          rule={rule}
          submitLabel="Save Discount"
        />
        <form
          action={deleteDiscountRuleAction.bind(null, rule.id)}
          className="admin-delete-form"
        >
          <button className="admin-table-action danger" type="submit">
            Delete Discount
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
