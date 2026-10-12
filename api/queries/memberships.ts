import { getDb } from "./connection";
import { tenantMemberships, type TenantMembership, type InsertTenantMembership } from "@db/schema";
import { eq, and } from "drizzle-orm";

export async function findMembershipsByUserId(userId: number): Promise<TenantMembership[]> {
  const db = getDb();
  return db.query.tenantMemberships.findMany({
    where: and(eq(tenantMemberships.userId, userId), eq(tenantMemberships.isActive, true)),
  });
}

export async function findMembershipsByCompanyId(companyId: number): Promise<TenantMembership[]> {
  const db = getDb();
  return db.query.tenantMemberships.findMany({
    where: and(eq(tenantMemberships.companyId, companyId), eq(tenantMemberships.isActive, true)),
  });
}

export async function findMembership(userId: number, companyId: number): Promise<TenantMembership | null> {
  const db = getDb();
  const membership = await db.query.tenantMemberships.findFirst({
    where: and(
      eq(tenantMemberships.userId, userId),
      eq(tenantMemberships.companyId, companyId),
      eq(tenantMemberships.isActive, true)
    ),
  });
  return membership ?? null;
}

export async function upsertTenantMembership(data: {
  userId: number;
  companyId: number;
  role?: "owner" | "admin" | "staff";
  isActive?: boolean;
}): Promise<TenantMembership> {
  const db = getDb();
  const [result] = await db
    .insert(tenantMemberships)
    .values({
      userId: data.userId,
      companyId: data.companyId,
      role: data.role ?? "owner",
      isActive: data.isActive ?? true,
    })
    .onConflictDoUpdate({
      target: [tenantMemberships.userId, tenantMemberships.companyId],
      set: {
        role: data.role ?? "owner",
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}
