import type { InputHTMLAttributes } from "react";

export function PhoneInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      autoComplete="tel"
      name="phone"
      type="tel"
      maxLength={40}
      pattern={"[+]?(?:[\\s\\(\\).\\-]*[0-9]){7,15}[\\s\\(\\).\\-]*"}
      placeholder="Phone number (including country code)"
      title="Enter 7–15 digits, including country code."
      {...props}
    />
  );
}
