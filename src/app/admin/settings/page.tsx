import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminReferralRewardSetting } from "@/lib/site-settings";
import { updateSiteSettingsAction } from "./actions";

export const metadata: Metadata = {
  title: "Settings | Harmony Lab Admin",
  description: "Manage global Harmony Lab website settings.",
};

type AdminSettingsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "settings-award-failed": "The setting was saved, but existing eligible orders could not be updated.",
  "settings-invalid": "Enter a referral reward rate between 0 and 100.",
  "settings-save-failed": "Unable to save the site settings.",
};

const successMessages: Record<string, string> = {
  "settings-saved": "Site settings saved.",
};

export default async function AdminSettingsPage({
  searchParams,
}: AdminSettingsPageProps) {
  await connection();
  const [{ error, success }, referralSetting] = await Promise.all([
    searchParams,
    getAdminReferralRewardSetting(),
  ]);
  const errorMessage = error ? errorMessages[error] : null;
  const successMessage = success ? successMessages[success] : null;

  return (
    <AdminShell active="settings">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">GLOBAL CONFIGURATION</p>
          <h1>Settings</h1>
        </div>
      </section>

      {errorMessage ? <p className="admin-form-alert error">{errorMessage}</p> : null}
      {successMessage ? <p className="admin-form-alert success">{successMessage}</p> : null}

      <section className="admin-panel admin-form-panel admin-settings-panel">
        <div className="admin-panel-head">
          <h2>Site Settings</h2>
        </div>
        <form action={updateSiteSettingsAction} className="admin-product-form admin-settings-form">
          <label>
            {referralSetting.label}
            <input
              defaultValue={referralSetting.ratePercent}
              max="100"
              min="0"
              name="referral_reward_rate_percent"
              required
              step="0.01"
              type="number"
            />
            <small>{referralSetting.description}</small>
          </label>
          <div className="admin-form-actions">
            <button className="admin-btn" type="submit">
              Save Settings
            </button>
          </div>
        </form>
      </section>
    </AdminShell>
  );
}
