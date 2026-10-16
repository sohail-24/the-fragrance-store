import { describe, expect, it } from "vitest";
import { canAccessCompany } from "./companyRouter";
import { canAccessOrderDetails, orderRouter } from "./orderRouter";
import { SUPER_MASTER_EMAIL } from "../contracts/roles";

describe("authorization hardening", () => {
  const order = { buyerId: 11, supplierId: 22, placedByUserId: 33 };

  it("rejects unauthenticated order-detail callers before any order is read", async () => {
    const caller = orderRouter.createCaller({
      req: { headers: new Headers() } as any,
      resHeaders: new Headers(),
    });

    await expect(caller.detail({ orderId: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("permits only an order party or the placing customer", () => {
    expect(
      canAccessOrderDetails({
        user: { id: 33, role: "buyer" },
        order,
      }),
    ).toBe(true);
    expect(
      canAccessOrderDetails({
        user: { id: 44, role: "buyer", companyId: 99 },
        order,
      }),
    ).toBe(false);
  });

  it("permits Super Master order access through the explicit platform identity", () => {
    expect(
      canAccessOrderDetails({
        user: { id: 1, email: SUPER_MASTER_EMAIL, role: "super_master" },
        order,
      }),
    ).toBe(true);
  });

  it("restricts tenant administrators to their assigned company or active membership", () => {
    const tenantAdmin = { id: 10, email: "admin@tenant-a.test", role: "admin", companyId: 1 };

    expect(canAccessCompany({ user: tenantAdmin, companyId: 1 })).toBe(true);
    expect(canAccessCompany({ user: tenantAdmin, companyId: 2 })).toBe(false);
    expect(canAccessCompany({ user: tenantAdmin, companyId: 2, hasActiveMembership: true })).toBe(true);
  });

  it("permits Super Master company access without granting generic admins platform access", () => {
    expect(
      canAccessCompany({
        user: { id: 1, email: SUPER_MASTER_EMAIL, role: "super_master" },
        companyId: 999,
      }),
    ).toBe(true);
    expect(
      canAccessCompany({
        user: { id: 2, email: "ordinary-admin@tenant.test", role: "admin" },
        companyId: 999,
      }),
    ).toBe(false);
  });
});
