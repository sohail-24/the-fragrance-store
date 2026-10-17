import { describe, expect, it, vi } from "vitest";
import {
  authenticateTenantAdminWithDependencies,
  type TenantAdminAuthenticationDependencies,
  signTenantAdminToken,
  verifyTenantAdminToken,
  issueTenantAdminSessionCookie,
  clearTenantAdminSessionCookie,
  tenantAdminAccessCookieName,
} from "./tenant-admin-auth";
import { authRouter } from "../auth-router";

const tenantA = { id: 1, slug: "tenant-a", isActive: true };
const tenantB = { id: 2, slug: "tenant-b", isActive: true };
const user = {
  id: 42,
  email: "owner@tenant.test",
  passwordHash: "valid-bcrypt-hash",
  isActive: true,
};

function dependencies(overrides: Partial<TenantAdminAuthenticationDependencies> = {}) {
  return {
    findTenantByCanonicalSlug: vi.fn(async (slug: string) =>
      slug === tenantA.slug ? tenantA : slug === tenantB.slug ? tenantB : null,
    ),
    findUserByEmail: vi.fn(async (email: string) => (email === user.email ? user : null)),
    findMembership: vi.fn(async (userId: number, companyId: number) =>
      userId === user.id && companyId === tenantA.id
        ? { userId, companyId, role: "owner" as const, isActive: true }
        : null,
    ),
    verifySecret: vi.fn(async (password: string, passwordHash: string) =>
      password === "correct-password" && passwordHash === user.passwordHash,
    ),
    ...overrides,
  } satisfies TenantAdminAuthenticationDependencies;
}

async function expectDenied(
  overrides: Partial<TenantAdminAuthenticationDependencies> = {},
  options: { email?: string; password?: string; tenantSlug?: string } = {},
) {
  await expect(
    authenticateTenantAdminWithDependencies(
      options.email ?? user.email,
      options.password ?? "correct-password",
      options.tenantSlug ?? tenantA.slug,
      dependencies(overrides),
    ),
  ).rejects.toMatchObject({ name: "TenantAdminAuthenticationError" });
}

