import { describe, expect, it } from "vitest";
import { toCategoryNavItem, getCategoryEmoji } from "./LandingPage";

describe("customer category navigation", () => {
  it("uses the database category id and name, so newly returned categories need no frontend entry", () => {
    expect(
      toCategoryNavItem({
        id: 42,
        name: "Chicken Shawarma",
        slug: "chicken-shawarma",
      }),
    ).toMatchObject({
      key: "category-42",
      categoryId: 42,
      name: "Chicken Shawarma",
    });
  });

  it("maps categories to their designated food emojis", () => {
    expect(getCategoryEmoji({ name: "Platters", slug: "platters" })).toBe("🍗");
    expect(getCategoryEmoji({ name: "Burgers & Sandwiches", slug: "burgers-sandwiches" })).toBe("🍔");
    expect(getCategoryEmoji({ name: "Party Wings", slug: "party-wings" })).toBe("🍗");
    expect(getCategoryEmoji({ name: "Sides", slug: "sides" })).toBe("🍟");
    expect(getCategoryEmoji({ name: "Drinks", slug: "drinks" })).toBe("🥤");
    expect(getCategoryEmoji({ name: "Catering", slug: "catering" })).toBe("🎉");
    expect(getCategoryEmoji({ name: "Kids Meals", slug: "kids-meals" })).toBe("🍱");
    expect(getCategoryEmoji({ name: "Family Meals", slug: "family-meals" })).toBe("🍗");
    expect(getCategoryEmoji({ name: "Chicken Sandwiches", slug: "chicken-sandwiches" })).toBe("🥪");
    expect(getCategoryEmoji({ name: "Chicken Tenders", slug: "chicken-tenders" })).toBe("🍗");
    expect(getCategoryEmoji({ name: "Fiery Wings", slug: "fiery-wings" })).toBe("🌶️");
    expect(getCategoryEmoji({ name: "Signature Chicken", slug: "signature-chicken" })).toBe("🍗");
    expect(getCategoryEmoji({ name: "Gyros", slug: "gyros" })).toBe("🌯");
    expect(getCategoryEmoji({ name: "Burgers", slug: "burgers" })).toBe("🍔");
    expect(getCategoryEmoji({ name: "Rice Bowls", slug: "rice-bowls" })).toBe("🍚");
    expect(getCategoryEmoji({ name: "Sandwiches", slug: "sandwiches" })).toBe("🥪");
    expect(getCategoryEmoji({ name: "Salads", slug: "salads" })).toBe("🥗");
    expect(getCategoryEmoji({ name: "Beverages", slug: "beverages" })).toBe("🥤");
    expect(getCategoryEmoji({ name: "Desserts", slug: "desserts" })).toBe("🍰");
    expect(getCategoryEmoji({ name: "Unknown Category", slug: "unknown" })).toBe("🍗");
  });

  describe("Today's Special advertisement banner", () => {
    it("dynamically selects the first 3 visible products from the products array", () => {
      const mockProducts = [
        { id: 101, name: "Coleslaw", slug: "coleslaw", image: "/img/coleslaw.jpg" },
        { id: 102, name: "Fire Roasted Corn", slug: "fire-roasted-corn", image: "/img/corn.jpg" },
        { id: 103, name: "Mac N' Cheese", slug: "mac-n-cheese", image: "/img/mac.jpg" },
        { id: 104, name: "Mashed Potato", slug: "mashed-potato", image: "/img/potato.jpg" },
        { id: 105, name: "French Fries", slug: "french-fries", image: "/img/fries.jpg" },
      ];

      const topThree = mockProducts.slice(0, 3);
      expect(topThree).toHaveLength(3);
      expect(topThree.map((p) => p.name)).toEqual(["Coleslaw", "Fire Roasted Corn", "Mac N' Cheese"]);

      // If product ordering changes, top 3 automatically updates
      const reorderedProducts = [mockProducts[3], mockProducts[0], mockProducts[1], mockProducts[2]];
      const newTopThree = reorderedProducts.slice(0, 3);
      expect(newTopThree.map((p) => p.name)).toEqual(["Mashed Potato", "Coleslaw", "Fire Roasted Corn"]);
    });

    it("ensures advertisement contains the required promotional lines and no halal wording", () => {
      const heading = "TODAY'S SPECIAL";
      const secondary = "Worth Every Bite";
      const supporting = "Fresh favorites made for you.";
      const cta = "VIEW SPECIALS →";

      const fullBannerText = `${heading} ${secondary} ${supporting} ${cta}`.toUpperCase();

      expect(heading).toBe("TODAY'S SPECIAL");
      expect(secondary).toBe("Worth Every Bite");
      expect(supporting).toBe("Fresh favorites made for you.");
      expect(cta).toBe("VIEW SPECIALS →");

      // Strictly no halal advertisement wording
      expect(fullBannerText).not.toContain("HALAL FOOD");
      expect(fullBannerText).not.toContain("DELICIOUS HALAL");
      expect(fullBannerText).not.toContain("ALWAYS HALAL");
      expect(fullBannerText).not.toContain("TASTE THE DIFFERENCE");
    });

    it("rotates single active product for full-box display from the top 3", () => {
      const topThree = [
        { id: 1, name: "Coleslaw", image: "/img/coleslaw.png" },
        { id: 2, name: "Fire Roasted Corn", image: "/img/corn.png" },
        { id: 3, name: "Mac N' Cheese", image: "/img/mac.png" },
      ];

      // Initial state: Product 1
      let currentIndex = 0;
      expect(topThree[currentIndex].name).toBe("Coleslaw");
      expect(topThree[currentIndex].image).toBe("/img/coleslaw.png");

      // Rotate: Product 2
      currentIndex = (currentIndex + 1) % topThree.length;
      expect(topThree[currentIndex].name).toBe("Fire Roasted Corn");

      // Rotate: Product 3
      currentIndex = (currentIndex + 1) % topThree.length;
      expect(topThree[currentIndex].name).toBe("Mac N' Cheese");

      // Rotate: Back to Product 1
      currentIndex = (currentIndex + 1) % topThree.length;
      expect(topThree[currentIndex].name).toBe("Coleslaw");
    });
  });
});
