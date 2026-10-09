import { describe, expect, it } from "vitest";
import {
  getCategoryDescription,
  getCategoryImage,
  getCategoryVisual,
  productRequiresOptions,
} from "./Products";

describe("Products Category Helpers", () => {
  it("resolves category visual attributes with database id", () => {
    const visual = getCategoryVisual({
      id: 3,
      name: "Burgers & Sandwiches",
      slug: "burgers-sandwiches",
      description: "Juicy handcrafted burgers",
    });

    expect(visual.id).toBe(3);
    expect(visual.key).toBe("3");
    expect(visual.name).toBe("Burgers & Sandwiches");
    expect(visual.emoji).toBe("🍔");
    expect(visual.image).toBe("/products/cheeseburger.jpg");
    expect(visual.description).toBe("Juicy handcrafted burgers");
  });

  it("resolves category visual with default description and appropriate image when missing", () => {
    const wingsVisual = getCategoryVisual({
      id: 4,
      name: "Party Wings",
      slug: "party-wings",
    });

    expect(wingsVisual.id).toBe(4);
    expect(wingsVisual.emoji).toBe("🍗");
    expect(wingsVisual.image).toBe("/products/hot-wings.jpg");
    expect(wingsVisual.description).toBe("Perfect for sharing");
  });

  it("resolves images and descriptions for all primary food categories", () => {
    expect(getCategoryImage({ name: "Platters Over Rice", slug: "platters" })).toBe("/products/chicken-platter.jpg");
    expect(getCategoryImage({ name: "Gyros & Pitas", slug: "gyros" })).toBe("/products/combo-gyro.jpg");
    expect(getCategoryImage({ name: "Sides", slug: "sides" })).toBe("/products/fries.jpg");
    expect(getCategoryImage({ name: "Beverages", slug: "drinks" })).toBe("/products/soda-bottle.jpg");
    expect(getCategoryImage({ name: "Baklava & Sweets", slug: "desserts" })).toBe("/products/baklava.jpg");
    expect(getCategoryImage({ name: "Catering Packages", slug: "catering" })).toBe("/products/catering.jpg");

    expect(getCategoryDescription({ name: "Beverages", slug: "drinks" })).toBe("Cool & Refreshing");
    expect(getCategoryDescription({ name: "Sides", slug: "sides" })).toBe("The perfect add-ons");
  });
});

describe("Product Option UI Logic", () => {
  it("detects option-based products requiring selection (e.g. Medium, Large)", () => {
    const optionProduct = {
      id: 61,
      name: "French Fries",
      options: [
        { id: "opt-1", name: "Medium", price: 3.25 },
        { id: "opt-2", name: "Large", price: 4.5 },
      ],
    };
    expect(productRequiresOptions(optionProduct)).toBe(true);

    const jsonOptionProduct = {
      id: 62,
      name: "Onion Rings",
      options: JSON.stringify([
        { id: "opt-1", name: "Medium", price: 3.75 },
        { id: "opt-2", name: "Large", price: 5.0 },
      ]),
    };
    expect(productRequiresOptions(jsonOptionProduct)).toBe(true);
  });

  it("detects normal products that do not require options", () => {
    const normalProduct = {
      id: 10,
      name: "Classic Cheeseburger",
      options: null,
    };
    expect(productRequiresOptions(normalProduct)).toBe(false);

    const emptyOptionsProduct = {
      id: 11,
      name: "Baklava",
      options: [],
    };
    expect(productRequiresOptions(emptyOptionsProduct)).toBe(false);

    const undefinedOptionsProduct = {
      id: 12,
      name: "Can of Soda",
    };
    expect(productRequiresOptions(undefinedOptionsProduct)).toBe(false);
  });
});
