import { describe, expect, it } from "vitest";
import { isSuperMaster, isOwner, isPlatformAdmin, getAppRole } from "../contracts/roles";

describe("Phase 2.1 Security & Role Hardening Tests", () => {
  const configuredSuperMasterEmail = "mdsohail88008@gmail.com";

  describe("Super Master Authorization Barrier", () => {
    it("permits verified admin identity matching configured Super Master email", () => {
      const user = {
        email: "mdsohail88008@gmail.com",
        role: "admin",
      };
      expect(isSuperMaster(user, configuredSuperMasterEmail)).toBe(true);
      expect(getAppRole(user)).toBe("super_master");
    });

    it("rejects an ordinary user or buyer attempting to spoof the Super Master email without admin credentials", () => {
      const spoofedCustomer = {
        email: "mdsohail88008@gmail.com",
        role: "user",
      };
      // Must return false: email matches, but lacking verified admin/super_master role
      expect(isSuperMaster(spoofedCustomer, configuredSuperMasterEmail)).toBe(false);
    });

    it("rejects a generic administrator or staff with a non-matching email", () => {
      const genericAdmin = {
        email: "admin@other-store.com",
        role: "admin",
      };
      expect(isSuperMaster(genericAdmin, configuredSuperMasterEmail)).toBe(false);
      expect(isPlatformAdmin(genericAdmin)).toBe(true);
      expect(getAppRole(genericAdmin)).toBe("platform_admin");
    });

    it("rejects empty, null, or undefined user identities", () => {
      expect(isSuperMaster(null, configuredSuperMasterEmail)).toBe(false);
      expect(isSuperMaster(undefined, configuredSuperMasterEmail)).toBe(false);
      expect(isSuperMaster({ email: "", role: "admin" }, configuredSuperMasterEmail)).toBe(false);
    });

    it("normalizes case and leading/trailing whitespace securely", () => {
      const user = {
        email: "  MDsohail88008@Gmail.com  ",
        role: "admin",
      };
      expect(isSuperMaster(user, configuredSuperMasterEmail)).toBe(true);
    });
  });

  describe("Role Separation and Boundaries", () => {
    it("distinguishes Super Master, Business Owner, Platform Admin, and Buyer correctly", () => {
      const superMasterUser = { email: "mdsohail88008@gmail.com", role: "admin" };
      const platformAdminUser = { email: "operations@freshflow.com", role: "admin" };
      const regularBuyerUser = { email: "customer@gmail.com", role: "user" };

      expect(getAppRole(superMasterUser)).toBe("super_master");
      expect(getAppRole(platformAdminUser)).toBe("platform_admin");
      expect(getAppRole(regularBuyerUser)).toBe("buyer");
    });
  });
});
