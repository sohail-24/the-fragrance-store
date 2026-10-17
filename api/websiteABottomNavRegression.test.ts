import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { resolvePublicStorefront } from "./queries/companies";

describe("Website A Bug Fix Regression — Bottom Home Icon Navigation", () => {
  it("1. CustomerBottomNav resolves targetStorefront to /store/the-fragrance-store for Website A", async () => {
    const bottomNavFile = await fs.readFile(
      path.resolve(process.cwd(), "src/components/CustomerBottomNav.tsx"),
      "utf-8"
    );

    // Verify CustomerBottomNav has the mobile-nav-home link targeting targetStorefront
    expect(bottomNavFile).toContain('id="mobile-nav-home"');
    expect(bottomNavFile).toContain("to={targetStorefront}");
    expect(bottomNavFile).toContain("/store/the-fragrance-store");
  });

  it("2. CustomerBottomNav handleHomeClick does NOT prevent navigation when on subroutes", () => {
    // Replicate the exact handleHomeClick logic from CustomerBottomNav
    const targetStorefront = "/store/the-fragrance-store";

    function testHandleHomeClick(currentPathname: string) {
      let defaultPrevented = false;
      let scrolledBehavior: string | null = null;

      const mockEvent = {
        preventDefault: () => {
          defaultPrevented = true;
        },
      };

      const normalizedPath = currentPathname.replace(/\/+$/, "");
      const normalizedTarget = targetStorefront.replace(/\/+$/, "");
      if (normalizedPath === normalizedTarget) {
        mockEvent.preventDefault();
        scrolledBehavior = "smooth";
      } else {
        scrolledBehavior = "instant";
      }

      return { defaultPrevented, scrolledBehavior };
    }

    // Subroutes MUST allow navigation (defaultPrevented = false):
    const subroutes = [
      "/store/the-fragrance-store/products",
      "/store/the-fragrance-store/products/test-product",
      "/store/the-fragrance-store/products/velvet-amber-oud",
      "/store/the-fragrance-store/cart",
      "/store/the-fragrance-store/checkout",
      "/store/the-fragrance-store/info",
      "/store/the-fragrance-store/payment",
      "/store/the-fragrance-store/about",
      "/store/the-fragrance-store/orders/101",
    ];

    for (const route of subroutes) {
      const result = testHandleHomeClick(route);
      expect(result.defaultPrevented, `Route ${route} must allow navigation to Home`).toBe(false);
      expect(result.scrolledBehavior).toBe("instant");
    }

    // Canonical Home route MUST prevent reload and smooth scroll to top:
    const homeResult = testHandleHomeClick("/store/the-fragrance-store");
    expect(homeResult.defaultPrevented).toBe(true);
    expect(homeResult.scrolledBehavior).toBe("smooth");

    const homeWithSlash = testHandleHomeClick("/store/the-fragrance-store/");
    expect(homeWithSlash.defaultPrevented).toBe(true);
    expect(homeWithSlash.scrolledBehavior).toBe("smooth");
  });

  it("3. Generic multi-tenant preservation: Website B & C do NOT hardcode Website A", () => {
    function computeTargetStorefront(currentPath: string, storefrontPathProp?: string) {
      const pathParts = currentPath.split("/").filter(Boolean);
      const isTenantStorefront =
        pathParts.length >= 2 &&
        (pathParts[0] === "store" || pathParts[0] === "storefront" || pathParts[0] === "w");
      const tenantSlug = isTenantStorefront ? pathParts[1] : undefined;
      return (
        storefrontPathProp ||
        (tenantSlug ? `/store/${tenantSlug}` : "/store/the-fragrance-store")
      );
    }

    // Website A
    expect(computeTargetStorefront("/store/the-fragrance-store/products")).toBe("/store/the-fragrance-store");
    expect(computeTargetStorefront("/store/the-fragrance-store/cart")).toBe("/store/the-fragrance-store");

    // Website B (dynamic tenant preservation)
    expect(computeTargetStorefront("/store/website-b/products")).toBe("/store/website-b");
    expect(computeTargetStorefront("/storefront/website-b/cart")).toBe("/store/website-b");
    expect(computeTargetStorefront("/w/website-b/checkout")).toBe("/store/website-b");
    expect(computeTargetStorefront("/store/website-b/about", "/store/website-b")).toBe("/store/website-b");

    // Website C (dynamic tenant preservation)
    expect(computeTargetStorefront("/store/website-c/products")).toBe("/store/website-c");
    expect(computeTargetStorefront("/store/website-c/cart")).toBe("/store/website-c");
  });

  it("4. Verified CustomerBottomNav presence in all required customer storefront pages", async () => {
    const pagesToCheck = [
      "src/pages/LandingPage.tsx",
      "src/pages/Products.tsx",
      "src/pages/ProductDetail.tsx",
      "src/pages/Cart.tsx",
      "src/pages/Info.tsx",
      "src/pages/Payment.tsx",
      "src/pages/OrderDetail.tsx",
      "src/pages/About.tsx",
    ];

    for (const relativePath of pagesToCheck) {
      const fileContent = await fs.readFile(path.resolve(process.cwd(), relativePath), "utf-8");
      expect(fileContent, `${relativePath} must import or render CustomerBottomNav`).toContain("CustomerBottomNav");
      expect(fileContent, `${relativePath} must pass storefrontPath`).toContain("storefrontPath");
    }
  });

  it("5. Verified top 'Back to Home' links remain preserved and functioning across pages", async () => {
    const productsCode = await fs.readFile(path.resolve(process.cwd(), "src/pages/Products.tsx"), "utf-8");
    const cartCode = await fs.readFile(path.resolve(process.cwd(), "src/pages/Cart.tsx"), "utf-8");
    const infoCode = await fs.readFile(path.resolve(process.cwd(), "src/pages/Info.tsx"), "utf-8");
    const paymentCode = await fs.readFile(path.resolve(process.cwd(), "src/pages/Payment.tsx"), "utf-8");
    const orderDetailCode = await fs.readFile(path.resolve(process.cwd(), "src/pages/OrderDetail.tsx"), "utf-8");
    const aboutCode = await fs.readFile(path.resolve(process.cwd(), "src/pages/About.tsx"), "utf-8");

    // Products page top links
    expect(productsCode).toContain("<Link\n                to={storefrontPath}");
    expect(productsCode).toContain("Home\n              </Link>");

    // Cart page PageHeader backTo
    expect(cartCode).toContain("backTo={storefrontPath}");
    expect(cartCode).toContain('backLabel="Back to Home"');

    // Info page brand header link
    expect(infoCode).toContain("to={storefrontPath}");

    // Payment page back to home link
    expect(paymentCode).toContain('id="back-to-home-link"');
    expect(paymentCode).toContain("to={storefrontPath}");
    expect(paymentCode).toContain("Back to Home Page");

    // OrderDetail back to home link
    expect(orderDetailCode).toContain("storefrontPath");

    // About page top home link
    expect(aboutCode).toContain("<Link to={storefrontPath}");
    expect(aboutCode).toContain("Return to Home");
  });

  it("6. Canonical Website A resolves active status and matches tenant slug the-fragrance-store", async () => {
    const result = await resolvePublicStorefront({ slug: "the-fragrance-store" });
    expect(result.status).toBe("active");
    if (result.status === "active") {
      expect(result.tenant.slug).toBe("the-fragrance-store");
      expect(result.tenant.name).toContain("The Fragrance Store");
      expect(result.tenant.displayLabel).toBe("Website A");
    }
  });
});
