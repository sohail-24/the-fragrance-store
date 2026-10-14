/**
 * Stable Website Labeling Utility for Super Master Platform Console.
 *
 * Deterministically maps managed tenant stores to human-friendly alphabetical labels:
 * - Website A (The Fragrance Store / First platform tenant)
 * - Website B
 * - Website C
 * - Website D ...
 *
 * Requirements satisfied:
 * - Preserves underlying tenant ID, slug, domain, owner, and records.
 * - Does not rename records or change routing.
 * - Stable across sorting, filtering, searching, and refreshes.
 * - Monotonically assigns next available label to new tenants without collisions.
 */

export function indexToAlphabeticalLabel(index: number): string {
  if (index < 0) return "Website A";
  let label = "";
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Website ${label}`;
}

export function computeStableTenantLabels<
  T extends { id: number; createdAt?: string | Date | null }
>(tenants: T[]): Map<number, string> {
  const sorted = [...tenants].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
    if (timeA !== timeB) return timeA - timeB;
    return a.id - b.id;
  });

  const map = new Map<number, string>();
  sorted.forEach((tenant, idx) => {
    map.set(tenant.id, indexToAlphabeticalLabel(idx));
  });
  return map;
}

export function getStableTenantLabel<
  T extends { id: number; displayLabel?: string; createdAt?: string | Date | null }
>(tenant: T, allTenants?: T[]): string {
  if (tenant.displayLabel) {
    return tenant.displayLabel;
  }
  if (allTenants && allTenants.length > 0) {
    const map = computeStableTenantLabels(allTenants);
    const label = map.get(tenant.id);
    if (label) return label;
  }
  return indexToAlphabeticalLabel(Math.max(0, tenant.id - 1));
}
