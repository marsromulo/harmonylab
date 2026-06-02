"use client";

import { useMemo, useState } from "react";
import type { CustomerAddress, CustomerProfile } from "@/lib/customers";

const regionOptions = ["Hong Kong", "Kowloon", "New Territories"];

function getAddressLabel(address: CustomerAddress) {
  return address.label || [address.addressLine1, address.city, address.region].filter(Boolean).join(", ");
}

export function CheckoutAddressFields({
  addresses,
  profile,
}: {
  addresses: CustomerAddress[];
  profile: CustomerProfile | null;
}) {
  const defaultAddressId = addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? "";
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddressId);
  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );

  return (
    <div className="checkout-address-fields" key={selectedAddressId || "new-address"}>
      {addresses.length > 0 ? (
        <label>
          Use saved address
          <select name="customer_address_id" value={selectedAddressId} onChange={(event) => setSelectedAddressId(event.target.value)}>
            {addresses.map((address) => (
              <option key={address.id} value={address.id}>
                {address.isDefault ? "Default - " : ""}
                {getAddressLabel(address)}
              </option>
            ))}
            <option value="">Enter a new address</option>
          </select>
        </label>
      ) : (
        <input name="customer_address_id" type="hidden" value="" />
      )}

      <div className="account-form-split">
        <label>
          First name
          <input name="first_name" required defaultValue={selectedAddress?.firstName ?? profile?.firstName ?? ""} />
        </label>
        <label>
          Last name
          <input name="last_name" required defaultValue={selectedAddress?.lastName ?? profile?.lastName ?? ""} />
        </label>
      </div>
      <label>
        Phone
        <input name="phone" type="tel" defaultValue={selectedAddress?.phone ?? profile?.phone ?? ""} />
      </label>
      <label>
        Shipping address
        <input
          name="shipping_address_line1"
          required
          placeholder="Street address, building, flat"
          defaultValue={selectedAddress?.addressLine1 ?? ""}
        />
      </label>
      <label>
        Address line 2
        <input name="shipping_address_line2" placeholder="Optional" defaultValue={selectedAddress?.addressLine2 ?? ""} />
      </label>
      <div className="account-form-split">
        <label>
          District / City
          <input name="shipping_city" required defaultValue={selectedAddress?.city ?? ""} />
        </label>
        <label>
          Region
          <select name="shipping_region" defaultValue={selectedAddress?.region ?? "Hong Kong"}>
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="account-form-split">
        <label>
          Postal code
          <input name="shipping_postal_code" placeholder="Optional" defaultValue={selectedAddress?.postalCode ?? ""} />
        </label>
        <label>
          Country
          <input name="shipping_country" required defaultValue={selectedAddress?.country ?? "Hong Kong"} />
        </label>
      </div>
      <label>
        Delivery notes
        <textarea name="delivery_notes" rows={4} placeholder="Optional delivery notes" />
      </label>
    </div>
  );
}
