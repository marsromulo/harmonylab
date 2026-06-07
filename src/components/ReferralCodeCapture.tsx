"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const invalidCodeMessage =
  "This referral code was not found. Please contact your referrer for the correct code and try again.";

export function ReferralCodeCapture({ code }: { code: string }) {
  const router = useRouter();
  const normalizedCode = useMemo(
    () => code.trim().replace(/[^\w-]/g, "").toUpperCase().slice(0, 40),
    [code],
  );
  const [status, setStatus] = useState<"checking" | "invalid" | "saved">(
    normalizedCode ? "checking" : "invalid",
  );
  const [errorMessage, setErrorMessage] = useState(normalizedCode ? "" : invalidCodeMessage);

  useEffect(() => {
    let active = true;
    let timeout: number | undefined;

    if (!normalizedCode) {
      return () => {
        active = false;
      };
    }

    fetch("/api/referral", {
      body: JSON.stringify({ referralCode: normalizedCode }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    })
      .then(async (response) => {
        const data = (await response.json()) as { error?: string; valid?: boolean };

        if (!response.ok) {
          throw new Error(data.error || "Unable to validate the referral code.");
        }

        if (!active) {
          return;
        }

        if (!data.valid) {
          setErrorMessage(data.error || invalidCodeMessage);
          setStatus("invalid");
          return;
        }

        setStatus("saved");
        timeout = window.setTimeout(() => router.replace("/products"), 900);
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to validate the referral code.");
          setStatus("invalid");
        }
      });

    return () => {
      active = false;
      if (timeout) {
        window.clearTimeout(timeout);
      }
    };
  }, [normalizedCode, router]);

  async function continueWithoutCode() {
    await fetch("/api/referral", {
      body: JSON.stringify({ referralCode: "" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    router.replace("/products");
  }

  return (
    <section className="checkout-success">
      <p className="eyebrow">REFERRAL CODE</p>
      <h2>
        {status === "checking"
          ? "Checking referral code..."
          : status === "saved"
            ? "Referral code saved."
            : "Referral code not found."}
      </h2>
      {status === "saved" ? <p>{normalizedCode} will be applied at checkout.</p> : null}
      {status === "invalid" ? <p className="account-alert error">{errorMessage}</p> : null}
      {status === "invalid" ? (
        <button className="cart-checkout" onClick={() => void continueWithoutCode()} type="button">
          CONTINUE WITHOUT A CODE
        </button>
      ) : status === "saved" ? (
        <Link className="cart-checkout" href="/products">
          CONTINUE SHOPPING
        </Link>
      ) : null}
    </section>
  );
}
