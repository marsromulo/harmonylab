"use client";

import { useState, useSyncExternalStore } from "react";

const referralStorageKey = "harmony_referral_code";

export function normalizeReferralCode(value: string) {
  return value.trim().replace(/[^\w-]/g, "").toUpperCase().slice(0, 40);
}

export function ReferralCodeField({ formId }: { formId: string }) {
  const [manualCode, setManualCode] = useState("");
  const savedCode = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      return () => window.removeEventListener("storage", onStoreChange);
    },
    () => normalizeReferralCode(window.localStorage.getItem(referralStorageKey) ?? ""),
    () => "",
  );

  if (savedCode) {
    return (
      <label className="checkout-referral">
        Referral code
        <input key="saved-referral-code" disabled value={savedCode} />
        <input form={formId} name="referral_code" type="hidden" value={savedCode} />
      </label>
    );
  }

  return (
    <label className="checkout-referral">
      Referral code
      <input
        key="manual-referral-code"
        form={formId}
        name="referral_code"
        placeholder="Optional"
        value={manualCode}
        onChange={(event) => setManualCode(normalizeReferralCode(event.target.value))}
      />
    </label>
  );
}

export { referralStorageKey };
