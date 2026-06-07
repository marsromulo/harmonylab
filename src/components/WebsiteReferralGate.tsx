"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ReferralResponse = {
  error?: string;
  referralCode?: string;
  skipped?: boolean;
  valid?: boolean;
};

function normalizeReferralCode(value: string) {
  return value.trim().replace(/[^\w-]/g, "").toUpperCase().slice(0, 40);
}

async function saveReferralCode(referralCode: string) {
  const response = await fetch("/api/referral", {
    body: JSON.stringify({ referralCode }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const data = (await response.json()) as ReferralResponse;

  if (!response.ok) {
    throw new Error(data.error || "Unable to save your referral preference.");
  }

  return data;
}

export function WebsiteReferralGate({ shouldPrompt }: { shouldPrompt: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(shouldPrompt);
  const [referralCode, setReferralCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const data = await saveReferralCode(normalizeReferralCode(referralCode));

      if (!data.valid) {
        setErrorMessage(
          data.error ||
            "This referral code was not found. Please contact your referrer for the correct code and try again.",
        );
        return;
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to validate the referral code.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="website-referral-gate" role="dialog" aria-modal="true" aria-labelledby="website-referral-title">
      <form className="website-referral-card" onSubmit={submit}>
        <p className="eyebrow">WELCOME TO HARMONY LAB</p>
        <h2 id="website-referral-title">Enter your referral code</h2>
        <p>If a member referred you, enter their referral code below.</p>
        <p className="website-referral-optional">
          You may also leave the Referral Code empty and click Proceed.
        </p>
        <label>
          Referral Code
          <input
            autoCapitalize="characters"
            autoComplete="off"
            autoFocus
            disabled={submitting}
            maxLength={40}
            onChange={(event) => {
              setReferralCode(normalizeReferralCode(event.target.value));
              setErrorMessage("");
            }}
            placeholder="Optional"
            value={referralCode}
          />
        </label>
        {errorMessage ? <p className="website-referral-error">{errorMessage}</p> : null}
        <button disabled={submitting} type="submit">
          {submitting ? "CHECKING..." : "PROCEED"}
        </button>
      </form>
    </div>
  );
}
