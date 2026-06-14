import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  getAdminReportData,
  normalizeAdminReportRange,
  type AdminReportRange,
  type ReportBreakdownItem,
} from "@/lib/admin-reports";
import { formatOrderMoney } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Reports | Harmony Lab Admin",
  description: "Sales, order, and referral reporting for Harmony Lab admin.",
};

const rangeOptions: { value: AdminReportRange; label: string }[] = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "all", label: "All time" },
];

function formatReportDate(value: string) {
  return new Intl.DateTimeFormat("en-HK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function BreakdownTable({ items }: { items: ReportBreakdownItem[] }) {
  if (items.length === 0) {
    return <p className="admin-empty-state">No orders are available for this period.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Orders</th>
          <th>Share</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.label}>
            <td>{item.label}</td>
            <td>{item.count}</td>
            <td>{item.percentage}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  await connection();
  const range = normalizeAdminReportRange((await searchParams).range);
  const report = await getAdminReportData(range);
  const currentRangeLabel = rangeOptions.find((option) => option.value === range)?.label ?? "30 days";

  return (
    <AdminShell active="reports">
      <section className="admin-page-heading admin-report-heading">
        <div>
          <p className="admin-eyebrow">BUSINESS REPORTING</p>
          <h1>Reports</h1>
        </div>
        <nav className="admin-report-range" aria-label="Report period">
          {rangeOptions.map((option) => (
            <Link
              className={option.value === range ? "active" : ""}
              href={`/admin/reports?range=${option.value}`}
              key={option.value}
            >
              {option.label}
            </Link>
          ))}
        </nav>
      </section>

      <section className="admin-report-section">
        <div className="admin-report-title">
          <div>
            <p className="admin-section-title">SALES OVERVIEW</p>
            <h2>Sales Overview</h2>
          </div>
          <span>{currentRangeLabel}</span>
        </div>

        <div className="admin-report-stats">
          <article>
            <span>Paid sales</span>
            <strong>{formatOrderMoney(report.sales.paidSalesCents, report.currency)}</strong>
          </article>
          <article>
            <span>Paid orders</span>
            <strong>{report.sales.paidOrderCount}</strong>
          </article>
          <article>
            <span>Average order</span>
            <strong>{formatOrderMoney(report.sales.averageOrderCents, report.currency)}</strong>
          </article>
          <article>
            <span>Discounts</span>
            <strong>{formatOrderMoney(report.sales.discountCents, report.currency)}</strong>
          </article>
          <article>
            <span>Shipping collected</span>
            <strong>{formatOrderMoney(report.sales.shippingCents, report.currency)}</strong>
          </article>
        </div>

        <div className="admin-panel admin-table-panel admin-report-table">
          <div className="admin-panel-head">
            <h2>Daily Paid Sales</h2>
            <span>Latest 14 active days</span>
          </div>
          {report.sales.daily.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Paid Orders</th>
                  <th>Sales</th>
                </tr>
              </thead>
              <tbody>
                {report.sales.daily.map((day) => (
                  <tr key={day.date}>
                    <td>{formatReportDate(day.date)}</td>
                    <td>{day.orderCount}</td>
                    <td>{formatOrderMoney(day.totalCents, report.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="admin-empty-state">No paid sales are available for this period.</p>
          )}
        </div>
      </section>

      <section className="admin-report-section">
        <div className="admin-report-title">
          <div>
            <p className="admin-section-title">ORDER SUMMARY</p>
            <h2>Order Summary</h2>
          </div>
          <span>{report.orders.totalCount} total orders</span>
        </div>

        <div className="admin-report-breakdowns">
          <article className="admin-panel admin-table-panel">
            <div className="admin-panel-head">
              <h2>Payment Status</h2>
            </div>
            <BreakdownTable items={report.orders.paymentStatuses} />
          </article>
          <article className="admin-panel admin-table-panel">
            <div className="admin-panel-head">
              <h2>Delivery Status</h2>
            </div>
            <BreakdownTable items={report.orders.deliveryStatuses} />
          </article>
          <article className="admin-panel admin-table-panel">
            <div className="admin-panel-head">
              <h2>Payment Method</h2>
            </div>
            <BreakdownTable items={report.orders.paymentMethods} />
          </article>
        </div>
      </section>

      <section className="admin-report-section">
        <div className="admin-report-title">
          <div>
            <p className="admin-section-title">REFERRAL REPORT</p>
            <h2>Referral Report</h2>
          </div>
          <span>{report.referrals.orderCount} referred orders</span>
        </div>

        <div className="admin-report-stats admin-report-stats-referral">
          <article>
            <span>Referred orders</span>
            <strong>{report.referrals.orderCount}</strong>
          </article>
          <article>
            <span>Paid order value</span>
            <strong>{formatOrderMoney(report.referrals.paidOrderValueCents, report.currency)}</strong>
          </article>
          <article>
            <span>Points awarded</span>
            <strong>{report.referrals.pointsAwarded}</strong>
          </article>
          <article>
            <span>Unpaid points</span>
            <strong>{report.referrals.unpaidPoints}</strong>
          </article>
        </div>

        <div className="admin-panel admin-table-panel admin-report-table">
          <div className="admin-panel-head">
            <h2>Referral Performance</h2>
          </div>
          {report.referrals.items.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Referral Code</th>
                  <th>Orders</th>
                  <th>Paid Orders</th>
                  <th>Paid Order Value</th>
                  <th>Points Awarded</th>
                  <th>Paid Points</th>
                  <th>Unpaid Points</th>
                </tr>
              </thead>
              <tbody>
                {report.referrals.items.map((item) => (
                  <tr key={item.code}>
                    <td>
                      <strong>{item.code}</strong>
                    </td>
                    <td>{item.orderCount}</td>
                    <td>{item.paidOrderCount}</td>
                    <td>{formatOrderMoney(item.paidOrderValueCents, report.currency)}</td>
                    <td>{item.pointsAwarded}</td>
                    <td>{item.paidPoints}</td>
                    <td>{item.unpaidPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="admin-empty-state">No referral orders are available for this period.</p>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
