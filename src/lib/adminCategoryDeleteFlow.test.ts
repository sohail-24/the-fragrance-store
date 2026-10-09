import { describe, expect, it } from "vitest";
import { categoryRouter } from "../../api/categoryRouter";
import { BUSINESS_OWNER_EMAIL } from "@contracts/roles";
import { findUserByEmail } from "../../api/queries/users";
import { findCategoryById } from "../../api/queries/categories";
import { countProducts } from "../../api/queries/products";

describe("Admin Category Delete Flow", () => {
  it(
    "permanently deletes a category from the database without deleting other categories or products",
    async () => {
      const ownerUser = await findUserByEmail(BUSINESS_OWNER_EMAIL);
      expect(ownerUser).toBeDefined();

      const adminCaller = categoryRouter.createCaller({
        user: ownerUser!,
        req: new Request("http://localhost:3000/api/trpc"),
        resHeaders: new Headers(),
      } as any);

      const publicCaller = categoryRouter.createCaller({
        req: new Request("http://localhost:3000/api/trpc"),
        resHeaders: new Headers(),
      } as any);

      // Record product count before test
      const productCountBefore = await countProducts();

      // 1. Create a test category
      const testName = `Delete Test Category ${Date.now()}`;
      const createRes = await adminCaller.create({
        name: testName,
        description: "Temporary category to verify deletion flow",
        isActive: true,
        sortOrder: 99,
      });
      expect(createRes.id).toBeGreaterThan(0);
      const testCatId = createRes.id;

      // 2. Verify category exists in DB and in both Admin and Customer list
      const dbCategory = await findCategoryById(testCatId);
      expect(dbCategory).toBeDefined();
      expect(dbCategory?.name).toBe(testName);

      const adminListBefore = await adminCaller.list({ includeInactive: true });
      expect(adminListBefore.some((c: any) => c.id === testCatId)).toBe(true);

      const customerListBefore = await publicCaller.list();
      expect(customerListBefore.some((c: any) => c.id === testCatId)).toBe(true);

      // 3. Admin deletes the category
      const deleteRes = await adminCaller.delete({ id: testCatId });
      expect(deleteRes).toEqual({ success: true });

      // 4. Verify category is PERMANENTLY deleted from DB (not just soft-deleted/hidden)
      const dbCategoryAfter = await findCategoryById(testCatId);
      expect(dbCategoryAfter).toBeUndefined();

      // 5. Verify it disappears from Admin list (even with includeInactive: true)
      const adminListAfter = await adminCaller.list({ includeInactive: true });
      expect(adminListAfter.some((c: any) => c.id === testCatId)).toBe(false);

      // 6. Verify it disappears from customer /products list
      const customerListAfter = await publicCaller.list();
      expect(customerListAfter.some((c: any) => c.id === testCatId)).toBe(false);

      // 7. Verify products were NOT deleted
      const productCountAfter = await countProducts();
      expect(productCountAfter).toBe(productCountBefore);
    },
    30000
  );
});
