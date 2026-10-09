import { getDb } from "./connection";
import { categories, gstConfigurations, products, type InsertCategory } from "@db/schema";
import { eq, asc, sql, and, ne } from "drizzle-orm";

export async function findAllCategories(options?: { includeInactive?: boolean }) {
  return getDb().query.categories.findMany({
    where: options?.includeInactive ? undefined : eq(categories.isActive, true),
    orderBy: asc(categories.sortOrder),
  });
}

export async function findCategoryBySlug(slug: string) {
  const result = await getDb().query.categories.findFirst({
    where: eq(categories.slug, slug),
  });
  return result ?? undefined;
}

export async function findCategoryById(id: number) {
  const result = await getDb().query.categories.findFirst({
    where: eq(categories.id, id),
  });
  return result ?? undefined;
}

export async function createCategory(data: InsertCategory) {
  const result = await getDb()
    .insert(categories)
    .values(data)
    .returning({ id: categories.id });
  return result[0].id;
}

export async function updateCategory(id: number, data: Partial<InsertCategory>) {
  await getDb()
    .update(categories)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(categories.id, id));
}

export async function deleteCategory(id: number) {
  const db = getDb();

  // Product safety: if any products belong to this category, safely reassign them
  // to another active category so existing products and inventory are preserved
  try {
    const assignedProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.categoryId, id));

    if (assignedProducts && assignedProducts.length > 0) {
      const fallbackCategories = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(ne(categories.id, id), eq(categories.isActive, true)))
        .limit(1);

      if (fallbackCategories && fallbackCategories.length > 0) {
        await db
          .update(products)
          .set({ categoryId: fallbackCategories[0].id })
          .where(eq(products.categoryId, id));
      }
    }
  } catch (err: any) {
    console.warn("[deleteCategory] Product category reassign warning:", err?.message);
  }

  // Clear parentId for any subcategories referencing this category
  try {
    await db
      .update(categories)
      .set({ parentId: null })
      .where(eq(categories.parentId, id));
  } catch (err: any) {
    console.warn("[deleteCategory] Subcategory parentId warning:", err?.message);
  }

  // Remove any GST configuration referencing this category
  try {
    await db
      .delete(gstConfigurations)
      .where(eq(gstConfigurations.categoryId, id));
  } catch (err: any) {
    console.warn("[deleteCategory] GST config warning:", err?.message);
  }

  // Actually delete the category row from the categories table in the database
  await db
    .delete(categories)
    .where(eq(categories.id, id));
}

export async function countCategories() {
  const result = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(categories)
    .where(eq(categories.isActive, true));
  return result[0]?.count ?? 0;
}

export async function findCategoriesWithProductCount() {
  const db = getDb();
  const allCategories = await db.query.categories.findMany({
    where: eq(categories.isActive, true),
    orderBy: asc(categories.sortOrder),
    with: {
      products: {
        where: eq(categories.id, categories.id),
      },
    },
  });
  return allCategories.map((cat) => ({
    ...cat,
    productCount: cat.products?.length ?? 0,
  }));
}
