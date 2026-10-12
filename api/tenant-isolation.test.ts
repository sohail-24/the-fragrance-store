import { describe, expect, it } from "vitest";
import { buyerProductVisibilityConditions } from "./queries/products";

describe("Phase 2.1 Tenant Isolation & Lifecycle Tests", () => {
  it("enforces tenant supplier isActive requirement in buyer product visibility SQL conditions", () => {
    const conditions = buyerProductVisibilityConditions();
    expect(conditions.length).toBeGreaterThanOrEqual(5);

    // Each SQL condition has queryChunks
    const chunks = conditions.flatMap((c: any) => c.queryChunks || []);
    const hasCompanyActiveCheck = chunks.some((chunk: any) => {
      return chunk?.name === "isActive" || chunk?.table?.name === "companies";
    });
    expect(hasCompanyActiveCheck).toBe(true);
  });

  it("verifies physical deletion endpoint deleteTenant is not exported by superMasterRouter", async () => {
    const { superMasterRouter } = await import("./superMasterRouter");
    const procedures = (superMasterRouter as any)._def.procedures;

    expect(procedures.stats).toBeDefined();
    expect(procedures.listTenants).toBeDefined();
    expect(procedures.tenantById).toBeDefined();
    expect(procedures.createTenant).toBeDefined();
    expect(procedures.updateTenant).toBeDefined();
    expect(procedures.setStatus).toBeDefined();

    // MUST NOT export deleteTenant
    expect(procedures.deleteTenant).toBeUndefined();
  });

  it("verifies membership query module is functional", async () => {
    const memberships = await import("./queries/memberships");
    expect(typeof memberships.findMembershipsByUserId).toBe("function");
    expect(typeof memberships.findMembershipsByCompanyId).toBe("function");
    expect(typeof memberships.findMembership).toBe("function");
    expect(typeof memberships.upsertTenantMembership).toBe("function");
  });
});
