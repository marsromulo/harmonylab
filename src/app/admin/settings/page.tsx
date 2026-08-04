import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminSiteSettings } from "@/lib/site-settings";
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
  "settings-invalid":
    "Enter a referral reward rate between 0 and 100 and a valid free shipping minimum.",
  "settings-save-failed": "Unable to save the site settings.",
  "shipping-rule-missing": "No active Hong Kong free-shipping rule was found.",
};

const successMessages: Record<string, string> = {
  "settings-saved": "Site settings saved.",
};

export default async function AdminSettingsPage({
  searchParams,
}: AdminSettingsPageProps) {
  await connection();
  const [{ error, success }, settings] = await Promise.all([
    searchParams,
    getAdminSiteSettings(),
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
            {settings.referralReward.label}
            <input
              defaultValue={settings.referralReward.ratePercent}
              max="100"
              min="0"
              name="referral_reward_rate_percent"
              required
              step="0.01"
              type="number"
            />
            <small>{settings.referralReward.description}</small>
          </label>
          <label>
            {settings.freeShipping.label}
            <input
              defaultValue={settings.freeShipping.minimum}
              min="0"
              name="free_shipping_minimum"
              required
              step="0.01"
              type="number"
            />
            <small>{settings.freeShipping.description}</small>
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
