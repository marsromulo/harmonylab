"use client";

import { useEffect, useMemo, useState } from "react";
import type { CustomerAddress, CustomerProfile } from "@/lib/customers";
import { getHongKongPhoneLocalNumber } from "@/lib/customer-fields";

const regionOptions = ["Hong Kong", "Kowloon", "New Territories"];
const countryOptions = ["Hong Kong", "Philippines"];

function getAddressLabel(address: CustomerAddress) {
  return address.label || [address.addressLine1, address.city, address.region].filter(Boolean).join(", ");
}

export function CheckoutAddressFields({
  addresses,
  emailErrorMessage,
  isGuest,
  profile,
}: {
  addresses: CustomerAddress[];
  emailErrorMessage?: string;
  isGuest: boolean;
  profile: CustomerProfile | null;
}) {
  const defaultAddressId = addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? "";
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddressId);
  const [guestHydrated, setGuestHydrated] = useState(!isGuest);
  const [localEmailError, setLocalEmailError] = useState("");
  const [dismissedEmailError, setDismissedEmailError] = useState<string | null>(null);
  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );
  const [values, setValues] = useState({
    email: profile?.email ?? "",
    firstName: selectedAddress?.firstName ?? profile?.firstName ?? "",
    lastName: selectedAddress?.lastName ?? profile?.lastName ?? "",
    phone: getHongKongPhoneLocalNumber(selectedAddress?.phone ?? profile?.phone),
    addressLine1: selectedAddress?.addressLine1 ?? "",
    addressLine2: selectedAddress?.addressLine2 ?? "",
    city: selectedAddress?.city ?? "",
    region: selectedAddress?.region ?? "Hong Kong",
    postalCode: selectedAddress?.postalCode ?? "",
    country: selectedAddress?.country ?? "Hong Kong",
  });

  useEffect(() => {
    if (!isGuest) {
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("harmonylab-guest-checkout-v1");

        if (stored) {
          setValues((current) => ({
            ...current,
            ...(JSON.parse(stored) as Partial<typeof current>),
          }));
        }
      } catch {
        // Ignore unavailable or invalid browser storage.
      } finally {
        setGuestHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isGuest]);

  useEffect(() => {
    if (!isGuest || !guestHydrated) {
      return;
    }

    window.localStorage.setItem("harmonylab-guest-checkout-v1", JSON.stringify(values));
  }, [guestHydrated, isGuest, values]);

  function updateValue(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const displayedEmailError =
    localEmailError ||
    (emailErrorMessage && emailErrorMessage !== dismissedEmailError ? emailErrorMessage : "");

  function selectAddress(addressId: string) {
    setSelectedAddressId(addressId);
    const address = addresses.find((candidate) => candidate.id === addressId);

    if (address) {
      setValues((current) => ({
        ...current,
        firstName: address.firstName ?? profile?.firstName ?? "",
        lastName: address.lastName ?? profile?.lastName ?? "",
        phone: getHongKongPhoneLocalNumber(address.phone ?? profile?.phone),
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 ?? "",
        city: address.city,
        region: address.region ?? "Hong Kong",
        postalCode: address.postalCode ?? "",
        country: address.country,
      }));
    }
  }

  return (
    <div className="checkout-address-fields">
      {addresses.length > 0 ? (
        <label>
          Use saved address
          <select name="customer_address_id" value={selectedAddressId} onChange={(event) => selectAddress(event.target.value)}>
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

      {isGuest ? (
        <label>
          Email
          <input
            autoComplete="email"
            name="email"
            onChange={(event) => {
              updateValue("email", event.target.value);
              setLocalEmailError("");
              setDismissedEmailError(emailErrorMessage ?? null);
            }}
            onInvalid={(event) =>
              setLocalEmailError(
                event.currentTarget.validity.valueMissing
                  ? "Email address is required."
                  : "Enter a valid email address.",
              )
            }
            required
            type="email"
            value={values.email}
          />
          {displayedEmailError ? (
            <span className="checkout-field-error">{displayedEmailError}</span>
          ) : null}
        </label>
      ) : null}
      <div className="account-form-split">
        <label>
          First name
          <input
            autoComplete="given-name"
            name="first_name"
            onChange={(event) => updateValue("firstName", event.target.value)}
            required
            value={values.firstName}
          />
        </label>
        <label>
          Last name
          <input
            autoComplete="family-name"
            name="last_name"
            onChange={(event) => updateValue("lastName", event.target.value)}
            required
            value={values.lastName}
          />
        </label>
      </div>
      <label>
        Phone
        <span className="phone-prefix-field">
          <b>+852</b>
          <input
            autoComplete="tel-national"
            inputMode="numeric"
            maxLength={8}
            name="phone"
            onChange={(event) => updateValue("phone", event.target.value.replace(/\D/g, "").slice(0, 8))}
            pattern="[0-9]{8}"
            required={isGuest}
            type="tel"
            value={values.phone}
          />
        </span>
      </label>
      <label>
        Shipping address
        <input
          name="shipping_address_line1"
          required
          placeholder="Street address, building, flat"
          autoComplete="address-line1"
          onChange={(event) => updateValue("addressLine1", event.target.value)}
          value={values.addressLine1}
        />
      </label>
      <label>
        Address line 2
        <input
          autoComplete="address-line2"
          name="shipping_address_line2"
          onChange={(event) => updateValue("addressLine2", event.target.value)}
          placeholder="Optional"
          value={values.addressLine2}
        />
      </label>
      <div className="account-form-split">
        <label>
          District / City
          <input
            autoComplete="address-level2"
            name="shipping_city"
            onChange={(event) => updateValue("city", event.target.value)}
            required
            value={values.city}
          />
        </label>
        <label>
          Region
          <select name="shipping_region" value={values.region} onChange={(event) => updateValue("region", event.target.value)}>
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
      </div>
      <input name="shipping_postal_code" type="hidden" value={values.postalCode} />
      <label>
        Country
        <select name="shipping_country" required value={values.country} onChange={(event) => updateValue("country", event.target.value)}>
          {countryOptions.map((country) => (
            <option key={country} value={country} disabled={country === "Philippines"}>
              {country}
            </option>
          ))}
        </select>
      </label>
      <label>
        Delivery notes
        <textarea name="delivery_notes" rows={4} placeholder="Optional delivery notes" />
      </label>
    </div>
  );
}
