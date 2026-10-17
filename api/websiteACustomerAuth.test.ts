import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./router";
import { findUserByEmail } from "./queries/users";
import { hashSecret } from "./auth/password";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { TRPCError } from "@trpc/server";
import { createContext } from "./context";

describe("Website A Customer Account, Login & Registration", () => {
  const caller = appRouter.createCaller({
    req: new Request("http://localhost:3000/api/trpc"),
    resHeaders: new Headers(),
  });

  const testCustomerEmail = `testcustomer-${Date.now()}@thefragrancestore.com`;
  const testCustomerPassword = "LuxuryFragrance2026!";

  it("registers a new customer with valid email and password", async () => {
    const res = await caller.auth.registerCustomer({
      email: testCustomerEmail,
      password: testCustomerPassword,
      confirmPassword: testCustomerPassword,
      tenantSlug: "the-fragrance-store",
    });

    expect(res).toBeDefined();
    expect(res.user).toBeDefined();
    expect(res.user.email).toBe(testCustomerEmail.toLowerCase());
    expect(res.user.role).toBe("user");
    expect(res.token).toBeDefined();

    // Verify stored user in database has role "user" and password is not in plaintext
    const dbUser = await findUserByEmail(testCustomerEmail);
    expect(dbUser).toBeDefined();
    expect(dbUser?.role).toBe("user");
    expect(dbUser?.passwordHash).not.toBe(testCustomerPassword);
    expect(dbUser?.passwordHash).toMatch(/^\$2[aby]?\$/);
  });

  it("rejects registration when password and confirmPassword do not match", async () => {
    await expect(
      caller.auth.registerCustomer({
        email: `mismatch-${Date.now()}@thefragrancestore.com`,
        password: "Password123!",
        confirmPassword: "DifferentPassword456!",
        tenantSlug: "the-fragrance-store",
      })
    ).rejects.toThrow(/passwords do not match/i);
  });

  it("rejects registration when email already exists (duplicate check)", async () => {
    await expect(
      caller.auth.registerCustomer({
        email: testCustomerEmail,
        password: "AnotherPassword123!",
        confirmPassword: "AnotherPassword123!",
        tenantSlug: "the-fragrance-store",
      })
    ).rejects.toThrow(/an account with this email already exists/i);
  });

  it("strictly enforces customer-only role on registration (prevents privilege escalation)", async () => {
    const escalationEmail = `escalation-attempt-${Date.now()}@freshflow.com`;
    const res = await caller.auth.registerCustomer({
      email: escalationEmail,
      password: "SuperSecret123!",
      confirmPassword: "SuperSecret123!",
      tenantSlug: "the-fragrance-store",
    });

    expect(res.user.role).toBe("user");
    const dbUser = await findUserByEmail(escalationEmail);
    expect(dbUser?.role).toBe("user");
    expect(dbUser?.role).not.toBe("admin");
    expect(dbUser?.role).not.toBe("super_master");
  });

  it("authenticates registered customer with correct email and password", async () => {
    const res = await caller.auth.loginCustomer({
      email: testCustomerEmail,
      password: testCustomerPassword,
      tenantSlug: "the-fragrance-store",
    });

    expect(res).toBeDefined();
    expect(res.user.email).toBe(testCustomerEmail.toLowerCase());
    expect(res.user.role).toBe("user");
    expect(res.token).toBeDefined();
  });

  it("rejects customer login with invalid password", async () => {
    await expect(
      caller.auth.loginCustomer({
        email: testCustomerEmail,
        password: "WrongPassword999!",
        tenantSlug: "the-fragrance-store",
      })
    ).rejects.toThrow(/invalid email or password/i);
  });

  it("rejects customer login with non-existent email", async () => {
    await expect(
      caller.auth.loginCustomer({
        email: `nonexistent-${Date.now()}@example.com`,
        password: "SomePassword123!",
        tenantSlug: "the-fragrance-store",
      })
    ).rejects.toThrow(/invalid email or password/i);
  });

  it("ensures customer session does not authorize access to superMaster procedures", async () => {
    // Log in as customer
    const loginRes = await caller.auth.loginCustomer({
      email: testCustomerEmail,
      password: testCustomerPassword,
      tenantSlug: "the-fragrance-store",
    });

    // Create a context with the customer token in Authorization header
    const ctx = await createContext({
      req: new Request("http://localhost:3000/api/trpc", {
        headers: {
          authorization: `Bearer ${loginRes.token}`,
        },
      }),
      resHeaders: new Headers(),
    } as any);

    expect(ctx.user).toBeDefined();
    expect(ctx.user?.role).toBe("user");

    const customerCaller = appRouter.createCaller(ctx);

    // Attempt to invoke a Super Master procedure
    await expect(
      customerCaller.superMaster.stats()
    ).rejects.toThrow(/Super Master \(Level 1\) authorization required|forbidden/i);
  });
});
