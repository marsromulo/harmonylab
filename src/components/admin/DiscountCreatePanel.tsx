"use client";

import { useState } from "react";
import { DiscountRuleForm } from "@/components/admin/DiscountRuleForm";

type DiscountCreatePanelProps = {
  action: (formData: FormData) => Promise<void>;
  activeRuleCount: number;
  initiallyOpen?: boolean;
};

export function DiscountCreatePanel({
  action,
  activeRuleCount,
  initiallyOpen = false,
}: DiscountCreatePanelProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">CHECKOUT PRICING</p>
          <h1>Discounts</h1>
        </div>
        <div className="admin-heading-actions">
          <span>{activeRuleCount} active rules</span>
          <button
            className="admin-btn"
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            {isOpen ? "Close" : "Add Discount"}
          </button>
        </div>
      </section>

      {isOpen ? (
        <section className="admin-panel admin-form-panel admin-discount-create-panel">
          <div className="admin-panel-head">
            <h2>Add Discount</h2>
          </div>
          <DiscountRuleForm action={action} submitLabel="Add Discount" />
        </section>
      ) : null}
    </>
  );
}
