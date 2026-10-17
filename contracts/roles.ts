export const BUSINESS_OWNER_EMAIL = "mdsohail88008@gmail.com";
export const SUPER_MASTER_EMAIL = "mdsohail88008@gmail.com";

export const SaaSLevel = {
  LEVEL_1_SUPER_MASTER: "super_master",
  LEVEL_2_BRAND_OWNER: "business_owner",
  LEVEL_3_TENANT_STAFF: "tenant_staff",
  LEVEL_4_BUYER: "buyer",
} as const;

export const futureBusinessRoles = [
  "manager",
  "warehouse_staff",
  "sales_executive",
  "platform_admin",
  "super_master",
] as const;

export type FutureBusinessRole = (typeof futureBusinessRoles)[number];
export type AppRole = "buyer" | "business_owner" | "platform_admin" | "super_master";

export type UserLike = {
  email?: string | null;
  role?: string | null;
};

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

export function isOwner(user?: UserLike | null) {
  return normalizeEmail(user?.email) === BUSINESS_OWNER_EMAIL;
}

export function isPlatformAdmin(user?: UserLike | null) {
  return user?.role === "admin";
}

export function isSuperMaster(user?: UserLike | null, configuredSuperMasterEmail?: string | null) {
  if (!user) return false;
  const envEmail =
    typeof process !== "undefined" &&
    process?.env?.SUPER_MASTER_EMAIL &&
    process.env.SUPER_MASTER_EMAIL !== "undefined"
      ? process.env.SUPER_MASTER_EMAIL
      : null;
  const targetEmail = normalizeEmail(configuredSuperMasterEmail || envEmail || SUPER_MASTER_EMAIL);
  const userEmail = normalizeEmail(user.email);

  if (!userEmail || !targetEmail || userEmail !== targetEmail) {
    return false;
  }

  // Must possess explicit administrative authorization; an unprivileged user cannot escalate
  // simply by holding a matching email string.
  return user.role === "super_master" || user.role === "admin";
}

export function getAppRole(user?: UserLike | null): AppRole {
  if (isSuperMaster(user)) return "super_master";
  if (isPlatformAdmin(user)) return "platform_admin";
  if (isOwner(user)) return "business_owner";
  return "buyer";
}

export function getRoleLabel(role: AppRole) {
  const labels: Record<AppRole, string> = {
    super_master: "Super Master (SaaS Platform Owner)",
    buyer: "Buyer Workspace",
    business_owner: "Business Owner",
    platform_admin: "Platform Admin",
  };
  return labels[role] ?? "Buyer Workspace";
}

