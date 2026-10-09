import { describe, it, expect } from "vitest";
import { getPresetOptions } from "@/components/ProductOptionsEditor";
import { parseProductOptions } from "@/types";

describe("Product Options Quick Presets", () => {
  it("preserves existing presets untouched", () => {
    const signature = getPresetOptions("signature-chicken");
    expect(signature).toHaveLength(3);
    expect(signature.map((s) => s.name)).toEqual(["2 PC", "3 PC", "4 PC"]);

    const wings = getPresetOptions("fiery-wings");
    expect(wings).toHaveLength(2);
    expect(wings.map((w) => w.name)).toEqual(["6 PC", "15 PC"]);

    const sandwiches = getPresetOptions("sandwich");
    expect(sandwiches).toHaveLength(3);
    expect(sandwiches.map((s) => s.name)).toEqual(["Classic", "Deluxe", "Grilled"]);

    const tenders = getPresetOptions("tenders");
    expect(tenders).toHaveLength(2);
    expect(tenders.map((t) => t.name)).toEqual(["3 PC", "5 PC"]);

    const mealOnly = getPresetOptions("meal-only");
    expect(mealOnly).toHaveLength(1);
    expect(mealOnly[0].name).toBe("Regular Order");
  });

  it("provides independent Meal Options with per-choice pricing and Choice Group on sandwich preset variants", () => {
    const sandwiches = getPresetOptions("sandwich");
    expect(sandwiches).toHaveLength(3);
    expect(sandwiches.map((s) => s.name)).toEqual(["Classic", "Deluxe", "Grilled"]);

    // Classic
    expect(sandwiches[0].mealOptions?.label).toBe("Select Option");
    expect(sandwiches[0].mealOptions?.choices).toEqual([
      { name: "Meal", description: "1 Reg Side & Red Drink", price: 5.88 },
      { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 6.88 },
    ]);
    expect(sandwiches[0].choiceGroup?.label).toBe("Select one");
    expect(sandwiches[0].choiceGroup?.choices).toEqual(["Mild", "Spicy"]);

    // Deluxe
    expect(sandwiches[1].mealOptions?.choices).toEqual([
      { name: "Meal", description: "1 Reg Side & Red Drink", price: 6.88 },
      { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 7.88 },
    ]);
    expect(sandwiches[1].choiceGroup?.choices).toEqual(["Mild", "Spicy"]);

    // Grilled
    expect(sandwiches[2].mealOptions?.choices).toEqual([
      { name: "Meal", description: "1 Reg Side & Red Drink", price: 7.38 },
      { name: "Large Meals", description: "2 Reg Sides & Lg Drink", price: 8.38 },
    ]);
    expect(sandwiches[2].choiceGroup?.choices).toEqual(["Mild", "Spicy"]);
  });

  it("does not provide Mild or Spicy as presets", () => {
    expect(getPresetOptions("mild")).toEqual([]);
    expect(getPresetOptions("spicy")).toEqual([]);
  });

  it("ensures backward compatibility for legacy strings, choiceGroup, and new meal options with prices", () => {
    // 1. Legacy option with only choiceGroup and old top-level prices
    const legacyOnlyChoiceGroup = JSON.stringify([
      {
        id: "opt-1",
        name: "Classic",
        price: 6.99,
        mealPrice: 9.99,
        onlyPrice: 6.99,
        choiceGroup: {
          label: "Select one",
          choices: ["Mild", "Spicy"],
        },
      },
    ]);
    const parsedLegacy = parseProductOptions(legacyOnlyChoiceGroup);
    expect(parsedLegacy).toHaveLength(1);
    expect(parsedLegacy[0].mealOptions).toBeUndefined();
    expect(parsedLegacy[0].price).toBe(6.99);
    expect(parsedLegacy[0].mealPrice).toBe(9.99);
    expect(parsedLegacy[0].onlyPrice).toBe(6.99);
    expect(parsedLegacy[0].choiceGroup?.label).toBe("Select one");
    expect(parsedLegacy[0].choiceGroup?.choices).toEqual(["Mild", "Spicy"]);

    // 2. Legacy option where mealOptions choices were strings
    const legacyStringChoices = JSON.stringify([
      {
        id: "opt-2",
        name: "Deluxe",
        price: 7.99,
        mealOptions: {
          label: "Select Option",
          choices: ["Meal", "Large Meals"],
        },
        choiceGroup: {
          label: "Select one",
          choices: ["Mild", "Spicy"],
        },
      },
    ]);
    const parsedStringChoices = parseProductOptions(legacyStringChoices);
    expect(parsedStringChoices).toHaveLength(1);
    expect(parsedStringChoices[0].mealOptions?.label).toBe("Select Option");
    expect(parsedStringChoices[0].mealOptions?.choices).toEqual([
      { name: "Meal", description: null, price: 0 },
      { name: "Large Meals", description: null, price: 0 },
    ]);

    // 3. New mealOptions with per-choice pricing structure
    const newStructuredMealOptions = JSON.stringify([
      {
        id: "opt-3",
        name: "Classic",
        price: 5.88,
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
    ]);
    const parsedNew = parseProductOptions(newStructuredMealOptions);
    expect(parsedNew).toHaveLength(1);
    expect(parsedNew[0].mealOptions?.choices).toHaveLength(2);
    expect(parsedNew[0].mealOptions?.choices[0]).toEqual({
      name: "Meal",
      description: "1 Reg Side & Red Drink",
      price: 5.88,
    });
    expect(parsedNew[0].mealOptions?.choices[1]).toEqual({
      name: "Large Meals",
      description: "2 Reg Sides & Lg Drink",
      price: 6.88,
    });
    expect(parsedNew[0].choiceGroup?.choices).toEqual(["Mild", "Spicy"]);
  });
});
