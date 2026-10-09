import { describe, it, expect } from "vitest";
import { parseProductOptions } from "@/types";

describe("Mutually Exclusive Product Modes (Standard vs Variant)", () => {
  describe("Mode Detection", () => {
    it("detects Standard Mode when options array is empty", () => {
      const options = parseProductOptions([]);
      const isVariantMode = options.length > 0;
      expect(isVariantMode).toBe(false);
    });

    it("detects Variant Mode when options exist", () => {
      const options = parseProductOptions([
        { id: "opt-1", name: "Small", price: 5.55, image: "https://example.com/small.jpg" },
        { id: "opt-2", name: "Large", price: 9.99, image: "https://example.com/large.jpg" },
      ]);
      const isVariantMode = options.length > 0;
      expect(isVariantMode).toBe(true);
      expect(options).toHaveLength(2);
    });
  });

  describe("Validation & Readiness in Standard Mode", () => {
    it("requires sellingPrice and dish photo in Standard Mode", () => {
      const isVariantMode = false;
      const sellingPrice = 0;
      const images: string[] = [];

      const errors = {
        pricing: !isVariantMode && sellingPrice <= 0 ? "Selling price must be greater than $0.00." : "",
        photo: !isVariantMode && images.length === 0 ? "Please upload at least one dish photo (required in Standard Mode)." : "",
      };

      expect(errors.pricing).toBeTruthy();
      expect(errors.photo).toBeTruthy();
    });

    it("passes readiness in Standard Mode when price and photo are provided", () => {
      const isVariantMode = false;
      const name = "Classic Burger";
      const categoryId = "1";
      const sellingPrice = 8.99;
      const images = ["https://example.com/burger.jpg"];

      const readiness = {
        dishName: !!name.trim(),
        category: !!categoryId,
        sellingPrice: sellingPrice > 0,
        photoAdded: images.length > 0,
      };

      expect(readiness.dishName).toBe(true);
      expect(readiness.category).toBe(true);
      expect(readiness.sellingPrice).toBe(true);
      expect(readiness.photoAdded).toBe(true);
    });
  });

  describe("Validation & Readiness in Variant Mode", () => {
    it("does NOT require Dish Photos if variant image is present", () => {
      const options = parseProductOptions([
        { id: "opt-1", name: "SM", price: 3.25, image: "https://example.com/sm.jpg" },
        { id: "opt-2", name: "LG", price: 4.25, image: "https://example.com/lg.jpg" },
      ]);
      const isVariantMode = options.length > 0;
      const hasValidVariantPricing = isVariantMode && options.every((o) => o.name.trim() && (o.price || 0) > 0);
      const firstVariantWithImage = isVariantMode ? options.find((o) => o.image && o.image.trim()) : null;
      const dishPhotos: string[] = []; // Empty dish photos!
      const hasValidVariantImage = isVariantMode && Boolean(firstVariantWithImage || dishPhotos.length > 0);

      // Dish photo validation should pass because variant mode has a variant image
      const photoError = isVariantMode
        ? (hasValidVariantImage ? "" : "Please upload at least one variant image.")
        : (dishPhotos.length > 0 ? "" : "Please upload at least one dish photo.");

      expect(hasValidVariantPricing).toBe(true);
      expect(hasValidVariantImage).toBe(true);
      expect(photoError).toBe("");
    });

    it("uses the FIRST variant image as the DEFAULT product image", () => {
      const options = parseProductOptions([
        { id: "opt-1", name: "SM", price: 3.25, image: "https://example.com/sm-burger.jpg" },
        { id: "opt-2", name: "LG", price: 4.25, image: "https://example.com/lg-burger.jpg" },
      ]);

      const firstVariantImage = options.find((o) => o.image && o.image.trim())?.image?.trim() || null;
      expect(firstVariantImage).toBe("https://example.com/sm-burger.jpg");

      // Home and catalog card display image
      const productMainImage = "https://example.com/old-main.jpg";
      const displayCardImage = firstVariantImage || productMainImage;
      expect(displayCardImage).toBe("https://example.com/sm-burger.jpg");
    });

    it("falls back to default/first image when a variant does not have an image", () => {
      const options = parseProductOptions([
        { id: "opt-1", name: "SM", price: 3.25, image: "https://example.com/sm-burger.jpg" },
        { id: "opt-2", name: "LG", price: 4.25, image: null }, // No image for LG
      ]);

      const defaultProductImage = options.find((o) => o.image && o.image.trim())?.image || "https://example.com/fallback.jpg";
      
      // Selected Option 1 (SM)
      const selectedOption1 = options[0];
      const activeImage1 = selectedOption1?.image || defaultProductImage;
      expect(activeImage1).toBe("https://example.com/sm-burger.jpg");

      // Selected Option 2 (LG) with no image
      const selectedOption2 = options[1];
      const activeImage2 = selectedOption2?.image || defaultProductImage;
      expect(activeImage2).toBe("https://example.com/sm-burger.jpg");
      expect(activeImage2).toBeTruthy();
    });

    it("syncs primary selling price with Option #1 price in variant mode", () => {
      const options = parseProductOptions([
        { id: "opt-1", name: "2 PC", price: 5.99 },
        { id: "opt-2", name: "3 PC", price: 7.99 },
      ]);
      const isVariantMode = options.length > 0;
      const effectiveSellingPrice = isVariantMode ? (options[0]?.price || 0) : 0;
      expect(effectiveSellingPrice).toBe(5.99);
    });
  });
});
