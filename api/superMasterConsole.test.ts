import { describe, expect, it } from "vitest";
import {
  isSuperMaster,
  isPlatformAdmin,
  isOwner,
  getAppRole,
  SUPER_MASTER_EMAIL,
  BUSINESS_OWNER_EMAIL,
} from "../contracts/roles";
import { superMasterNavigation } from "../src/components/AppLayout";
import { superMasterRouter } from "./superMasterRouter";

describe("Super Master SaaS Control Center Verification", () => {
  describe("1. Main Entry Point & Role Authorization", () => {
    it("recognizes authorized Super Master and separates from ordinary shop owners and buyers", () => {
      const superMaster = { email: SUPER_MASTER_EMAIL, role: "admin" };
      const ordinaryAdmin = { email: "admin@freshflow.com", role: "admin" };
      const shopOwner = { email: BUSINESS_OWNER_EMAIL, role: "business_owner" };
      const buyer = { email: "shopper@perfume.com", role: "buyer" };

      expect(isSuperMaster(superMaster)).toBe(true);
      expect(getAppRole(superMaster)).toBe("super_master");

      expect(isSuperMaster(ordinaryAdmin)).toBe(false);
      expect(isSuperMaster(shopOwner)).toBe(false);
      expect(isSuperMaster(buyer)).toBe(false);

      expect(getAppRole(ordinaryAdmin)).toBe("platform_admin");
      expect(getAppRole(shopOwner)).toBe("business_owner");
      expect(getAppRole(buyer)).toBe("buyer");
    });
  });

  describe("2. Super Master Sidebar - Strict Platform Governance", () => {
    it("contains exactly and only platform-level navigation sections", () => {
      const allItems = superMasterNavigation.flatMap((g) => g.items);
      const labels = allItems.map((item) => item.label);
      const paths = allItems.map((item) => item.path);

      const requiredSections = [
        "Platform Overview",
        "Websites",
        "Shop Owners",
        "Analytics & Usage",
        "Subscriptions",
        "Monitoring & Errors",
        "Audit Logs",
        "Platform Settings",
      ];

      for (const section of requiredSections) {
        expect(labels).toContain(section);
      }

      // Must NOT contain shop-operational navigation
      const forbiddenShopOperations = [
        "Store Dashboard",
        "Product Catalog",
        "Categories",
        "Inventory",
        "Warehouse",
        "Orders",
        "Invoices",
        "Customers",
        "Delivery Zones",
      ];

      for (const forbidden of forbiddenShopOperations) {
        expect(labels).not.toContain(forbidden);
      }

      // All paths must begin with /super-master
      for (const p of paths) {
        expect(p.startsWith("/super-master")).toBe(true);
      }
    });
  });

  describe("3. Strict Tenant Security & Non-Destructive Operations", () => {
    it("verifies superMasterRouter does not expose destructive physical deletion", () => {
      const procedures = (superMasterRouter as any)._def.procedures;
      expect(procedures.deleteTenant).toBeUndefined();
      expect(procedures.removeWebsite).toBeUndefined();
      expect(procedures.destroyShop).toBeUndefined();
    });

    it("verifies required backend procedures for platform governance exist", () => {
      const procedures = (superMasterRouter as any)._def.procedures;
      expect(procedures.stats).toBeDefined();
      expect(procedures.listTenants).toBeDefined();
      expect(procedures.tenantById).toBeDefined();
      expect(procedures.createTenant).toBeDefined();
      expect(procedures.updateTenant).toBeDefined();
      expect(procedures.setStatus).toBeDefined();
      expect(procedures.listOwners).toBeDefined();
      expect(procedures.assignOwner).toBeDefined();
      expect(procedures.systemHealth).toBeDefined();
      expect(procedures.auditLogs).toBeDefined();
    });
  });
});
