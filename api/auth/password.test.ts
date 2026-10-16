import { describe, expect, it } from "vitest";
import { hashSecret, verifySecret } from "./password";

describe("password verification", () => {
  it("accepts a password that matches its bcrypt hash", async () => {
    const password = "correct-horse-battery-staple";
    const hash = await hashSecret(password);

    await expect(verifySecret(password, hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password for a valid bcrypt hash", async () => {
    const hash = await hashSecret("correct-horse-battery-staple");

    await expect(verifySecret("incorrect-password", hash)).resolves.toBe(false);
  });

  it("rejects malformed hashes without accepting fallback passwords", async () => {
    await expect(verifySecret("password", "not-a-valid-bcrypt-hash")).resolves.toBe(false);
    await expect(verifySecret("password123", "not-a-valid-bcrypt-hash")).resolves.toBe(false);
    await expect(verifySecret("admin123", "not-a-valid-bcrypt-hash")).resolves.toBe(false);
  });

  it("rejects missing password hashes", async () => {
    await expect(verifySecret("correct-horse-battery-staple", "")).resolves.toBe(false);
  });
});
