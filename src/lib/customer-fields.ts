export function normalizeInternationalPhone(value: string) {
  const normalized = value.trim().replace(/[ ()-]/g, "");
  return /^\+[1-9][0-9]{6,14}$/.test(normalized) ? normalized : "";
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase().slice(0, 254);
}

export function normalizeHongKongPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^852/, "").slice(0, 8);
  return digits ? `+852${digits}` : "";
}

export function getHongKongPhoneLocalNumber(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "").replace(/^852/, "").slice(0, 8);
}

