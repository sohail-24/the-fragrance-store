import { describe, expect, it } from "vitest";
import { isSuperMaster, getAppRole, SUPER_MASTER_EMAIL } from "../contracts/roles";
import { superMasterRouter } from "./superMasterRouter";
import { validateAdminCredentials } from "./auth/admin-session";
import { appRouter } from "./router";

describe("Super Master Dashboard & Authorization Verification", () => {
  it("enforces strict role & identity policy for Super Master", () => {
    // 1. Authorized Super Master
    expect(isSuperMaster({ email: SUPER_MASTER_EMAIL, role: "admin" })).toBe(true);
    expect(isSuperMaster({ email: SUPER_MASTER_EMAIL.toUpperCase(), role: "admin" })).toBe(true);
    expect(isSuperMaster({ email: ` ${SUPER_MASTER_EMAIL} `, role: "admin" })).toBe(true);
    expect(isSuperMaster({ email: SUPER_MASTER_EMAIL, role: "super_master" })).toBe(true);

    // 2. Ordinary Admin - strictly forbidden from Level 1
    expect(isSuperMaster({ email: "admin@freshflow.com", role: "admin" })).toBe(false);
    expect(isSuperMaster({ email: "store_admin@thefragrancestore.com", role: "admin" })).toBe(false);

    // 3. Ordinary Shop Owner - strictly forbidden from Level 1
    expect(isSuperMaster({ email: "owner@freshflow.com", role: "business_owner" })).toBe(false);
    expect(isSuperMaster({ email: "boutique_owner@niche.com", role: "owner" })).toBe(false);

    // 4. Ordinary Customer / Buyer - strictly forbidden from Level 1
    expect(isSuperMaster({ email: "customer@gmail.com", role: "buyer" })).toBe(false);
    expect(isSuperMaster({ email: "customer@gmail.com", role: "user" })).toBe(false);

    // 5. Privilege escalation attempt: matching email but unprivileged role
    expect(isSuperMaster({ email: SUPER_MASTER_EMAIL, role: "buyer" })).toBe(false);
    expect(isSuperMaster({ email: SUPER_MASTER_EMAIL, role: "customer" })).toBe(false);
    expect(isSuperMaster({ email: SUPER_MASTER_EMAIL, role: "" })).toBe(false);

    // 6. Anonymous / unauthenticated
    expect(isSuperMaster(null)).toBe(false);
    expect(isSuperMaster(undefined)).toBe(false);
  });

  it("resolves correct AppRole navigation tier", () => {
    expect(getAppRole({ email: SUPER_MASTER_EMAIL, role: "admin" })).toBe("super_master");
    expect(getAppRole({ email: "admin@freshflow.com", role: "admin" })).toBe("platform_admin");
    expect(getAppRole({ email: "customer@gmail.com", role: "buyer" })).toBe("buyer");
  });

  it("verifies superMasterRouter procedure registration and isolation", () => {
    const procedures = (superMasterRouter as any)._def.procedures;

    // Must expose required SaaS management procedures
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

    // Must NOT expose destructive physical deletion endpoint
    expect(procedures.deleteTenant).toBeUndefined();

    // Must be properly registered in appRouter
    const appProcedures = (appRouter as any)._def.procedures;
    expect(appProcedures["superMaster.stats"]).toBeDefined();
    expect(appProcedures["superMaster.listTenants"]).toBeDefined();
    expect(appProcedures["superMaster.createTenant"]).toBeDefined();
    expect(appProcedures["superMaster.updateTenant"]).toBeDefined();
    expect(appProcedures["superMaster.setStatus"]).toBeDefined();
    expect(appProcedures["superMaster.listOwners"]).toBeDefined();
    expect(appProcedures["superMaster.assignOwner"]).toBeDefined();
    expect(appProcedures["superMaster.systemHealth"]).toBeDefined();
    expect(appProcedures["superMaster.auditLogs"]).toBeDefined();
  });

  it("validates administrator and super master authentication credentials safely", () => {
    // Configured admin login
    expect(validateAdminCredentials("admin@freshflow.com", "admin123")).toBe(true);

    // Super Master login
    expect(validateAdminCredentials(SUPER_MASTER_EMAIL, "admin123")).toBe(true);

    // Case-insensitivity & trimming
    expect(validateAdminCredentials(`  ${SUPER_MASTER_EMAIL.toUpperCase()}  `, "admin123")).toBe(true);

    // Invalid password
    expect(validateAdminCredentials(SUPER_MASTER_EMAIL, "wrongpassword")).toBe(false);
    expect(validateAdminCredentials("admin@freshflow.com", "wrongpassword")).toBe(false);

    // Unknown email
    expect(validateAdminCredentials("unknown@example.com", "admin123")).toBe(false);
  });

  it("enforces strict rejection for unauthorized callers on superMaster procedures", async () => {
    const callerOrdinaryAdmin = superMasterRouter.createCaller({
      req: { headers: {} } as any,
      resHeaders: new Headers(),
      user: {
        id: 2,
        email: "admin@freshflow.com",
        role: "admin",
      } as any,
    });

    // Ordinary admin cannot access Level 1 procedures
    await expect(callerOrdinaryAdmin.stats()).rejects.toThrow(/Super Master/);
    await expect(callerOrdinaryAdmin.listOwners()).rejects.toThrow(/Super Master/);
    await expect(callerOrdinaryAdmin.systemHealth()).rejects.toThrow(/Super Master/);
    await expect(callerOrdinaryAdmin.auditLogs()).rejects.toThrow(/Super Master/);

    const callerCustomer = superMasterRouter.createCaller({
      req: { headers: {} } as any,
      resHeaders: new Headers(),
      user: {
        id: 3,
        email: "shopper@perfume.com",
        role: "buyer",
      } as any,
    });

    // Customer cannot access Level 1 procedures
    await expect(callerCustomer.stats()).rejects.toThrow(/Super Master/);
    await expect(callerCustomer.listOwners()).rejects.toThrow(/Super Master/);
    await expect(callerCustomer.systemHealth()).rejects.toThrow(/Super Master/);
    await expect(callerCustomer.auditLogs()).rejects.toThrow(/Super Master/);

    const callerAnonymous = superMasterRouter.createCaller({
      req: { headers: {} } as any,
      resHeaders: new Headers(),
      user: null,
    });

    // Anonymous visitor cannot access Level 1 stats
    await expect(callerAnonymous.stats()).rejects.toThrow();
  });

  it("allows authorized Super Master caller to retrieve real platform data", async () => {
    const callerSuperMaster = superMasterRouter.createCaller({
      req: { headers: {} } as any,
      resHeaders: new Headers(),
      user: {
        id: 2,
        email: SUPER_MASTER_EMAIL,
        role: "admin",
      } as any,
    });

    const stats = await callerSuperMaster.stats();
    expect(stats.totalTenants).toBeGreaterThanOrEqual(1);
    expect(stats.currency).toBe("INR");
    expect(Array.isArray(stats.tenants)).toBe(true);

    const health = await callerSuperMaster.systemHealth();
    expect(health.database.status).toBe("healthy");
    expect(health.server.status).toBe("online");

    const owners = await callerSuperMaster.listOwners();
    expect(Array.isArray(owners)).toBe(true);

    const audit = await callerSuperMaster.auditLogs();
    expect(Array.isArray(audit.events)).toBe(true);
  });
});
