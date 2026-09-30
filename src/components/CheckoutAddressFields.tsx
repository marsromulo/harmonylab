"use client";

import { useEffect, useMemo, useState } from "react";
import type { CustomerAddress, CustomerProfile } from "@/lib/customers";
import { getHongKongPhoneLocalNumber } from "@/lib/customer-fields";
import { OFFICE_PICKUP } from "@/lib/pickup";

const regionOptions = ["Hong Kong", "Kowloon", "New Territories"];

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
  const defaultAddress = addresses.find((address) => address.id === defaultAddressId);
  const [deliveryMethod, setDeliveryMethod] = useState(
    defaultAddress && defaultAddress.country !== "Hong Kong" ? "outside_hk" : "delivery",
  );
  const isOutsideHK = deliveryMethod === "outside_hk";
  const isPickup = deliveryMethod === "pickup";
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
    internationalPhone: selectedAddress?.phone ?? profile?.phone ?? "",
    internationalCountry: selectedAddress?.country !== "Hong Kong" ? selectedAddress?.country ?? "" : "",
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
      setDeliveryMethod(address.country === "Hong Kong" ? "delivery" : "outside_hk");
      setValues((current) => ({
        ...current,
        firstName: address.firstName ?? profile?.firstName ?? "",
        lastName: address.lastName ?? profile?.lastName ?? "",
        phone: getHongKongPhoneLocalNumber(address.phone ?? profile?.phone),
        internationalPhone: address.phone ?? profile?.phone ?? "",
        internationalCountry: address.country === "Hong Kong" ? "" : address.country,
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
      <label>
        Delivery method
        <select name="delivery_method" value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)}>
          <option value="delivery">Delivery — Hong Kong</option>
          <option value="outside_hk">Outside Hong Kong</option>
          <option value="pickup">{OFFICE_PICKUP.label}</option>
        </select>
      </label>
      {isPickup ? (
        <div className="checkout-pickup-address">
          <strong>{OFFICE_PICKUP.label}</strong>
          <p>{OFFICE_PICKUP.addressLine1}<br />{OFFICE_PICKUP.city}, {OFFICE_PICKUP.country}</p>
          <span>Free pickup</span>
        </div>
      ) : null}
      {!isPickup && addresses.length > 0 ? (
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
      {isOutsideHK ? (
        <label>
          Mobile number (including country code)
          <input
            autoComplete="tel"
            name="phone"
            type="tel"
            required
            maxLength={25}
            placeholder="+63 917 123 4567"
            pattern={"[+][0-9\\s\\(\\)\\-]{7,24}"}
            onChange={(event) => updateValue("internationalPhone", event.target.value)}
            value={values.internationalPhone}
          />
        </label>
      ) : <label>
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
            required={isGuest || isPickup}
            type="tel"
            value={values.phone}
          />
        </span>
      </label>}
      {!isPickup ? (
        <>
          <label>
            {isOutsideHK ? "Full address" : "Shipping address"}
            {isOutsideHK ? (
              <textarea
                name="shipping_address_line1"
                autoComplete="street-address"
                required
                rows={3}
                placeholder="House / flat, building, street, and locality"
                onChange={(event) => updateValue("addressLine1", event.target.value)}
                value={values.addressLine1}
              />
            ) : <input
              name="shipping_address_line1"
              required
              placeholder="Street address, building, flat"
              autoComplete="address-line1"
              onChange={(event) => updateValue("addressLine1", event.target.value)}
              value={values.addressLine1}
            />}
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
              {isOutsideHK ? <input
                name="shipping_region"
                autoComplete="address-level1"
                placeholder="State / province (optional)"
                onChange={(event) => updateValue("region", event.target.value)}
                value={regionOptions.includes(values.region) ? "" : values.region}
              /> : <select name="shipping_region" value={regionOptions.includes(values.region) ? values.region : "Hong Kong"} onChange={(event) => updateValue("region", event.target.value)}>
                {regionOptions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>}
            </label>
          </div>
          {isOutsideHK ? (
            <>
              <label>
                ZIP / Postal code
                <input
                  name="shipping_postal_code"
                  autoComplete="postal-code"
                  required
                  maxLength={20}
                  onChange={(event) => updateValue("postalCode", event.target.value)}
                  value={values.postalCode}
                />
              </label>
              <label>
                Country / Territory
                <input
                  name="shipping_country"
                  autoComplete="country-name"
                  required
                  maxLength={100}
                  placeholder="Destination country / territory"
                  onChange={(event) => updateValue("internationalCountry", event.target.value)}
                  value={values.internationalCountry}
                />
              </label>
            </>
          ) : <input name="shipping_country" type="hidden" value="Hong Kong" />}
        </>
      ) : null}
      <label>
        {isPickup ? "Pickup notes" : "Delivery notes"}
        <textarea name="delivery_notes" rows={4} placeholder={isPickup ? "Optional pickup notes" : "Optional delivery notes"} />
      </label>
    </div>
  );
}
