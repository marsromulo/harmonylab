import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { DiscountCreatePanel } from "@/components/admin/DiscountCreatePanel";
import { getAdminDiscountRules, type DiscountRule } from "@/lib/discounts";
import { createDiscountRuleAction } from "./actions";

export const metadata: Metadata = {
  title: "Discounts | Harmony Lab Admin",
  description: "Manage checkout discount rules.",
};

type AdminDiscountsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "discount-invalid": "Check the discount values and try again.",
  "discount-save-failed": "Unable to save that discount.",
};

const successMessages: Record<string, string> = {
  "discount-deleted": "Discount deleted.",
};

const typeLabels: Record<DiscountRule["discountType"], string> = {
  minimum_order: "Minimum Order",
  referral: "Referral Code",
  shipping: "Shipping",
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-HK", {
    currency: "HKD",
    style: "currency",
  }).format(cents / 100);
}

function formatValue(rule: DiscountRule) {
  if (rule.calculationType === "free_shipping") {
    return "Free shipping";
  }

  if (rule.calculationType === "percentage") {
    return `${(rule.value / 100).toFixed(2).replace(/\.00$/, "")}%`;
  }

  return formatMoney(rule.value);
}

export default async function AdminDiscountsPage({
  searchParams,
}: AdminDiscountsPageProps) {
  await connection();
  const [{ error, success }, rules] = await Promise.all([
    searchParams,
    getAdminDiscountRules(),
  ]);
  const errorMessage = error ? errorMessages[error] : null;
  const successMessage = success ? successMessages[success] : null;

  return (
    <AdminShell active="discounts">
      <DiscountCreatePanel
        action={createDiscountRuleAction}
        activeRuleCount={rules.filter((rule) => rule.isActive).length}
        initiallyOpen={Boolean(error)}
      />

      {errorMessage ? <p className="admin-form-alert error">{errorMessage}</p> : null}
      {successMessage ? <p className="admin-form-alert success">{successMessage}</p> : null}

      <section className="admin-panel admin-table-panel admin-discounts-panel">
        <div className="admin-panel-head">
          <h2>Discount Rules</h2>
          <a>{rules.length} configured</a>
        </div>
        {rules.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Discount</th>
                <th>Type</th>
                <th>Minimum Order</th>
                <th>Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    <Link
                      className="admin-record-title"
                      href={`/admin/discounts/${rule.id}`}
                    >
                      {rule.name}
                    </Link>
                    <small>Priority {rule.priority}</small>
                  </td>
                  <td>{typeLabels[rule.discountType]}</td>
                  <td>{formatMoney(rule.minimumSubtotalCents)}</td>
                  <td>{formatValue(rule)}</td>
                  <td>
                    <span className={`admin-status ${rule.isActive ? "active" : "inactive"}`}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <Link
                      className="admin-table-action"
                      href={`/admin/discounts/${rule.id}`}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty-state">No discount rules have been created.</p>
        )}
      </section>
    </AdminShell>
  );
}
