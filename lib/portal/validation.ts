export function onlyDigits(value: string) {
  return (value ?? "").replace(/\D/g, "");
}

export function normalizeEmail(value: string | null | undefined) {
  const email = String(value ?? "").trim().toLowerCase();
  return email || null;
}

export function normalizePhone(value: string | null | undefined) {
  const phone = onlyDigits(String(value ?? ""));
  return phone || null;
}

export function normalizeName(value: string | null | undefined) {
  return String(value ?? "").trim();
}

export function isValidEmail(value: string) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPhone(value: string) {
  return /^\d{8,15}$/.test(value);
}

export function isValidSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
