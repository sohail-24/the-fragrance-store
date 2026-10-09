import { describe, expect, it } from "vitest";
import { findAllInventory } from "../../api/queries/inventory";
import { findBuyerProducts, reorderProduct, findAllProducts } from "../../api/queries/products";

describe("Admin Product Ordering in Inventory and Buyer Catalog", () => {
  it(
    "persists product reordering and reflects in both inventory and buyer catalog",
    async () => {
    // 1. Fetch current inventory
    const initialInventory = await findAllInventory();
    if (initialInventory.length < 2) return;

    // Check if the 4 specific products exist
    const corn = initialInventory.find((i) => i.productName === "Fire Roasted Corn");
    const fries = initialInventory.find((i) => i.productName === "French Fries");
    const mac = initialInventory.find((i) => i.productName === "Mac N'Cheese");
    const potato = initialInventory.find((i) => i.productName === "Mashed Potato");

    if (corn && fries && mac && potato) {
      // 2. Initial state: Corn, Fries, Mac, Potato
      const currentInventory = await findAllInventory();
      const macIndex = currentInventory.findIndex((i) => i.productId === mac.productId);
      const friesIndex = currentInventory.findIndex((i) => i.productId === fries.productId);

      if (macIndex < friesIndex) {
        await reorderProduct(mac.productId, "down");
      }

      const baselineInventory = await findAllInventory();
      const baselineNames = baselineInventory.map((i) => i.productName);
      const bCornIdx = baselineNames.indexOf("Fire Roasted Corn");
      const bFriesIdx = baselineNames.indexOf("French Fries");
      const bMacIdx = baselineNames.indexOf("Mac N'Cheese");
      const bPotatoIdx = baselineNames.indexOf("Mashed Potato");

      expect(bCornIdx).toBeLessThan(bFriesIdx);
      expect(bFriesIdx).toBeLessThan(bMacIdx);
      expect(bMacIdx).toBeLessThan(bPotatoIdx);

      // 3. Move Mac N'Cheese UP (↑)
      await reorderProduct(mac.productId, "up");

      const afterUpInventory = await findAllInventory();
      const upNames = afterUpInventory.map((i) => i.productName);
      const upCornIdx = upNames.indexOf("Fire Roasted Corn");
      const upMacIdx = upNames.indexOf("Mac N'Cheese");
      const upFriesIdx = upNames.indexOf("French Fries");
      const upPotatoIdx = upNames.indexOf("Mashed Potato");

      expect(upCornIdx).toBeLessThan(upMacIdx);
      expect(upMacIdx).toBeLessThan(upFriesIdx);
      expect(upFriesIdx).toBeLessThan(upPotatoIdx);

      // 4. Verify buyer catalog reflects the EXACT same order
      const buyerProductsAfterUp = await findBuyerProducts();
      const buyerNamesUp = buyerProductsAfterUp.map((p) => p.name);
      const bUpCornIdx = buyerNamesUp.indexOf("Fire Roasted Corn");
      const bUpMacIdx = buyerNamesUp.indexOf("Mac N'Cheese");
      const bUpFriesIdx = buyerNamesUp.indexOf("French Fries");
      const bUpPotatoIdx = buyerNamesUp.indexOf("Mashed Potato");

      expect(bUpCornIdx).toBeLessThan(bUpMacIdx);
      expect(bUpMacIdx).toBeLessThan(bUpFriesIdx);
      expect(bUpFriesIdx).toBeLessThan(bUpPotatoIdx);

      // 5. Move Mac N'Cheese DOWN (↓)
      await reorderProduct(mac.productId, "down");

      const afterDownInventory = await findAllInventory();
      const downNames = afterDownInventory.map((i) => i.productName);
      const downCornIdx = downNames.indexOf("Fire Roasted Corn");
      const downFriesIdx = downNames.indexOf("French Fries");
      const downMacIdx = downNames.indexOf("Mac N'Cheese");
      const downPotatoIdx = downNames.indexOf("Mashed Potato");

      expect(downCornIdx).toBeLessThan(downFriesIdx);
      expect(downFriesIdx).toBeLessThan(downMacIdx);
      expect(downMacIdx).toBeLessThan(downPotatoIdx);

      // 6. Verify buyer catalog also reflects this restored order
      const buyerProductsAfterDown = await findBuyerProducts();
      const buyerNamesDown = buyerProductsAfterDown.map((p) => p.name);
      const bDownCornIdx = buyerNamesDown.indexOf("Fire Roasted Corn");
      const bDownFriesIdx = buyerNamesDown.indexOf("French Fries");
      const bDownMacIdx = buyerNamesDown.indexOf("Mac N'Cheese");
      const bDownPotatoIdx = buyerNamesDown.indexOf("Mashed Potato");

      expect(bDownCornIdx).toBeLessThan(bDownFriesIdx);
      expect(bDownFriesIdx).toBeLessThan(bDownMacIdx);
      expect(bDownMacIdx).toBeLessThan(bDownPotatoIdx);
    } else {
      // General 2-item reorder test
      const item0 = initialInventory[0];
      const item1 = initialInventory[1];

      await reorderProduct(item1.productId, "up");
      const afterUp = await findAllInventory();
      expect(afterUp[0].productId).toBe(item1.productId);

      const buyerAfterUp = await findBuyerProducts();
      expect(buyerAfterUp[0].id).toBe(item1.productId);

      await reorderProduct(item1.productId, "down");
      const afterDown = await findAllInventory();
      expect(afterDown[0].productId).toBe(item0.productId);

      const buyerAfterDown = await findBuyerProducts();
      expect(buyerAfterDown[0].id).toBe(item0.productId);
    }
  }, 30000);
});
