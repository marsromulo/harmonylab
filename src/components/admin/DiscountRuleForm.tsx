"use client";

import { useState } from "react";
import type {
  DiscountCalculationType,
  DiscountRule,
  DiscountType,
} from "@/lib/discounts";

type DiscountRuleFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  rule?: DiscountRule;
  submitLabel: string;
};

function getDisplayedValue(rule?: DiscountRule) {
  if (!rule || rule.calculationType === "free_shipping") {
    return "";
  }

  return (rule.value / 100).toFixed(2);
}

export function DiscountRuleForm({ action, rule, submitLabel }: DiscountRuleFormProps) {
  const [discountType, setDiscountType] = useState<DiscountType>(
    rule?.discountType ?? "shipping",
  );
  const [calculationType, setCalculationType] = useState<DiscountCalculationType>(
    rule?.calculationType ?? "free_shipping",
  );
  const isShipping = discountType === "shipping";
  const activeCalculationType = isShipping ? "free_shipping" : calculationType;

  function handleTypeChange(value: DiscountType) {
    setDiscountType(value);

    if (value !== "shipping" && calculationType === "free_shipping") {
      setCalculationType("fixed");
    }
  }

  return (
    <form action={action} className="admin-product-form admin-discount-form">
      <div className="admin-form-grid">
        <label>
          Discount Name
          <input
            defaultValue={rule?.name ?? ""}
            maxLength={100}
            name="name"
            placeholder="Free shipping over HK$500"
            required
          />
        </label>
        <label>
          Discount Type
          <select
            name="discount_type"
            onChange={(event) => handleTypeChange(event.target.value as DiscountType)}
            value={discountType}
          >
            <option value="shipping">Shipping Discount</option>
            <option value="referral">Referral Code Discount</option>
            <option value="minimum_order">Minimum Order Discount</option>
          </select>
        </label>
        <label>
          Minimum Order (HKD)
          <input
            defaultValue={rule ? (rule.minimumSubtotalCents / 100).toFixed(2) : ""}
            min="0"
            name="minimum_subtotal"
            placeholder="500.00"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label>
          Discount Method
          <select
            disabled={isShipping}
            name="calculation_type"
            onChange={(event) =>
              setCalculationType(event.target.value as DiscountCalculationType)
            }
            value={activeCalculationType}
          >
            {isShipping ? <option value="free_shipping">Free Shipping</option> : null}
            {!isShipping ? <option value="fixed">Fixed Amount</option> : null}
            {!isShipping ? <option value="percentage">Percentage</option> : null}
          </select>
          {isShipping ? (
            <input name="calculation_type" type="hidden" value="free_shipping" />
          ) : null}
        </label>
        {!isShipping ? (
          <label>
            {activeCalculationType === "percentage"
              ? "Discount Percentage"
              : "Discount Value (HKD)"}
            <input
              defaultValue={getDisplayedValue(rule)}
              max={activeCalculationType === "percentage" ? "100" : undefined}
              min="0.01"
              name="value"
              placeholder={activeCalculationType === "percentage" ? "10.00" : "50.00"}
              required
              step="0.01"
              type="number"
            />
          </label>
        ) : null}
        <label>
          Priority
          <input
            defaultValue={rule?.priority ?? 0}
            name="priority"
            step="1"
            type="number"
          />
        </label>
      </div>
      <label className="admin-checkbox-row">
        <input defaultChecked={rule?.isActive ?? true} name="is_active" type="checkbox" />
        Active
      </label>
      <div className="admin-form-actions">
        <button className="admin-btn" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
