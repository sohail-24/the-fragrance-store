import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  validateSuperMasterCredentials,
  validateOrdinaryAdminCredentials,
  validateAdminCredentials,
  isSuperMasterConfigured,
  isSuperMasterEmail,
  signAdminToken,
  authenticateAdminRequest,
} from "./auth/admin-session";
import { authRouter } from "./auth-router";
import { isSuperMaster, getAppRole } from "../contracts/roles";

describe("Super Master Authentication & Secrets Hardening", () => {
  const TEST_SM_EMAIL = "supermaster.platform@thefragrancestore.com";
  const TEST_SM_PASSWORD = "CorrectSuperMasterPassword99!";
  const TEST_ADMIN_EMAIL = "admin@freshflow.com";
  const TEST_ADMIN_PASSWORD = "admin123";

  let savedSmEmail: string | undefined;
  let savedSmPass: string | undefined;

  beforeEach(() => {
    savedSmEmail = process.env.SUPER_MASTER_EMAIL;
    savedSmPass = process.env.SUPER_MASTER_PASSWORD;
  });

  afterEach(() => {
    process.env.SUPER_MASTER_EMAIL = savedSmEmail;
    process.env.SUPER_MASTER_PASSWORD = savedSmPass;
  });

  it("1. Correct configured Super Master email and password succeed", async () => {
    process.env.SUPER_MASTER_EMAIL = TEST_SM_EMAIL;
    process.env.SUPER_MASTER_PASSWORD = TEST_SM_PASSWORD;

    expect(isSuperMasterConfigured()).toBe(true);
    expect(isSuperMasterEmail(TEST_SM_EMAIL)).toBe(true);
    expect(validateSuperMasterCredentials(TEST_SM_EMAIL, TEST_SM_PASSWORD)).toBe(true);
    expect(validateAdminCredentials(TEST_SM_EMAIL, TEST_SM_PASSWORD)).toBe(true);

    // Case-insensitivity and whitespace trimming
    expect(validateSuperMasterCredentials(`  ${TEST_SM_EMAIL.toUpperCase()}  `, TEST_SM_PASSWORD)).toBe(true);

    // Caller through authRouter tRPC procedure
    const caller = authRouter.createCaller({
      req: { headers: new Headers() } as any,
      resHeaders: new Headers(),
      user: null,
    });

    const result = await caller.loginAdmin({
      email: TEST_SM_EMAIL,
      password: TEST_SM_PASSWORD,
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(TEST_SM_EMAIL.toLowerCase());
    expect(result.user.role).toBe("super_master");
    expect(isSuperMaster(result.user)).toBe(true);
    expect(getAppRole(result.user)).toBe("super_master");
    expect(result.token).toBeDefined();
  });

  it("2. Incorrect password fails for Super Master", async () => {
    process.env.SUPER_MASTER_EMAIL = TEST_SM_EMAIL;
    process.env.SUPER_MASTER_PASSWORD = TEST_SM_PASSWORD;

    expect(validateSuperMasterCredentials(TEST_SM_EMAIL, "wrong-password")).toBe(false);
    expect(validateAdminCredentials(TEST_SM_EMAIL, "wrong-password")).toBe(false);

    const caller = authRouter.createCaller({
      req: { headers: new Headers() } as any,
      resHeaders: new Headers(),
      user: null,
    });

    await expect(
      caller.loginAdmin({
        email: TEST_SM_EMAIL,
        password: "definitely-wrong-password",
      })
    ).rejects.toThrow("Invalid administrator credentials");
  });

  it("3. Ordinary administrator credentials cannot authenticate as Super Master", async () => {
    process.env.SUPER_MASTER_EMAIL = TEST_SM_EMAIL;
    process.env.SUPER_MASTER_PASSWORD = TEST_SM_PASSWORD;

    // Ordinary admin email is not Super Master
    expect(isSuperMasterEmail(TEST_ADMIN_EMAIL)).toBe(false);
    expect(validateSuperMasterCredentials(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)).toBe(false);

    const caller = authRouter.createCaller({
      req: { headers: new Headers() } as any,
      resHeaders: new Headers(),
      user: null,
    });

    // Logging in with ordinary admin credentials yields role: "admin", not "super_master"
    const result = await caller.loginAdmin({
      email: TEST_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD,
    });

    expect(result.user.role).toBe("admin");
    expect(isSuperMaster(result.user)).toBe(false);
    expect(getAppRole(result.user)).toBe("platform_admin");
  });

  it("4. Super Master token verification works after login and returns authoritative super_master role", async () => {
    process.env.SUPER_MASTER_EMAIL = TEST_SM_EMAIL;
    process.env.SUPER_MASTER_PASSWORD = TEST_SM_PASSWORD;

    // Sign a Super Master token
    const token = await signAdminToken(TEST_SM_EMAIL, "access", "super_master");

    // Authenticate via Bearer header
    const headers = new Headers();
    headers.set("authorization", `Bearer ${token}`);

    const verifiedUser = await authenticateAdminRequest(headers);
    expect(verifiedUser).toBeDefined();
    expect(verifiedUser.email).toBe(TEST_SM_EMAIL.toLowerCase());
    expect(verifiedUser.role).toBe("super_master");
    expect(isSuperMaster(verifiedUser)).toBe(true);
  });

  it("5. A forged client role cannot obtain Super Master access", async () => {
    process.env.SUPER_MASTER_EMAIL = TEST_SM_EMAIL;
    process.env.SUPER_MASTER_PASSWORD = TEST_SM_PASSWORD;

    // An attacker attempts to forge a token with an ordinary admin email claiming super_master role
    const forgedToken = await signAdminToken(TEST_ADMIN_EMAIL, "access", "super_master");

    const headers = new Headers();
    headers.set("authorization", `Bearer ${forgedToken}`);

    // Verification must detect the non-matching subject and reject the forged role
    await expect(authenticateAdminRequest(headers)).rejects.toThrow(/Forged role/);

    // Client-supplied object claiming super_master without matching email is rejected by isSuperMaster
    const spoofedUser = { email: TEST_ADMIN_EMAIL, role: "super_master" };
    expect(isSuperMaster(spoofedUser)).toBe(false);
  });

  it("6. Ordinary administrator login remains fully functional", async () => {
    process.env.SUPER_MASTER_EMAIL = TEST_SM_EMAIL;
    process.env.SUPER_MASTER_PASSWORD = TEST_SM_PASSWORD;

    expect(validateOrdinaryAdminCredentials(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)).toBe(true);
    expect(validateAdminCredentials(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)).toBe(true);

    const caller = authRouter.createCaller({
      req: { headers: new Headers() } as any,
      resHeaders: new Headers(),
      user: null,
    });

    const result = await caller.loginAdmin({
      email: TEST_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD,
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(TEST_ADMIN_EMAIL);
    expect(result.user.role).toBe("admin");
  });

  it("7. Missing Super Master configuration fails closed with an actionable error", async () => {
    // Case A: Missing password
    process.env.SUPER_MASTER_EMAIL = TEST_SM_EMAIL;
    process.env.SUPER_MASTER_PASSWORD = "";

    expect(isSuperMasterConfigured()).toBe(false);
    expect(validateSuperMasterCredentials(TEST_SM_EMAIL, TEST_SM_PASSWORD)).toBe(false);

    const caller = authRouter.createCaller({
      req: { headers: new Headers() } as any,
      resHeaders: new Headers(),
      user: null,
    });

    await expect(
      caller.loginAdmin({
        email: TEST_SM_EMAIL,
        password: TEST_SM_PASSWORD,
      })
    ).rejects.toThrow(/Super Master authentication is not configured/);

    // Case B: Completely unconfigured (both empty)
    process.env.SUPER_MASTER_EMAIL = "";
    process.env.SUPER_MASTER_PASSWORD = "";

    expect(isSuperMasterConfigured()).toBe(false);
    expect(validateSuperMasterCredentials(TEST_SM_EMAIL, TEST_SM_PASSWORD)).toBe(false);

    // Fails closed securely
    await expect(
      caller.loginAdmin({
        email: TEST_SM_EMAIL,
        password: TEST_SM_PASSWORD,
      })
    ).rejects.toThrow("Invalid administrator credentials.");
  });
});
