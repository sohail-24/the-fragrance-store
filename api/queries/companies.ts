import { getDb } from "./connection";
import { companies, type Company } from "@db/schema";
import { eq, like, and, or } from "drizzle-orm";

export const DEFAULT_BUSINESS_NAME = "The Fragrance Store — House of Brands";
export const DEFAULT_BUSINESS_SLUG = "the-fragrance-store";
export const DEFAULT_BUSINESS_TAGLINE = "House of Brands — Luxury & Niche Fragrances";

let cachedDefaultBusiness: Company | null = null;

export async function ensureDefaultBusiness(): Promise<Company> {
  const db = getDb();

  try {
    // 1. Check if default company already exists by slug or name, or legacy placeholders
    let defaultCompany = await db.query.companies.findFirst({
      where: or(
        eq(companies.slug, DEFAULT_BUSINESS_SLUG),
        eq(companies.slug, "texs-chicken-and-burgers"),
        eq(companies.slug, "texs-chicken-burgers"),
        eq(companies.slug, "amfruits-warehouse"),
        eq(companies.name, DEFAULT_BUSINESS_NAME),
        eq(companies.id, 1)
      ),
    });

    if (defaultCompany) {
      if (
        defaultCompany.name !== DEFAULT_BUSINESS_NAME ||
        defaultCompany.description !== DEFAULT_BUSINESS_TAGLINE ||
        defaultCompany.slug !== DEFAULT_BUSINESS_SLUG ||
        !defaultCompany.isActive
      ) {
        await db
          .update(companies)
          .set({
            name: DEFAULT_BUSINESS_NAME,
            slug: DEFAULT_BUSINESS_SLUG,
            description: DEFAULT_BUSINESS_TAGLINE,
            type: "supplier",
            logo: "/fragrance/brand-mark.svg",
            email: "contact@thefragrancestore.com",
            phone: "+91 98765 43210",
            addressLine1: "Flagship Boutique",
            city: "Mumbai",
            state: "Maharashtra",
            country: "India",
            isActive: true,
            isVerified: true,
            updatedAt: new Date(),
          })
          .where(eq(companies.id, defaultCompany.id));

        defaultCompany = await db.query.companies.findFirst({
          where: eq(companies.id, defaultCompany.id),
        });
      }
      cachedDefaultBusiness = defaultCompany ?? null;
      if (defaultCompany) return defaultCompany;
    }

    // 2. Otherwise insert fresh default business
    const [created] = await db
      .insert(companies)
      .values({
        name: DEFAULT_BUSINESS_NAME,
        slug: DEFAULT_BUSINESS_SLUG,
        type: "supplier",
        description: DEFAULT_BUSINESS_TAGLINE,
        logo: "/fragrance/brand-mark.svg",
        email: "contact@thefragrancestore.com",
        phone: "+91 98765 43210",
        addressLine1: "Flagship Boutique",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        isVerified: true,
        isActive: true,
      })
      .returning();

    cachedDefaultBusiness = created;
    return created;
  } catch (error) {
    console.warn("[CompanyQuery] ensureDefaultBusiness fallback:", error);
    const fallback: Company = {
      id: 1,
      name: DEFAULT_BUSINESS_NAME,
      slug: DEFAULT_BUSINESS_SLUG,
      type: "supplier",
      description: DEFAULT_BUSINESS_TAGLINE,
      logo: "/fragrance/brand-mark.svg",
      website: "https://thefragrancestore.com",
      email: "contact@thefragrancestore.com",
      phone: "+91 98765 43210",
      addressLine1: "Flagship Boutique",
      addressLine2: null,
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400001",
      country: "India",
      taxId: null,
      businessLicense: null,
      isVerified: true,
      isActive: true,
      minimumOrderAmount: "0.00",
      paymentTerms: "net_30",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    cachedDefaultBusiness = fallback;
    return fallback;
  }
}

export async function findDefaultBusiness(): Promise<Company> {
  if (cachedDefaultBusiness) return cachedDefaultBusiness;
  return ensureDefaultBusiness();
}

export async function findAllCompanies() {
  await ensureDefaultBusiness();
  return getDb().query.companies.findMany({
    where: eq(companies.isActive, true),
    orderBy: companies.name,
  });
}

export async function findCompaniesByType(type: string) {
  await ensureDefaultBusiness();
  return getDb().query.companies.findMany({
    where: and(eq(companies.type, type as any), eq(companies.isActive, true)),
    orderBy: companies.name,
  });
}

export async function findCompanyById(id: number) {
  const db = getDb();
  let company = await db.query.companies.findFirst({
    where: eq(companies.id, id),
  });
  if (!company && (id === 1 || id === cachedDefaultBusiness?.id)) {
    company = await ensureDefaultBusiness();
  }
  return company;
}

export async function findCompanyBySlug(slug: string) {
  const db = getDb();
  let company = await db.query.companies.findFirst({
    where: eq(companies.slug, slug),
  });

  if (
    !company &&
    (slug === DEFAULT_BUSINESS_SLUG ||
      slug === "texs-chicken-burgers" ||
      slug === "amfruits-warehouse")
  ) {
    company = await ensureDefaultBusiness();
  }

  return company;
}

export async function searchCompanies(query: string) {
  await ensureDefaultBusiness();
  const pattern = `%${query}%`;
  return getDb()
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.isActive, true),
        or(like(companies.name, pattern), like(companies.city, pattern))
      )
    )
    .orderBy(companies.name);
}
