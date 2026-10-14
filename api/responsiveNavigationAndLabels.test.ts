import { describe, expect, it } from "vitest";
import {
  indexToAlphabeticalLabel,
  computeStableTenantLabels,
  getStableTenantLabel,
} from "../src/lib/tenantLabels";
import { superMasterNavigation } from "../src/components/AppLayout";
import { isSuperMaster } from "../contracts/roles";
import { getPlatformSaaSStats, listTenants } from "./queries/tenants";

describe("Unified Navigation & Stable Website Labels", () => {
  describe("Stable Website A/B/C Alphabetical Labeling", () => {
    it("generates exact Website A, B, C, D... labels monotonically", () => {
      expect(indexToAlphabeticalLabel(0)).toBe("Website A");
      expect(indexToAlphabeticalLabel(1)).toBe("Website B");
      expect(indexToAlphabeticalLabel(2)).toBe("Website C");
      expect(indexToAlphabeticalLabel(3)).toBe("Website D");
      expect(indexToAlphabeticalLabel(25)).toBe("Website Z");
      expect(indexToAlphabeticalLabel(26)).toBe("Website AA");
      expect(indexToAlphabeticalLabel(27)).toBe("Website AB");
    });

    it("ensures Website A is assigned to the first/earliest platform tenant (The Fragrance Store)", async () => {
      const stats = await getPlatformSaaSStats();
      expect(stats.tenants.length).toBeGreaterThan(0);

      // The earliest/first tenant must be Website A
      const firstTenant = stats.tenants.find((t) => t.displayLabel === "Website A");
      expect(firstTenant).toBeDefined();
      expect(firstTenant?.id).toBe(1);
      // Real business name, slug, and ID are fully preserved
      expect(firstTenant?.slug).toBeDefined();
      expect(firstTenant?.name).toBeDefined();
    });

    it("keeps labels stable regardless of array sorting or filtering order", () => {
      const mockTenants = [
        { id: 1, name: "The Fragrance Store", createdAt: "2026-01-01T00:00:00Z" },
        { id: 2, name: "Oud Royale Boutique", createdAt: "2026-02-01T00:00:00Z" },
        { id: 3, name: "Amalfi Coast Parfums", createdAt: "2026-03-01T00:00:00Z" },
      ];

      // Initial compute
      const initialLabels = computeStableTenantLabels(mockTenants);
      expect(initialLabels.get(1)).toBe("Website A");
      expect(initialLabels.get(2)).toBe("Website B");
      expect(initialLabels.get(3)).toBe("Website C");

      // Sorted by reverse name (Z-A)
      const reverseSorted = [...mockTenants].sort((a, b) => b.name.localeCompare(a.name));
      const labelsAfterSort = computeStableTenantLabels(reverseSorted);
      expect(labelsAfterSort.get(1)).toBe("Website A");
      expect(labelsAfterSort.get(2)).toBe("Website B");
      expect(labelsAfterSort.get(3)).toBe("Website C");

      // Filtered to only single item (e.g. search for "Oud")
      const filtered = mockTenants.filter((t) => t.name.includes("Oud"));
      // Using global tenant context or persistent displayLabel
      const oudLabel = getStableTenantLabel(
        { ...filtered[0], displayLabel: initialLabels.get(filtered[0].id) },
        mockTenants
      );
      expect(oudLabel).toBe("Website B");
    });

    it("assigns next available stable label to new tenants without reusing existing labels", () => {
      const existing = [
        { id: 1, createdAt: "2026-01-01T00:00:00Z" },
        { id: 2, createdAt: "2026-02-01T00:00:00Z" },
      ];
      const newTenant = { id: 3, createdAt: "2026-04-01T00:00:00Z" };

      const all = [...existing, newTenant];
      const labels = computeStableTenantLabels(all);

      expect(labels.get(1)).toBe("Website A");
      expect(labels.get(2)).toBe("Website B");
      expect(labels.get(3)).toBe("Website C");
    });

    it("supports searching tenants by displayLabel in listTenants API", async () => {
      const searchWebsiteA = await listTenants({ search: "Website A" });
      expect(searchWebsiteA.length).toBeGreaterThan(0);
      expect(searchWebsiteA[0].displayLabel).toBe("Website A");
    });
  });

  describe("Platform Navigation Consistency (Desktop & Mobile)", () => {
    it("contains all 8 required platform-level destinations in superMasterNavigation", () => {
      const group = superMasterNavigation[0];
      expect(group.label).toBe("Platform Control Center");

      const requiredPaths = [
        "/super-master",
        "/super-master/websites",
        "/super-master/owners",
        "/super-master/analytics",
        "/super-master/subscriptions",
        "/super-master/monitoring",
        "/super-master/audit-logs",
        "/super-master/settings",
      ];

      const navPaths = group.items.map((i) => i.path);
      for (const requiredPath of requiredPaths) {
        expect(navPaths).toContain(requiredPath);
      }
      expect(group.items.length).toBe(8);
    });

    it("has exact required labels matching specification", () => {
      const labels = superMasterNavigation[0].items.map((i) => i.label);
      expect(labels).toContain("Platform Overview");
      expect(labels).toContain("Websites");
      expect(labels).toContain("Shop Owners");
      expect(labels).toContain("Analytics & Usage");
      expect(labels).toContain("Subscriptions");
      expect(labels).toContain("Monitoring & Errors");
      expect(labels).toContain("Audit Logs");
      expect(labels).toContain("Platform Settings");
    });

    it("separates platform governance from boutique shop-owner administration", () => {
      const superMasterPaths = superMasterNavigation[0].items.map((i) => i.path);
      // Shop operational routes should not be mixed into platform governance
      expect(superMasterPaths).not.toContain("/inventory");
      expect(superMasterPaths).not.toContain("/warehouse");
      expect(superMasterPaths).not.toContain("/gst-rules");
      expect(superMasterPaths).not.toContain("/shipping-rules");
    });
  });

  describe("Authorization & Role Isolation", () => {
    it("recognizes mdsohail88008@gmail.com with admin or super_master role as authorized Super Master", () => {
      expect(isSuperMaster({ email: "mdsohail88008@gmail.com", role: "admin" })).toBe(true);
      expect(isSuperMaster({ email: "mdsohail88008@gmail.com", role: "super_master" })).toBe(true);
      // Unprivileged role with matching email cannot escalate
      expect(isSuperMaster({ email: "mdsohail88008@gmail.com", role: "user" })).toBe(false);
    });

    it("denies regular shop owners Super Master status", () => {
      expect(isSuperMaster({ email: "admin@freshflow.com" })).toBe(false);
      expect(isSuperMaster({ email: "buyer@example.com" })).toBe(false);
      expect(isSuperMaster(null)).toBe(false);
    });
  });
});
