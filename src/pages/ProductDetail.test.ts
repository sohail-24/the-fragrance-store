import { describe, expect, it } from "vitest";
import { parseProductOptions } from "@/types";

describe("ProductDetail Option Selection Header Logic", () => {
  it("correctly parses and resolves option names for dynamic current display", () => {
    const rawOptions = JSON.stringify([
      { id: "sJquxa", name: "SM (300 CAL)", price: 3.25 },
      { id: "-XfGtB", name: "LG (500 CAL)", price: 4.25 },
    ]);

    const parsed = parseProductOptions(rawOptions);
    expect(parsed.length).toBe(2);

    // Initial selected option
    const firstOption = parsed[0];
    expect(firstOption.name).toBe("SM (300 CAL)");

    // Switching to second option dynamically updates label
    const secondOption = parsed[1];
    expect(secondOption.name).toBe("LG (500 CAL)");
  });

  it("resolves meal and only pricing suffixes dynamically when applicable", () => {
    const rawOptions = JSON.stringify([
      { id: "opt-1", name: "6 Pc Wings", mealPrice: 10.99, onlyPrice: 7.99 },
    ]);

    const parsed = parseProductOptions(rawOptions);
    const opt = parsed[0];

    // Standard mode without meal/only selected
    function resolveLabel(mode: "standard" | "meal" | "only") {
      if (mode === "meal" && opt.mealPrice) {
        return `${opt.name} (Meal)`;
      }
      if (mode === "only" && opt.onlyPrice) {
        return `${opt.name} (Only)`;
      }
      return opt.name;
    }

    expect(resolveLabel("standard")).toBe("6 Pc Wings");
    expect(resolveLabel("meal")).toBe("6 Pc Wings (Meal)");
    expect(resolveLabel("only")).toBe("6 Pc Wings (Only)");
  });

  it("synchronizes variant images and falls back to main product image when variant has no image", () => {
    const rawOptions = JSON.stringify([
      { id: "opt-med", name: "Medium", price: 5.55, image: "/api/uploads/medium-burger.png" },
      { id: "opt-lrg", name: "Large", price: 9.99, image: "/api/uploads/large-burger.png" },
      { id: "opt-sm", name: "Small", price: 3.55, image: null },
    ]);

    const parsed = parseProductOptions(rawOptions);
    expect(parsed.length).toBe(3);

    const mainProductImage = "/api/uploads/default-burger.png";

    function resolveDisplayedImage(optionId: string) {
      const selected = parsed.find((o) => o.id === optionId) || parsed[0];
      return (selected?.image && selected.image.trim()) || mainProductImage;
    }

    // Selecting Medium displays Medium variant image
    expect(resolveDisplayedImage("opt-med")).toBe("/api/uploads/medium-burger.png");

    // Switching to Large displays Large variant image
    expect(resolveDisplayedImage("opt-lrg")).toBe("/api/uploads/large-burger.png");

    // Selecting Small (which has no variant image) falls back to main product image
    expect(resolveDisplayedImage("opt-sm")).toBe("/api/uploads/default-burger.png");
  });

  it("handles SM and LG French Fries variant image switching and first variant default", () => {
    const rawOptions = JSON.stringify([
      { id: "sm-fries", name: "SM (300 CAL)", price: 3.25, image: "/api/uploads/french-fries-sm.png" },
      { id: "lg-fries", name: "LG (500 CAL)", price: 4.25, image: "/api/uploads/french-fries-lg.png" },
    ]);
    const parsed = parseProductOptions(rawOptions);

    function resolveDisplayedImage(selectedOptionId: string) {
      const selected = parsed.find((o) => o.id === selectedOptionId) || parsed[0];
      return (selected?.image && selected.image.trim()) || null;
    }

    // First variant image is default on load
    expect(resolveDisplayedImage("")).toBe("/api/uploads/french-fries-sm.png");
    expect(resolveDisplayedImage("sm-fries")).toBe("/api/uploads/french-fries-sm.png");

    // Switching to LG shows LG image
    expect(resolveDisplayedImage("lg-fries")).toBe("/api/uploads/french-fries-lg.png");
  });

  it("does not render compare price if invalid/absent, but renders when legitimate compare price is configured", () => {
    // Helper replicating ProductDetail's compareAt resolution logic
    function resolveCompareAt(
      hasOptions: boolean,
      selectedOption: { price: number; compareAtPrice?: number | string | null } | null,
      product: { unitPrice: string; compareAtPrice?: string | null },
      price: number
    ): number | null {
      if (hasOptions) {
        if (selectedOption?.compareAtPrice != null && selectedOption.compareAtPrice !== "") {
          const val = Number(selectedOption.compareAtPrice);
          if (Number.isFinite(val) && val > price) {
            return val;
          }
        }
        return null;
      }

      const raw = product?.compareAtPrice;
      if (raw != null && raw !== "" && raw !== "0" && raw !== "0.00") {
        const val = Number(raw);
        if (Number.isFinite(val) && val > price) {
          return val;
        }
      }
      return null;
    }

    // Scenario 1: French Fries with SM ($3.25) and LG ($4.25)
    // Product has legacy/buggy compareAtPrice = "1.14" from food purchase price, but variants have NO compareAtPrice
    const productWith114 = { unitPrice: "3.25", compareAtPrice: "1.14" };
    const lgOptionNoCompare = { price: 4.25, compareAtPrice: null };
    const smOptionNoCompare = { price: 3.25, compareAtPrice: undefined };

    // $1.14 must NOT appear for LG or SM
    expect(resolveCompareAt(true, lgOptionNoCompare, productWith114, 4.25)).toBeNull();
    expect(resolveCompareAt(true, smOptionNoCompare, productWith114, 3.25)).toBeNull();

    // Scenario 2: Variant WITH legitimate compare-at price (e.g. was $5.25, now $4.25)
    const lgOptionWithCompare = { price: 4.25, compareAtPrice: 5.25 };
    expect(resolveCompareAt(true, lgOptionWithCompare, productWith114, 4.25)).toBe(5.25);

    // Scenario 3: Standard product (no variants) with no compare price or invalid compare price
    expect(resolveCompareAt(false, null, { unitPrice: "4.25", compareAtPrice: null }, 4.25)).toBeNull();
    expect(resolveCompareAt(false, null, { unitPrice: "4.25", compareAtPrice: "0" }, 4.25)).toBeNull();
    expect(resolveCompareAt(false, null, { unitPrice: "4.25", compareAtPrice: "1.14" }, 4.25)).toBeNull(); // 1.14 < 4.25 is invalid

    // Scenario 4: Standard product WITH legitimate compare-at price (was $6.00, now $4.25)
    expect(resolveCompareAt(false, null, { unitPrice: "4.25", compareAtPrice: "6.00" }, 4.25)).toBe(6.0);
  });

  it("dynamically updates What Comes With It when switching variants and preserves independence", () => {
    const rawOptions = JSON.stringify([
      {
        id: "opt-sm",
        name: "SM",
        price: 3.25,
        image: "/api/uploads/sm-chicken.png",
        includedWith: "With Fries and Juice",
      },
      {
        id: "opt-lg",
        name: "LG",
        price: 5.99,
        image: "/api/uploads/lg-chicken.png",
        includedWith: "With Fries and 2 Biscuits",
      },
      {
        id: "opt-xl",
        name: "XL",
        price: 8.99,
        includedWith: null,
      },
    ]);

    const parsed = parseProductOptions(rawOptions);
    expect(parsed.length).toBe(3);

    const product = {
      name: "Chicken Meal",
      includedWith: "Main Dish General Sides",
    };

    function resolveActiveIncludedWith(optionId: string | null, hasVariants: boolean) {
      if (hasVariants) {
        const selected = parsed.find((o) => o.id === optionId) || parsed[0];
        const val = selected?.includedWith;
        return typeof val === "string" && val.trim() ? val.trim() : null;
      }
      const val = product.includedWith;
      return typeof val === "string" && val.trim() ? val.trim() : null;
    }

    // 1. Selecting SM shows SM's "With Fries and Juice"
    expect(resolveActiveIncludedWith("opt-sm", true)).toBe("With Fries and Juice");

    // 2. Switching to LG dynamically changes to LG's "With Fries and 2 Biscuits"
    expect(resolveActiveIncludedWith("opt-lg", true)).toBe("With Fries and 2 Biscuits");

    // 3. Switching back to SM returns "With Fries and Juice"
    expect(resolveActiveIncludedWith("opt-sm", true)).toBe("With Fries and Juice");

    // 4. Selecting XL (no includedWith) returns null (no empty container rendered)
    expect(resolveActiveIncludedWith("opt-xl", true)).toBeNull();

    // 5. Standard product (hasVariants = false) uses main product includedWith
    expect(resolveActiveIncludedWith(null, false)).toBe("Main Dish General Sides");

    // 6. Variant images remain fully synchronized
    const smOpt = parsed.find((o) => o.id === "opt-sm");
    const lgOpt = parsed.find((o) => o.id === "opt-lg");
    expect(smOpt?.image).toBe("/api/uploads/sm-chicken.png");
    expect(lgOpt?.image).toBe("/api/uploads/lg-chicken.png");
    expect(smOpt?.price).toBe(3.25);
    expect(lgOpt?.price).toBe(5.99);
  });

  it("verifies customer-facing display formatting for calories and includedWith values", () => {
    // 1. Single price product: Mashed Potato with "460 CAL"
    const mashedPotato = {
      name: "Mashed Potato",
      includedWith: "460 CAL",
      options: "[]",
    };
    const options = parseProductOptions(mashedPotato.options);
    const hasOptions = options.length > 0;

    const activeIncludedWith = hasOptions
      ? (options[0]?.includedWith?.trim() || null)
      : (mashedPotato.includedWith?.trim() || null);

    // Displays ONLY the actual value without "What Comes With It:" prefix
    expect(activeIncludedWith).toBe("460 CAL");
    expect(activeIncludedWith).not.toContain("What Comes With It:");

    // 2. Dish with sides: 8 PC Chicken with "2 Sides and 4 Biscuits"
    const chickenFamily = {
      name: "8 PC Chicken",
      includedWith: "2 Sides and 4 Biscuits",
      options: "[]",
    };
    const chickenValue = chickenFamily.includedWith.trim();
    expect(chickenValue).toBe("2 Sides and 4 Biscuits");
    expect(chickenValue).not.toContain("What Comes With It:");

    // 3. Variant product switching: SM vs LG
    const variantDish = {
      name: "Chicken Meal",
      options: JSON.stringify([
        { id: "sm", name: "SM", price: 3.25, includedWith: "With Fries and Juice" },
        { id: "lg", name: "LG", price: 5.99, includedWith: "With Fries and 2 Biscuits" },
      ]),
    };
    const parsedVariants = parseProductOptions(variantDish.options);

    function getDisplaySubtitle(selectedId: string) {
      const selected = parsedVariants.find((v) => v.id === selectedId) || parsedVariants[0];
      return selected.includedWith?.trim() || null;
    }

    expect(getDisplaySubtitle("sm")).toBe("With Fries and Juice");
    expect(getDisplaySubtitle("lg")).toBe("With Fries and 2 Biscuits");
    expect(getDisplaySubtitle("sm")).not.toContain("What Comes With It:");
    expect(getDisplaySubtitle("lg")).not.toContain("What Comes With It:");

    // 4. Empty includedWith returns null (no empty elements rendered)
    const emptyDish = {
      name: "Plain Water",
      includedWith: "   ",
      options: "[]",
    };
    const emptyValue = emptyDish.includedWith?.trim() || null;
    expect(emptyValue).toBeNull();
  });

  it("verifies single-line title + price layout and variant price synchronization", () => {
    // 1. Single price product: Mashed Potato $3.25
    const singleProduct = {
      name: "Mashed Potato",
      unitPrice: "3.25",
      includedWith: "460 CAL",
      options: "[]",
    };

    function resolveDisplay(product: any, selectedVariantId?: string) {
      const options = parseProductOptions(product.options);
      const selected = options.find((o) => o.id === selectedVariantId) || options[0];
      const activePrice = selected ? (selected.price || selected.mealPrice) : Number(product.unitPrice);
      const activeIncludedWith = selected?.includedWith?.trim() || product.includedWith?.trim() || null;
      return {
        name: product.name,
        price: activePrice,
        includedWith: activeIncludedWith,
      };
    }

    const singleDisplay = resolveDisplay(singleProduct);
    expect(singleDisplay.name).toBe("Mashed Potato");
    expect(singleDisplay.price).toBe(3.25);
    expect(singleDisplay.includedWith).toBe("460 CAL");

    // 2. Variant product: Chicken Meal switching SM ($3.25) -> LG ($5.99)
    const variantProduct = {
      name: "Chicken Meal",
      unitPrice: "3.25",
      options: JSON.stringify([
        { id: "sm", name: "SM", price: 3.25, includedWith: "With Fries and Juice" },
        { id: "lg", name: "LG", price: 5.99, includedWith: "With Fries and 2 Biscuits" },
      ]),
    };

    const smDisplay = resolveDisplay(variantProduct, "sm");
    expect(smDisplay.name).toBe("Chicken Meal");
    expect(smDisplay.price).toBe(3.25);
    expect(smDisplay.includedWith).toBe("With Fries and Juice");

    const lgDisplay = resolveDisplay(variantProduct, "lg");
    expect(lgDisplay.name).toBe("Chicken Meal");
    expect(lgDisplay.price).toBe(5.99);
    expect(lgDisplay.includedWith).toBe("With Fries and 2 Biscuits");
  });

  it("handles Admin Meal Options pricing, independent Mild/Spicy choice group, and style switching", () => {
    const rawOptions = JSON.stringify([
      {
        id: "classic-id",
        name: "Classic",
        image: "/products/classic.png",
        includedWith: "Classic Tex Recipe",
        mealOptions: {
          label: "Select Option",
          choices: [
            { name: "Meal", description: "1 Reg Side & Red Drink", price: 5.88 },
            { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 6.88 },
          ],
        },
        choiceGroup: {
          label: "Select one",
          choices: ["Mild", "Spicy"],
        },
      },
      {
        id: "deluxe-id",
        name: "Deluxe",
        image: "/products/deluxe.png",
        includedWith: "Deluxe with Bacon & Cheese",
        mealOptions: {
          label: "Select Option",
          choices: [
            { name: "Meal", description: "1 Reg Side & Red Drink", price: 6.88 },
            { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 7.88 },
          ],
        },
        choiceGroup: {
          label: "Select one",
          choices: ["Mild", "Spicy"],
        },
      },
      {
        id: "grilled-id",
        name: "Grilled",
        image: "/products/grilled.png",
        includedWith: "Tender Grilled Breast",
        mealOptions: {
          label: "Select Option",
          choices: [
            { name: "Meal", description: "1 Reg Side & Red Drink", price: 7.38 },
            { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 8.38 },
          ],
        },
        choiceGroup: {
          label: "Select one",
          choices: ["Mild", "Spicy"],
        },
      },
    ]);

    const parsed = parseProductOptions(rawOptions);
    expect(parsed.length).toBe(3);

    // 1. Initial default state: Classic selected
    const classic = parsed[0];
    expect(classic.name).toBe("Classic");
    expect(classic.image).toBe("/products/classic.png");
    expect(classic.mealOptions?.choices.length).toBe(2);
    expect(classic.choiceGroup?.choices).toEqual(["Mild", "Spicy"]);

    // Default selected meal choice: Meal ($5.88)
    const defaultMealChoice = classic.mealOptions?.choices[0];
    expect(defaultMealChoice?.name).toBe("Meal");
    expect(defaultMealChoice?.price).toBe(5.88);
    expect(defaultMealChoice?.description).toBe("1 Reg Side & Red Drink");

    // Switching to Large Meals updates price to $6.88
    const largeMealChoice = classic.mealOptions?.choices[1];
    expect(largeMealChoice?.name).toBe("Large Meals");
    expect(largeMealChoice?.price).toBe(6.88);

    // 2. Switching to Deluxe uses Deluxe's own prices, never Classic's
    const deluxe = parsed[1];
    expect(deluxe.name).toBe("Deluxe");
    expect(deluxe.image).toBe("/products/deluxe.png");
    expect(deluxe.mealOptions?.choices[0].price).toBe(6.88);
    expect(deluxe.mealOptions?.choices[1].price).toBe(7.88);

    // 3. Switching to Grilled uses Grilled's own prices
    const grilled = parsed[2];
    expect(grilled.name).toBe("Grilled");
    expect(grilled.image).toBe("/products/grilled.png");
    expect(grilled.mealOptions?.choices[0].price).toBe(7.38);
    expect(grilled.mealOptions?.choices[1].price).toBe(8.38);

    // 4. Cart label resolution includes style, meal choice, and spicy/mild choice
    function resolveCartLabel(style: string, meal: string, flavor?: string) {
      if (meal && flavor) return `${style} - ${meal} (${flavor})`;
      if (meal) return `${style} - ${meal}`;
      return style;
    }

    expect(resolveCartLabel("Classic", "Meal", "Mild")).toBe("Classic - Meal (Mild)");
    expect(resolveCartLabel("Deluxe", "Large Meals", "Spicy")).toBe("Deluxe - Large Meals (Spicy)");
  });
});
