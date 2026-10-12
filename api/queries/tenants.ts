import { getDb } from "./connection";
import { companies, products, orders, users, tenantMemberships, type Company } from "@db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { ensureDefaultBusiness } from "./companies";
import { upsertTenantMembership } from "./memberships";

export type TenantOwner = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
};

export type TenantSummary = Company & {
  productCount: number;
  orderCount: number;
  totalRevenue: string;
  owner: TenantOwner | null;
};

export type PlatformSaaSStats = {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  verifiedTenants: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: string;
  currency: string;
  totalOwners: number;
  tenants: TenantSummary[];
};

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export async function getPlatformSaaSStats(): Promise<PlatformSaaSStats> {
  await ensureDefaultBusiness();
  const db = getDb();

  try {
    const allCompanies: Company[] = await db.query.companies.findMany({
      orderBy: [desc(companies.createdAt)],
    });

    const allUsers = await db.query.users.findMany();
    const adminOwners = allUsers.filter((u) => u.role === "admin");

    let totalProductsCount = 0;
    let totalOrdersCount = 0;
    let totalRevenueSum = 0;

    const tenantsWithMetrics: TenantSummary[] = await Promise.all(
      allCompanies.map(async (company) => {
        let productCount = 0;
        let orderCount = 0;
        let revenue = 0;
        let owner: TenantOwner | null = null;

        try {
          const productRes = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(products)
            .where(eq(products.supplierId, company.id));
          productCount = Number(productRes[0]?.count ?? 0);
        } catch {
          // fallback
        }

        try {
          const orderRes = await db
            .select({
              count: sql<number>`count(*)::int`,
              sum: sql<string>`coalesce(sum(${orders.totalAmount}::numeric), 0)::text`,
            })
            .from(orders)
            .where(eq(orders.supplierId, company.id));
          orderCount = Number(orderRes[0]?.count ?? 0);
          revenue = parseFloat(orderRes[0]?.sum ?? "0") || 0;
        } catch {
          // fallback
        }

        // Resolve Assigned Owner
        try {
          const membership = await db.query.tenantMemberships.findFirst({
            where: and(
              eq(tenantMemberships.companyId, company.id),
              eq(tenantMemberships.role, "owner"),
              eq(tenantMemberships.isActive, true)
            ),
          });
          if (membership) {
            const memberUser = allUsers.find((u) => u.id === membership.userId);
            if (memberUser) {
              owner = {
                id: memberUser.id,
                name: memberUser.name,
                email: memberUser.email,
                phone: memberUser.phone,
                role: "owner",
              };
            }
          }
          if (!owner) {
            const directAdmin = allUsers.find(
              (u) => u.companyId === company.id && u.role === "admin"
            );
            if (directAdmin) {
              owner = {
                id: directAdmin.id,
                name: directAdmin.name,
                email: directAdmin.email,
                phone: directAdmin.phone,
                role: "admin",
              };
            }
          }
        } catch {
          // fallback
        }

        totalProductsCount += productCount;
        totalOrdersCount += orderCount;
        totalRevenueSum += revenue;

        return {
          ...company,
          productCount,
          orderCount,
          totalRevenue: revenue.toFixed(2),
          owner,
        };
      })
    );

    const activeTenants = allCompanies.filter((c) => c.isActive).length;
    const suspendedTenants = allCompanies.filter((c) => !c.isActive).length;

    return {
      totalTenants: allCompanies.length,
      activeTenants,
      suspendedTenants,
      verifiedTenants: allCompanies.filter((c) => c.isVerified).length,
      totalProducts: totalProductsCount,
      totalOrders: totalOrdersCount,
      totalRevenue: totalRevenueSum.toFixed(2),
      currency: "INR",
      totalOwners: adminOwners.length,
      tenants: tenantsWithMetrics,
    };
  } catch (error) {
    console.warn("[TenantsQuery] getPlatformSaaSStats fallback:", error);
    const defaultCo = await ensureDefaultBusiness();
    return {
      totalTenants: 1,
      activeTenants: 1,
      suspendedTenants: 0,
      verifiedTenants: 1,
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: "0.00",
      currency: "INR",
      totalOwners: 1,
      tenants: [
        {
          ...defaultCo,
          productCount: 0,
          orderCount: 0,
          totalRevenue: "0.00",
          owner: null,
        },
      ],
    };
  }
}

export async function assignTenantOwner(companyId: number, userId: number): Promise<boolean> {
  const db = getDb();
  await upsertTenantMembership({
    userId,
    companyId,
    role: "owner",
    isActive: true,
  });
  await db.update(users).set({ companyId }).where(eq(users.id, userId));
  return true;
}

export async function listTenants(filter?: {
  search?: string;
  status?: "all" | "active" | "inactive";
  type?: string;
}): Promise<TenantSummary[]> {
  const stats = await getPlatformSaaSStats();
  let list = stats.tenants;

  if (filter?.status && filter.status !== "all") {
    const isAct = filter.status === "active";
    list = list.filter((t) => t.isActive === isAct);
  }

  if (filter?.type) {
    list = list.filter((t) => t.type === filter.type);
  }

  if (filter?.search) {
    const q = filter.search.toLowerCase().trim();
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }

  return list;
}

export async function getTenantById(id: number): Promise<TenantSummary | null> {
  const stats = await getPlatformSaaSStats();
  const found = stats.tenants.find((t) => t.id === id);
  return found ?? null;
}

export async function createTenant(input: {
  name: string;
  slug?: string;
  type?: "supplier" | "buyer" | "both";
  description?: string;
  logo?: string;
  website?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  minimumOrderAmount?: string;
}): Promise<Company> {
  const db = getDb();
  let finalSlug = input.slug ? slugify(input.slug) : slugify(input.name);
  if (!finalSlug) finalSlug = `tenant-${Date.now()}`;

  // Check collision and suffix if needed
  let uniqueSlug = finalSlug;
  let counter = 1;
  while (
    await db.query.companies.findFirst({
      where: eq(companies.slug, uniqueSlug),
    })
  ) {
    uniqueSlug = `${finalSlug}-${counter++}`;
  }

  const [created] = await db
    .insert(companies)
    .values({
      name: input.name.trim(),
      slug: uniqueSlug,
      type: input.type ?? "supplier",
      description: input.description?.trim() ?? "A brand in The Fragrance Store House of Brands",
      logo: input.logo?.trim() ?? "/fragrance/brand-mark.svg",
      website: input.website?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      addressLine1: input.addressLine1?.trim() || null,
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
      country: input.country?.trim() || "India",
      minimumOrderAmount: input.minimumOrderAmount || "0.00",
      isVerified: true,
      isActive: true,
    })
    .returning();

  return created;
}

export async function updateTenant(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    logo: string;
    website: string;
    email: string;
    phone: string;
    addressLine1: string;
    city: string;
    state: string;
    country: string;
    isActive: boolean;
    isVerified: boolean;
    minimumOrderAmount: string;
  }>
): Promise<Company | null> {
  const db = getDb();

  const [updated] = await db
    .update(companies)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, id))
    .returning();

  return updated ?? null;
}

export async function setTenantStatus(
  id: number,
  status: { isActive?: boolean; isVerified?: boolean }
): Promise<Company | null> {
  return updateTenant(id, status);
}

