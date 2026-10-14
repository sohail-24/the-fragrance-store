import { describe, it, expect } from "vitest";
import {
  indexToAlphabeticalLabel,
  computeStableTenantLabels,
  getStableTenantLabel,
} from "./tenantLabels";
import { superMasterNavigation } from "@/components/AppLayout";

describe("Stable Website Labeling Utility (Requirement B)", () => {
  it("generates correct alphabetical sequence labels from 0 index upwards", () => {
    expect(indexToAlphabeticalLabel(0)).toBe("Website A");
    expect(indexToAlphabeticalLabel(1)).toBe("Website B");
    expect(indexToAlphabeticalLabel(2)).toBe("Website C");
    expect(indexToAlphabeticalLabel(3)).toBe("Website D");
    expect(indexToAlphabeticalLabel(25)).toBe("Website Z");
    expect(indexToAlphabeticalLabel(26)).toBe("Website AA");
    expect(indexToAlphabeticalLabel(27)).toBe("Website AB");
  });

  it("handles negative or out of bounds index safely with Website A fallback", () => {
    expect(indexToAlphabeticalLabel(-1)).toBe("Website A");
    expect(indexToAlphabeticalLabel(-10)).toBe("Website A");
  });

  it("assigns Website A to the earliest platform tenant (e.g. The Fragrance Store)", () => {
    const tenants = [
      { id: 1, name: "The Fragrance Store", createdAt: "2024-01-01T00:00:00.000Z" },
      { id: 2, name: "Boutique Royale", createdAt: "2024-02-01T00:00:00.000Z" },
      { id: 3, name: "Maison de Niche", createdAt: "2024-03-01T00:00:00.000Z" },
    ];

    const labelMap = computeStableTenantLabels(tenants);
    expect(labelMap.get(1)).toBe("Website A");
    expect(labelMap.get(2)).toBe("Website B");
    expect(labelMap.get(3)).toBe("Website C");
  });

  it("maintains label stability regardless of array order, filtering, or sorting", () => {
    const tenants = [
      { id: 3, name: "Maison de Niche", createdAt: "2024-03-01T00:00:00.000Z" },
      { id: 1, name: "The Fragrance Store", createdAt: "2024-01-01T00:00:00.000Z" },
      { id: 2, name: "Boutique Royale", createdAt: "2024-02-01T00:00:00.000Z" },
    ];

    // Compute labels from full collection
    const map = computeStableTenantLabels(tenants);

    // Filter down to only Boutique Royale
    const filtered = tenants.filter((t) => t.name.includes("Royale"));
    expect(filtered.length).toBe(1);

    // Boutique Royale remains Website B
    expect(getStableTenantLabel(filtered[0], tenants)).toBe("Website B");

    // The Fragrance Store remains Website A even when sorted by name descending
    const reverseSorted = [...tenants].sort((a, b) => b.name.localeCompare(a.name));
    expect(getStableTenantLabel(reverseSorted.find((t) => t.id === 1)!, tenants)).toBe("Website A");
  });

  it("preserves intrinsic displayLabel on tenant object if already attached", () => {
    const tenantWithLabel = {
      id: 99,
      displayLabel: "Website G",
      name: "Custom Boutique",
    };
    expect(getStableTenantLabel(tenantWithLabel)).toBe("Website G");
  });

  it("allocates the next sequential label for new tenants without collision", () => {
    const existing = [
      { id: 1, createdAt: "2024-01-01T00:00:00.000Z" },
      { id: 2, createdAt: "2024-02-01T00:00:00.000Z" },
    ];

    const nextLabel = indexToAlphabeticalLabel(existing.length);
    expect(nextLabel).toBe("Website C");

    const withNewTenant = [
      ...existing,
      { id: 3, createdAt: "2024-03-01T00:00:00.000Z" },
    ];
    const newMap = computeStableTenantLabels(withNewTenant);
    expect(newMap.get(1)).toBe("Website A");
    expect(newMap.get(2)).toBe("Website B");
    expect(newMap.get(3)).toBe("Website C");
  });
});

describe("Responsive Platform Navigation Configuration (Requirement A)", () => {
  it("contains all 8 required Super Master platform destinations", () => {
    const items = superMasterNavigation[0].items;
    const paths = items.map((i) => i.path);
    const labels = items.map((i) => i.label);

    expect(labels).toContain("Platform Overview");
    expect(labels).toContain("Websites");
    expect(labels).toContain("Shop Owners");
    expect(labels).toContain("Analytics & Usage");
    expect(labels).toContain("Subscriptions");
    expect(labels).toContain("Monitoring & Errors");
    expect(labels).toContain("Audit Logs");
    expect(labels).toContain("Platform Settings");

    expect(paths).toContain("/super-master");
    expect(paths).toContain("/super-master/websites");
    expect(paths).toContain("/super-master/owners");
    expect(paths).toContain("/super-master/analytics");
    expect(paths).toContain("/super-master/subscriptions");
    expect(paths).toContain("/super-master/monitoring");
    expect(paths).toContain("/super-master/audit-logs");
    expect(paths).toContain("/super-master/settings");

    expect(items.length).toBe(8);
  });
});
