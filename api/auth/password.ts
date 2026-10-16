import bcrypt from "bcryptjs";

const PASSWORD_COST = 12;

export function hashSecret(value: string) {
  return bcrypt.hash(value, PASSWORD_COST);
}

export function isSupportedPasswordHash(hash: string | null | undefined): hash is string {
  if (typeof hash !== "string") return false;
  return /^\$2(?:[aby])?\$(?:0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/.test(hash);
}

export async function verifySecret(value: string, hash: string) {
  if (!hash) return false;
  try {
    return await bcrypt.compare(value, hash);
  } catch {
    // Invalid or unsupported hashes must never authenticate a caller.
    return false;
  }
}