describe("tenant administrator authentication", () => {
  it("returns a tenant-bound principal for an active user with an active membership", async () => {
    const deps = dependencies();

    await expect(
      authenticateTenantAdminWithDependencies(user.email.toUpperCase(), "correct-password", tenantA.slug, deps),
    ).resolves.toEqual({
      userId: user.id,
      companyId: tenantA.id,
      tenantSlug: tenantA.slug,
      membershipRole: "owner",
    });

    expect(deps.findTenantByCanonicalSlug).toHaveBeenCalledWith(tenantA.slug);
    expect(deps.findUserByEmail).toHaveBeenCalledWith(user.email);
    expect(deps.findMembership).toHaveBeenCalledWith(user.id, tenantA.id);
  });

  it("rejects a wrong password", async () => {
    await expectDenied({}, { password: "wrong-password" });
  });

  it("rejects a missing or inactive user and a missing password hash", async () => {
    await expectDenied({ findUserByEmail: vi.fn(async () => null) });
    await expectDenied({ findUserByEmail: vi.fn(async () => ({ ...user, isActive: false })) });
    await expectDenied({ findUserByEmail: vi.fn(async () => ({ ...user, passwordHash: null })) });
  });

  it("rejects unknown and inactive tenants", async () => {
    await expectDenied({}, { tenantSlug: "unknown-tenant" });
    await expectDenied({ findTenantByCanonicalSlug: vi.fn(async () => ({ ...tenantA, isActive: false })) });
  });

  it("rejects aliases and numeric identifiers instead of falling back to another tenant", async () => {
    await expectDenied({ findTenantByCanonicalSlug: vi.fn(async () => tenantA) }, { tenantSlug: "website-a" });
    await expectDenied({}, { tenantSlug: "1" });
  });

  it("rejects missing, inactive, mismatched, and unsupported memberships", async () => {
    await expectDenied({ findMembership: vi.fn(async () => null) });
    await expectDenied({ findMembership: vi.fn(async () => ({ userId: user.id, companyId: tenantA.id, role: "owner" as const, isActive: false })) });
    await expectDenied({ findMembership: vi.fn(async () => ({ userId: user.id, companyId: tenantB.id, role: "owner" as const, isActive: true })) });
    await expectDenied({ findMembership: vi.fn(async () => ({ userId: user.id, companyId: tenantA.id, role: "platform_admin", isActive: true } as any)) });
  });

  it("authorizes a multi-tenant user only for the selected tenant membership", async () => {
    const deps = dependencies({
      findMembership: vi.fn(async (userId, companyId) => {
        if (userId !== user.id) return null;
        if (companyId === tenantA.id) return { userId, companyId, role: "owner" as const, isActive: true };
        if (companyId === tenantB.id) return { userId, companyId, role: "staff" as const, isActive: true };
        return null;
      }),
    });

    await expect(authenticateTenantAdminWithDependencies(user.email, "correct-password", tenantA.slug, deps)).resolves.toMatchObject({
      companyId: tenantA.id,
      membershipRole: "owner",
    });
    await expect(authenticateTenantAdminWithDependencies(user.email, "correct-password", tenantB.slug, deps)).resolves.toMatchObject({
      companyId: tenantB.id,
      membershipRole: "staff",
    });
  });

  it("denies database failures and does not invoke Super Master authentication", async () => {
    const failingLookup = vi.fn(async () => {
      throw new Error("database unavailable");
    });

    await expectDenied({ findTenantByCanonicalSlug: failingLookup });
    expect(failingLookup).toHaveBeenCalledOnce();
  });

  it("does not grant tenant access from a platform role without an active membership", async () => {
    await expectDenied({
      findUserByEmail: vi.fn(async () => ({ ...user, role: "super_master" })),
      findMembership: vi.fn(async () => null),
    });
  });

  it("uses read-only dependencies only on both success and failure", async () => {
    const successDeps = dependencies();
    const failureDeps = dependencies({ findMembership: vi.fn(async () => null) });

    await authenticateTenantAdminWithDependencies(user.email, "correct-password", tenantA.slug, successDeps);
    await expect(
      authenticateTenantAdminWithDependencies(user.email, "correct-password", tenantA.slug, failureDeps),
    ).rejects.toMatchObject({ name: "TenantAdminAuthenticationError" });

    for (const dependency of [successDeps, failureDeps]) {
      expect(Object.keys(dependency)).toEqual([
        "findTenantByCanonicalSlug",
        "findUserByEmail",
        "findMembership",
        "verifySecret",
      ]);
    }
  });

  describe("tenant admin token and cookie issuance", () => {
    it("signs and verifies a tenant admin token with bound tenant identity", async () => {
      const principal = {
        userId: 42,
        companyId: 10,
        tenantSlug: "niche-parfums",
        membershipRole: "admin" as const,
      };

      const token = await signTenantAdminToken(principal);
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(20);

      const verified = await verifyTenantAdminToken(token);
      expect(verified).toEqual(principal);
    });

    it("issues and clears the isolated tenant_admin_access cookie", () => {
      const reqHeaders = new Headers();
      const resHeaders = new Headers();

      issueTenantAdminSessionCookie("sample-tenant-token", reqHeaders, resHeaders);
      const setCookie = resHeaders.get("set-cookie");
      expect(setCookie).toContain(tenantAdminAccessCookieName);
      expect(setCookie).toContain("sample-tenant-token");
      expect(setCookie).not.toContain("shop_admin_access");

      const clearHeaders = new Headers();
      clearTenantAdminSessionCookie(reqHeaders, clearHeaders);
      const cleared = clearHeaders.get("set-cookie");
      expect(cleared).toContain(tenantAdminAccessCookieName);
      expect(cleared).toContain("Max-Age=0");
    });
  });

  describe("authRouter.loginTenantAdmin procedure registration", () => {
    it("registers loginTenantAdmin on authRouter", () => {
      const procedures = (authRouter as any)._def.procedures;
      expect(procedures.loginTenantAdmin).toBeDefined();
      expect(procedures.loginAdmin).toBeDefined();
    });

    it("fails closed on invalid credentials or unavailable database", async () => {
      const caller = authRouter.createCaller({
        req: new Request("http://localhost/api/trpc"),
        resHeaders: new Headers(),
      });

      await expect(
        caller.loginTenantAdmin({
          email: "unknown@example.com",
          password: "wrong",
          tenantSlug: "non-existent-tenant",
        }),
      ).rejects.toThrow();
    });
  });
});
