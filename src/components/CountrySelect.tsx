import type { SelectHTMLAttributes } from "react";
import { COUNTRY_OPTIONS } from "@/lib/countries";

export function CountrySelect({
  excludeHongKong = false,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { excludeHongKong?: boolean }) {
  return (
    <select autoComplete="country-name" required {...props}>
      <option value="">Select country / territory</option>
      {COUNTRY_OPTIONS.filter((country) => !excludeHongKong || country !== "Hong Kong").map((country) => (
        <option key={country} value={country}>{country}</option>
      ))}
    </select>
  );
}
