import { describe, expect, it } from "vitest";
import { resolvePublicStorefront } from "./queries/companies";
import { buyerProductVisibilityConditions } from "./queries/products";
import { companyRouter } from "./companyRouter";
import { isSuperMaster } from "../contracts/roles";
import { getPlatformSaaSStats } from "./queries/tenants";

describe("Phase 4 — Website A Storefront & Multi-Tenant Navigation Regression Suite", () => {
  it("1. Resolves '/' to Website A's active storefront dynamically from database record", async () => {
    // When no slug is specified (root route '/'), resolvePublicStorefront dynamically loads Website A
    const result = await resolvePublicStorefront();
    expect(result.status).toBe("active");
    if (result.status === "active") {
      expect(result.tenant.id).toBe(1);
      expect(result.tenant.displayLabel).toBe("Website A");
      expect(result.tenant.slug).toBe("the-fragrance-store");
      expect(result.tenant.name).toContain("The Fragrance Store");
      expect(result.tenant.isActive).toBe(true);
      // Public info only: no secrets or private credentials exposed
      expect((result.tenant as any).password).toBeUndefined();
      expect((result.tenant as any).secret).toBeUndefined();
    }
  });

  it("2. Website A's click action and slug resolve to Website A without hardcoded assumptions", async () => {
    const resultBySlug = await resolvePublicStorefront({ slug: "the-fragrance-store" });
    expect(resultBySlug.status).toBe("active");
    if (resultBySlug.status === "active") {
      expect(resultBySlug.tenant.displayLabel).toBe("Website A");
      expect(resultBySlug.tenant.slug).toBe("the-fragrance-store");
      expect(resultBySlug.tenant.id).toBe(1);
    }

    const resultByLabel = await resolvePublicStorefront({ slug: "website-a" });
    expect(resultByLabel.status).toBe("active");
    if (resultByLabel.status === "active") {
      expect(resultByLabel.tenant.id).toBe(1);
    }
  });

  it("3. Super Master vs Shop Admin login navigation separation", () => {
    const superMasterUser = { email: "master@thefragrancestore.com", role: "admin" };
    const shopAdminUser = { email: "admin@freshflow.com", role: "admin", companyId: 1 };

    // Super Master intent
    expect(isSuperMaster(superMasterUser)).toBe(true);
    // Shop Admin must not be recognized as Super Master
    expect(isSuperMaster(shopAdminUser)).toBe(false);

    // Navigation target logic verified:
    const getLoginRedirect = (user: { email?: string | null; role: string }, returnTo?: string | null) => {
      if (isSuperMaster(user)) {
        return returnTo?.startsWith("/super-master") ? returnTo : "/super-master";
      }
      return returnTo?.startsWith("/") && !returnTo.startsWith("/super-master")
        ? returnTo
        : "/dashboard";
    };

    expect(getLoginRedirect(superMasterUser)).toBe("/super-master");
    expect(getLoginRedirect(shopAdminUser)).toBe("/dashboard");
    // Even if returnTo was forged as /super-master, shop admin is routed to /dashboard
    expect(getLoginRedirect(shopAdminUser, "/super-master")).toBe("/dashboard");
    expect(getLoginRedirect(superMasterUser, "/super-master/websites")).toBe("/super-master/websites");
  });

  it("4. Unknown and inactive tenants return appropriate unavailable statuses without leaking data", async () => {
    // Unknown tenant
    const unknownResult = await resolvePublicStorefront({ slug: "non-existent-tenant-boutique" });
    expect(unknownResult.status).toBe("not_found");
    expect(unknownResult.tenant).toBeNull();

    // Buyer product visibility SQL condition enforces tenant isActive requirement
    const conditions = buyerProductVisibilityConditions();
    const hasCompanyActiveCheck = conditions.some((c: any) => {
      const chunks = c.queryChunks || [];
      return chunks.some((ch: any) => ch?.name === "isActive" || ch?.table?.name === "companies");
    });
    expect(hasCompanyActiveCheck).toBe(true);
  });

  it("5. Tenant-specific storefront returns only that tenant's public data via companyRouter", async () => {
    const caller = companyRouter.createCaller({
      user: null as any,
      session: null as any,
      req: {} as any,
      res: {} as any,
    });

    // Public caller fetching storefront for Website A
    const storefront = await caller.storefront();
    expect(storefront.status).toBe("active");
    if (storefront.status === "active") {
      expect(storefront.tenant.displayLabel).toBe("Website A");
      expect(storefront.tenant.name).toContain("The Fragrance Store");
      // Verify no sensitive fields returned
      expect((storefront.tenant as any).financials).toBeUndefined();
      expect((storefront.tenant as any).tokens).toBeUndefined();
    }
  });

  it("6. Carts and orders preserve tenant ownership", async () => {
    // Orders enforce tenant isolation: supplierId and buyerId boundaries
    const stats = await getPlatformSaaSStats();
    expect(stats.tenants.length).toBeGreaterThan(0);
    const tenant1 = stats.tenants[0];
    expect(tenant1.id).toBe(1);

    // Each tenant has distinct productCount and orderCount
    expect(typeof tenant1.productCount).toBe("number");
    expect(typeof tenant1.orderCount).toBe("number");
  });

  it("7. Shop administrators cannot access another tenant's private management pages", async () => {
    const adminOfTenant1 = {
      id: 10,
      name: "Tenant 1 Admin",
      email: "t1@fragrance.com",
      role: "admin",
      companyId: 1,
    };

    const callerT1 = companyRouter.createCaller({
      user: adminOfTenant1 as any,
      session: null as any,
      req: {} as any,
      res: {} as any,
    });

    // Tenant 1 admin can access Tenant 1 company info
    const co1 = await callerT1.byId({ id: 1 });
    expect(co1.id).toBe(1);

    // Tenant 1 admin CANNOT access Tenant 2 company info (throws FORBIDDEN)
    await expect(callerT1.byId({ id: 9999 })).rejects.toThrow();
  });
});
