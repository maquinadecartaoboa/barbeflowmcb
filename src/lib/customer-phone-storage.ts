const KEY_PREFIX = "modogestor:last_phone:";

export function saveCustomerPhone(tenantSlug: string, phone: string): void {
  if (!tenantSlug || !phone) return;
  try {
    localStorage.setItem(`${KEY_PREFIX}${tenantSlug}`, phone);
  } catch {
    // localStorage indisponível (modo privado estrito, quota, etc) — silencia
  }
}

export function loadCustomerPhone(tenantSlug: string): string | null {
  if (!tenantSlug) return null;
  try {
    const value = localStorage.getItem(`${KEY_PREFIX}${tenantSlug}`);
    return value && value.trim().length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function clearCustomerPhone(tenantSlug: string): void {
  if (!tenantSlug) return;
  try {
    localStorage.removeItem(`${KEY_PREFIX}${tenantSlug}`);
  } catch {
    // silencia
  }
}
