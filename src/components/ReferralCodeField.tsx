"use client";

import { useState } from "react";

export function normalizeReferralCode(value: string) {
  return value.trim().replace(/[^\w-]/g, "").toUpperCase().slice(0, 40);
}

export function ReferralCodeField({ formId, savedCode }: { formId: string; savedCode?: string }) {
  const [manualCode, setManualCode] = useState("");
  const normalizedSavedCode = normalizeReferralCode(savedCode ?? "");

  if (normalizedSavedCode) {
    return (
      <label className="checkout-referral">
        Referral code
        <input key="saved-referral-code" disabled value={normalizedSavedCode} />
        <input form={formId} name="referral_code" type="hidden" value={normalizedSavedCode} />
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
