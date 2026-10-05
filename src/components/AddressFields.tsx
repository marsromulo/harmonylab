"use client";

import { useState } from "react";
import type { CustomerAddress } from "@/lib/customers";
import { PhoneInput } from "@/components/PhoneInput";
import { CountrySelect } from "@/components/CountrySelect";

const regionOptions = ["Hong Kong", "Kowloon", "New Territories"];

export function AddressFields({ address, profile }: { address?: CustomerAddress; profile?: { firstName: string | null; lastName: string | null; phone: string | null } | null }) {
  const [country, setCountry] = useState(address?.country ?? "Hong Kong");
  const isHongKong = country === "Hong Kong";

  return (
    <>
      <label>
        Label
        <input name="label" placeholder="Home, office, etc." defaultValue={address?.label ?? ""} />
      </label>
      <div className="account-form-split">
        <label>
          First name
          <input name="first_name" required defaultValue={address?.firstName ?? profile?.firstName ?? ""} />
        </label>
        <label>
          Last name
          <input name="last_name" required defaultValue={address?.lastName ?? profile?.lastName ?? ""} />
        </label>
      </div>
      <label>
        Phone
        <PhoneInput defaultValue={address?.phone ?? profile?.phone ?? ""} />
      </label>
      <label>
        Shipping address
        <input name="address_line1" required defaultValue={address?.addressLine1 ?? ""} />
      </label>
      <label>
        Address line 2
        <input name="address_line2" defaultValue={address?.addressLine2 ?? ""} />
      </label>
      <div className="account-form-split">
        <label>
          District / City
          <input name="city" required defaultValue={address?.city ?? ""} />
        </label>
        <label>
          Region
          {isHongKong ? <select name="region" defaultValue={regionOptions.includes(address?.region ?? "") ? address?.region ?? "Hong Kong" : "Hong Kong"}>
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select> : <input name="region" autoComplete="address-level1" placeholder="State / province (optional)" defaultValue={address?.country !== "Hong Kong" ? address?.region ?? "" : ""} />}
        </label>
      </div>
      {!isHongKong ? <label>
        ZIP / Postal code (if applicable)
        <input name="postal_code" autoComplete="postal-code" maxLength={20} defaultValue={address?.postalCode ?? ""} />
      </label> : null}
      <label>
        Country / Territory
        <CountrySelect name="country" value={country} onChange={(event) => setCountry(event.target.value)} />
      </label>
      <label className="account-checkbox-row">
        <input name="is_default" type="checkbox" defaultChecked={address?.isDefault ?? false} />
        Use as default shipping address
      </label>
    </>
  );
}
