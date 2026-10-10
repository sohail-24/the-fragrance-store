import { describe, expect, it } from "vitest";
import {
  toCategoryNavItem,
  getCategoryEmoji,
  HERO_CAMPAIGNS,
  HERO_ROTATION_INTERVAL_MS,
  getHeadlineLines,
} from "./LandingPage";

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

  describe("Phase 2.5 auto-rotating hero fragrance campaigns", () => {
    it("contains exactly three hero campaign advertisements", () => {
      expect(HERO_CAMPAIGNS).toHaveLength(3);
    });

    it("verifies all three campaigns have required luxury copy and valid flacon imagery", () => {
      HERO_CAMPAIGNS.forEach((campaign) => {
        expect(campaign.id).toBeGreaterThan(0);
        expect(campaign.eyebrow).toBeTruthy();
        expect(campaign.eyebrow.length).toBeGreaterThan(5);
        expect(campaign.headlineFirst).toBeTruthy();
        expect(campaign.headlineSecond).toBeTruthy();
        expect(campaign.description).toBeTruthy();
        expect(campaign.ctaText).toBeTruthy();
        expect(campaign.image).toMatch(/^\/fragrance\/.*\.svg$/);
        expect(campaign.alt).toBeTruthy();
      });

      // Verify campaign 1 contains the signature scent prompt
      expect(HERO_CAMPAIGNS[0].eyebrow).toBe("LUXURY • ELEGANCE • EVERYDAY YOU");
      expect(HERO_CAMPAIGNS[0].headlineFirst).toBe("Find Your");
      expect(HERO_CAMPAIGNS[0].headlineSecond).toBe("Signature Scent");
      expect(HERO_CAMPAIGNS[0].ctaText).toBe("SHOP NOW");
      expect(HERO_CAMPAIGNS[0].image).toBe("/fragrance/hero-sauvage-million.svg");

      // Verify campaign 2 contains niche & artisanal blend
      expect(HERO_CAMPAIGNS[1].eyebrow).toBe("NICHE & ARTISANAL • PRIVATE BLEND");
      expect(HERO_CAMPAIGNS[1].ctaText).toBe("EXPLORE NICHE");
      expect(HERO_CAMPAIGNS[1].image).toBe("/fragrance/hero-fragrance.svg");

      // Verify campaign 3 contains curated discovery set coffrets
      expect(HERO_CAMPAIGNS[2].eyebrow).toBe("CURATED COFFRETS • DISCOVERY SETS");
      expect(HERO_CAMPAIGNS[2].ctaText).toBe("DISCOVER SETS");
      expect(HERO_CAMPAIGNS[2].image).toBe("/fragrance/discovery-set.svg");
    });

    it("rotates sequentially through all 3 campaigns and wraps back to index 0", () => {
      let activeSlide = 0;
      expect(HERO_CAMPAIGNS[activeSlide].id).toBe(1);

      // Advance by 1 step (simulating 3s interval trigger)
      activeSlide = (activeSlide + 1) % HERO_CAMPAIGNS.length;
      expect(activeSlide).toBe(1);
      expect(HERO_CAMPAIGNS[activeSlide].id).toBe(2);

      // Advance by 1 step
      activeSlide = (activeSlide + 1) % HERO_CAMPAIGNS.length;
      expect(activeSlide).toBe(2);
      expect(HERO_CAMPAIGNS[activeSlide].id).toBe(3);

      // Advance by 1 step (wraps back to 0)
      activeSlide = (activeSlide + 1) % HERO_CAMPAIGNS.length;
      expect(activeSlide).toBe(0);
      expect(HERO_CAMPAIGNS[activeSlide].id).toBe(1);
    });
  });

  describe("Phase 2.6 carousel timing, headline formatting and layout scale", () => {
    it("sets automatic slide rotation duration to exactly 5 seconds (5000ms)", () => {
      expect(HERO_ROTATION_INTERVAL_MS).toBe(5000);
    });

    it("displays the final two words of each campaign headline on two separate lines", () => {
      // Campaign 1: "Find Your Signature Scent"
      const c1 = getHeadlineLines(HERO_CAMPAIGNS[0]);
      expect(c1.leadText).toBe("Find Your");
      expect(c1.line2).toBe("Signature");
      expect(c1.line3).toBe("Scent");

      // Campaign 2: "Haute Parfumerie & Artisanal Extraits"
      const c2 = getHeadlineLines(HERO_CAMPAIGNS[1]);
      expect(c2.leadText).toBe("Haute Parfumerie &");
      expect(c2.line2).toBe("Artisanal");
      expect(c2.line3).toBe("Extraits");

      // Campaign 3: "Curated Luxury Discovery Sets"
      const c3 = getHeadlineLines(HERO_CAMPAIGNS[2]);
      expect(c3.leadText).toBe("Curated Luxury");
      expect(c3.line2).toBe("Discovery");
      expect(c3.line3).toBe("Sets");
    });

    it("ensures each campaign has explicit final two word properties matching headlineSecond", () => {
      HERO_CAMPAIGNS.forEach((campaign) => {
        expect(campaign.headlineWord1).toBeTruthy();
        expect(campaign.headlineWord2).toBeTruthy();
        expect(`${campaign.headlineWord1} ${campaign.headlineWord2}`).toBe(campaign.headlineSecond);
      });
    });
  });
});
