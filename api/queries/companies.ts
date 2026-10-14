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

export type PublicStorefrontTenant = {
  id: number;
  name: string;
  slug: string;
  displayLabel: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  minimumOrderAmount: string | null;
  isVerified: boolean;
  isActive: boolean;
};

export type PublicStorefrontResponse =
  | {
      status: "active";
      tenant: PublicStorefrontTenant;
    }
  | {
      status: "suspended";
      tenant: Pick<
        PublicStorefrontTenant,
        "id" | "name" | "slug" | "displayLabel" | "description" | "logo" | "isActive"
      >;
      message: string;
    }
  | {
      status: "not_found";
      tenant: null;
      message: string;
    };

function indexToAlphabeticalLabelLocal(index: number): string {
  if (index < 0) return "Website A";
  let label = "";
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Website ${label}`;
}

export async function resolvePublicStorefront(identifier?: {
  slug?: string;
  id?: number;
}): Promise<PublicStorefrontResponse> {
  await ensureDefaultBusiness();
  const db = getDb();

  const allCompanies: Company[] = await db.query.companies.findMany();

  // Stable chronological sorting: earliest company is Website A
  const chronological = [...allCompanies].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
    if (timeA !== timeB) return timeA - timeB;
    return a.id - b.id;
  });

  const labelMap = new Map<number, string>();
  chronological.forEach((c, idx) => {
    labelMap.set(c.id, indexToAlphabeticalLabelLocal(idx));
  });

  let target: Company | undefined;

  const rawSlug = identifier?.slug?.trim();
  const targetId = identifier?.id;

  if (!rawSlug && !targetId) {
    // Default route `/`: resolve Website A using its actual database record
    target = chronological[0];
  } else if (targetId) {
    target = allCompanies.find((c) => c.id === targetId);
  } else if (rawSlug) {
    const lower = rawSlug.toLowerCase();
    // 1. Direct slug match
    target = allCompanies.find((c) => c.slug.toLowerCase() === lower);

    // 2. Stable display label match (e.g. "website-a", "website-b", "website a", "website b")
    if (!target) {
      target = allCompanies.find((c) => {
        const label = labelMap.get(c.id)?.toLowerCase();
        return label === lower || label?.replace(/\s+/g, "-") === lower;
      });
    }

    // 3. Numeric ID match if slug is e.g. "1" or "2"
    if (!target && /^\d+$/.test(rawSlug)) {
      const num = Number(rawSlug);
      target = allCompanies.find((c) => c.id === num);
    }
  }

  if (!target) {
    return {
      status: "not_found",
      tenant: null,
      message: "Boutique storefront not found.",
    };
  }

  const displayLabel = labelMap.get(target.id) || "Website";

  if (!target.isActive) {
    return {
      status: "suspended",
      tenant: {
        id: target.id,
        name: target.name,
        slug: target.slug,
        displayLabel,
        description: target.description,
        logo: target.logo,
        isActive: false,
      },
      message: "This boutique storefront is currently unavailable or suspended.",
    };
  }

  return {
    status: "active",
    tenant: {
      id: target.id,
      name: target.name,
      slug: target.slug,
      displayLabel,
      description: target.description,
      logo: target.logo,
      website: target.website,
      email: target.email,
      phone: target.phone,
      addressLine1: target.addressLine1,
      city: target.city,
      state: target.state,
      postalCode: target.postalCode,
      country: target.country,
      minimumOrderAmount: target.minimumOrderAmount,
      isVerified: Boolean(target.isVerified),
      isActive: true,
    },
  };
}
