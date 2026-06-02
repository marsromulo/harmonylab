"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { normalizeReferralCode, referralStorageKey } from "@/components/ReferralCodeField";

export function ReferralCodeCapture({ code }: { code: string }) {
  const router = useRouter();
  const normalizedCode = useMemo(() => normalizeReferralCode(code), [code]);

  useEffect(() => {
    if (normalizedCode) {
      window.localStorage.setItem(referralStorageKey, normalizedCode);
    }

    const timeout = window.setTimeout(() => {
      router.replace("/products");
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [normalizedCode, router]);

  return (
    <section className="checkout-success">
      <p className="eyebrow">REFERRAL CODE</p>
      <h2>Referral code saved.</h2>
      {normalizedCode ? <p>{normalizedCode} will be applied at checkout.</p> : <p>This referral link is not valid.</p>}
      <Link className="cart-checkout" href="/products">
        CONTINUE SHOPPING
      </Link>
    </section>
  );
}
