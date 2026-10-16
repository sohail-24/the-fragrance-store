import { eq } from "drizzle-orm";
import { companies, type Company, type TenantMembership, type User } from "@db/schema";
import { verifySecret } from "./password";
import { getDb, mockDbInstance } from "../queries/connection";
import { findMembership } from "../queries/memberships";
import { findUserByEmail } from "../queries/users";

const tenantMembershipRoles = ["owner", "admin", "staff"] as const;

export type TenantAdminMembershipRole = (typeof tenantMembershipRoles)[number];

export type TenantAdminPrincipal = {
  userId: number;
  companyId: number;
  tenantSlug: string;
  membershipRole: TenantAdminMembershipRole;
};

type TenantAdminTenant = Pick<Company, "id" | "slug" | "isActive">;
type TenantAdminUser = Pick<User, "id" | "email" | "passwordHash" | "isActive">;
type TenantAdminMembership = Pick<TenantMembership, "userId" | "companyId" | "role" | "isActive">;

export type TenantAdminAuthenticationDependencies = {
  findTenantByCanonicalSlug: (slug: string) => Promise<TenantAdminTenant | null | undefined>;
  findUserByEmail: (email: string) => Promise<TenantAdminUser | null | undefined>;
  findMembership: (userId: number, companyId: number) => Promise<TenantAdminMembership | null | undefined>;
  verifySecret: (password: string, passwordHash: string) => Promise<boolean>;
};

export class TenantAdminAuthenticationError extends Error {
  constructor(message = "Invalid tenant administrator credentials.") {
    super(message);
    this.name = "TenantAdminAuthenticationError";
  }
}

function normalizeEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new TenantAdminAuthenticationError();
  }
  return normalized;
}

function normalizeCanonicalSlug(tenantSlug: string) {
  const normalized = tenantSlug.trim().toLowerCase();
  if (
    tenantSlug !== normalized ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)
  ) {
    throw new TenantAdminAuthenticationError();
  }
  return normalized;
}

function isTenantMembershipRole(role: string): role is TenantAdminMembershipRole {
  return (tenantMembershipRoles as readonly string[]).includes(role);
}

function persistentDatabase() {
  const db = getDb();
  if (db === mockDbInstance) {
    throw new Error("Persistent database is unavailable for tenant administrator authentication.");
  }
  return db;
}

const productionDependencies: TenantAdminAuthenticationDependencies = {
  async findTenantByCanonicalSlug(slug) {
    const tenant = await persistentDatabase().query.companies.findFirst({
      where: eq(companies.slug, slug),
    });
    return tenant ?? null;
  },
  findUserByEmail,
  findMembership,
  verifySecret,
};

export async function authenticateTenantAdminWithDependencies(
  email: string,
  password: string,
  tenantSlug: string,
  dependencies: TenantAdminAuthenticationDependencies,
): Promise<TenantAdminPrincipal> {
  let normalizedEmail: string;
  let canonicalSlug: string;

  try {
    normalizedEmail = normalizeEmail(email);
    canonicalSlug = normalizeCanonicalSlug(tenantSlug);

    if (!password) {
      throw new TenantAdminAuthenticationError();
    }

    const tenant = await dependencies.findTenantByCanonicalSlug(canonicalSlug);
    if (!tenant || !tenant.isActive || tenant.slug !== canonicalSlug) {
      throw new TenantAdminAuthenticationError();
    }

    const user = await dependencies.findUserByEmail(normalizedEmail);
    if (!user || !user.isActive || !user.passwordHash) {
      throw new TenantAdminAuthenticationError();
    }

    if (!(await dependencies.verifySecret(password, user.passwordHash))) {
      throw new TenantAdminAuthenticationError();
    }

    const membership = await dependencies.findMembership(user.id, tenant.id);
    if (
      !membership ||
      !membership.isActive ||
      membership.userId !== user.id ||
      membership.companyId !== tenant.id ||
      !isTenantMembershipRole(membership.role)
    ) {
      throw new TenantAdminAuthenticationError();
    }

    return {
      userId: user.id,
      companyId: tenant.id,
      tenantSlug: canonicalSlug,
      membershipRole: membership.role,
    };
  } catch (error) {
    if (error instanceof TenantAdminAuthenticationError) {
      throw error;
    }
    throw new TenantAdminAuthenticationError("Tenant administrator authentication is unavailable.");
  }
}

/**
 * Read-only, fail-closed tenant administrator authentication.
 * This intentionally is not connected to the legacy login or session flow yet.
 */
export function authenticateTenantAdmin(
  email: string,
  password: string,
  tenantSlug: string,
): Promise<TenantAdminPrincipal> {
  return authenticateTenantAdminWithDependencies(email, password, tenantSlug, productionDependencies);
}
