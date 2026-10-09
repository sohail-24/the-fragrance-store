import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function seedTexsDatabase(db: any) {
  console.log("🌱 Checking and seeding Tex’s Chicken & Burgers catalog...");

  const existingProducts = await db.select().from(schema.products).limit(1);
  if (existingProducts.length > 0) {
    console.log("Database already contains products. Skipping seed.");
    return;
  }

  // 1. Company
  let supplierId = 1;
  const existingCompany = await db.select().from(schema.companies).limit(1);
  if (existingCompany.length > 0) {
    supplierId = existingCompany[0].id;
  } else {
    console.log("Creating Tex's company...");
    const [company] = await db
      .insert(schema.companies)
      .values({
        name: "Tex’s Chicken & Burgers",
        slug: "texs-chicken-and-burgers",
        type: "supplier",
        description: "Worth Every Bite - Authentic NYC Halal Platters, Burgers, Wings & Sides",
        logo: "/branding/logo.png",
        email: "contact@texschickenandburgers.com",
        phone: "+1 (212) 555-0199",
        addressLine1: "Tex’s Kitchen",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "USA",
        isVerified: true,
        isActive: true,
        minimumOrderAmount: "0.00",
        paymentTerms: "prepaid",
      })
      .returning();
    supplierId = company.id;
  }

  // 2. Warehouses
  let warehouseId = 1;
  const existingWarehouse = await db.select().from(schema.warehouses).limit(1);
  if (existingWarehouse.length > 0) {
    warehouseId = existingWarehouse[0].id;
  } else {
    const [warehouse] = await db
      .insert(schema.warehouses)
      .values({
        companyId: supplierId,
        name: "Tex’s Kitchen",
        code: "WH-TEXS",
        description: "Main kitchen warehouse",
        address: "Tex’s Kitchen",
        addressLine1: "Tex’s Kitchen",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "USA",
        status: "active",
        isDefault: true,
      })
      .returning();
    warehouseId = warehouse.id;
  }

  // 3. Delivery Zones
  let deliveryZoneId = 1;
  const existingDeliveryZone = await db.select().from(schema.deliveryZones).limit(1);
  if (existingDeliveryZone.length > 0) {
    deliveryZoneId = existingDeliveryZone[0].id;
  } else {
    const [deliveryZone] = await db
      .insert(schema.deliveryZones)
      .values({
        companyId: supplierId,
        warehouseId,
        name: "New York Metro",
        state: "New York",
        deliveryEstimate: "same_day",
        deliveryFee: "3.99",
        minimumOrderAmount: "0.00",
        isActive: true,
      })
      .returning();
    deliveryZoneId = deliveryZone.id;
  }

  // 4. Shipping Methods
  const existingShipping = await db.select().from(schema.shippingMethods).limit(1);
  if (existingShipping.length === 0) {
    await db.insert(schema.shippingMethods).values({
      companyId: supplierId,
      warehouseId,
      deliveryZoneId,
      name: "Local Delivery",
      code: "LOCAL-DELIVERY",
      description: "Standard fresh delivery to New York Metro",
      charge: "3.99",
      freeShippingThreshold: "30.00",
      deliveryEstimate: "same_day",
      isDefault: true,
      status: "active",
    });
  }

  // 5. Admin Users
  const existingUsers = await db.select().from(schema.users).limit(1);
  if (existingUsers.length === 0) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await db.insert(schema.users).values([
      {
        unionId: "texs-admin",
        name: "Administrator",
        email: "admin@freshflow.com",
        role: "admin",
        phone: "+1 (212) 555-0199",
        passwordHash,
        companyId: supplierId,
        themePreference: "system",
        isActive: true,
      },
      {
        unionId: "demo-owner",
        name: "Administrator",
        email: "mdsohail88008@gmail.com",
        role: "admin",
        phone: "+1 (212) 555-0199",
        passwordHash,
        companyId: supplierId,
        themePreference: "system",
        isActive: true,
      },
    ]);
  }

  // 6. Categories
  const categoryDefs = [
    {
      name: "Platters",
      slug: "platters",
      description: "Fresh halal platters served with seasoned rice, fresh salad, and signature white & hot sauces",
      icon: "beef",
      color: "#DC2626",
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "Burgers & Sandwiches",
      slug: "burgers-sandwiches",
      description: "Juicy halal cheeseburgers, crispy chicken, falafel sandwiches, and classic Philly cheesesteaks",
      icon: "sparkles",
      color: "#D97706",
      sortOrder: 2,
      isActive: true,
    },
    {
      name: "Party Wings",
      slug: "party-wings",
      description: "Crispy seasoned chicken wings tossed in your choice of signature sauces (6 pcs)",
      icon: "sparkles",
      color: "#E11D48",
      sortOrder: 3,
      isActive: true,
    },
    {
      name: "Sides",
      slug: "sides",
      description: "Crispy golden fries, mac n' cheese, mashed potato, fire roasted corn, and fresh coleslaw",
      icon: "boxes",
      color: "#059669",
      sortOrder: 4,
      isActive: true,
    },
    {
      name: "Drinks",
      slug: "drinks",
      description: "Refreshing cold sodas, iced tea, Snapple, energy drinks, and bottled water",
      icon: "droplets",
      color: "#0284C7",
      sortOrder: 5,
      isActive: true,
    },
    {
      name: "Catering",
      slug: "catering",
      description: "Large party platters and feast packages for family gatherings, events, and parties",
      icon: "package",
      color: "#7C3AED",
      sortOrder: 6,
      isActive: true,
    },
  ];

  const categoryMap = new Map<string, number>();
  const dbCategories = await db.select().from(schema.categories);
  if (dbCategories.length === 0) {
    for (const c of categoryDefs) {
      const [inserted] = await db.insert(schema.categories).values(c).returning();
      categoryMap.set(c.slug, inserted.id);

      // GST config for each category
      await db.insert(schema.gstConfigurations).values({
        companyId: supplierId,
        categoryId: inserted.id,
        name: `${c.name} Tax`,
        gstin: "USA-NY-TAX",
        hsnCode: "2106",
        rate: "8.875",
        status: "active",
        isDefault: c.slug === "sides",
      });
    }
  } else {
    for (const c of dbCategories) {
      categoryMap.set(c.slug, c.id);
    }
  }

  // 7. Products
  const productsList = [
    // Sides (with the UUID image filenames from mock store)
    {
      name: "French Fries",
      slug: "french-fries-tex-french-fries-4ebo",
      categorySlug: "sides",
      unitPrice: "3.25",
      compareAtPrice: "3.25",
      shortDescription: "Crispy golden french fries",
      description: "Crispy golden french fries fried to perfection and lightly seasoned.",
      unitSize: "Regular",
      image: "/api/uploads/product-7dfe9590-14c5-438a-b3a3-cc7b1609fe19.png",
      images: '["/api/uploads/product-7dfe9590-14c5-438a-b3a3-cc7b1609fe19.png"]',
      tags: "fries, sides, crispy, potato",
      isFeatured: true,
      displayPriority: 1,
    },
    {
      name: "Mac N'Cheese",
      slug: "mac-n-cheese-tex-mac-n-cheese-npdc",
      categorySlug: "sides",
      unitPrice: "3.25",
      compareAtPrice: "3.25",
      shortDescription: "Creamy cheesy macaroni",
      description: "Creamy, rich, and cheesy macaroni pasta baked to perfection.",
      unitSize: "Regular",
      image: "/api/uploads/product-3509f65f-efcc-4cca-9a75-e6466f1d1ffd.png",
      images: '["/api/uploads/product-3509f65f-efcc-4cca-9a75-e6466f1d1ffd.png"]',
      tags: "macaroni, cheese, sides",
      isFeatured: false,
      displayPriority: 2,
    },
    {
      name: "Mashed Potato",
      slug: "mashed-potato-tex-mashed-potato--vl8",
      categorySlug: "sides",
      unitPrice: "3.25",
      compareAtPrice: "3.25",
      shortDescription: "Smooth creamy mashed potatoes with gravy",
      description: "Smooth and creamy mashed potatoes served with warm savory gravy.",
      unitSize: "Regular",
      image: "/api/uploads/product-ad977bc0-2165-445e-8b0f-cb3d4f29ce22.png",
      images: '["/api/uploads/product-ad977bc0-2165-445e-8b0f-cb3d4f29ce22.png"]',
      tags: "potato, mashed, gravy, sides",
      isFeatured: false,
      displayPriority: 3,
    },
    {
      name: "Fire Roasted Corn",
      slug: "fire-roasted-corn-tex-fire-roasted-corn-hasg",
      categorySlug: "sides",
      unitPrice: "3.25",
      compareAtPrice: "3.25",
      shortDescription: "Sweet fire-roasted corn",
      description: "Sweet fire-roasted sweet corn seasoned with special butter and herbs.",
      unitSize: "Regular",
      image: "/api/uploads/product-5dbaf069-2c99-40a3-b49a-05fec7881027.png",
      images: '["/api/uploads/product-5dbaf069-2c99-40a3-b49a-05fec7881027.png"]',
      tags: "corn, roasted, sides",
      isFeatured: false,
      displayPriority: 4,
    },
    {
      name: "Coleslaw",
      slug: "coleslaw-tex-coleslaw-iqqp",
      categorySlug: "sides",
      unitPrice: "3.25",
      compareAtPrice: "3.25",
      shortDescription: "Crispy creamy coleslaw",
      description: "Crisp and fresh shredded cabbage and carrots in a tangy, creamy dressing.",
      unitSize: "Regular",
      image: "/api/uploads/product-0e4372e4-cd21-4f34-99f6-c92cf703af1c.png",
      images: '["/api/uploads/product-0e4372e4-cd21-4f34-99f6-c92cf703af1c.png"]',
      tags: "coleslaw, salad, sides",
      isFeatured: false,
      displayPriority: 5,
    },

    // Platters
    {
      name: "Original Chicken Platter",
      slug: "original-chicken-platter",
      categorySlug: "platters",
      unitPrice: "12.99",
      compareAtPrice: "14.99",
      shortDescription: "Grilled marinated halal chicken over basmati rice with salad & white sauce",
      description: "Our signature original chicken platter. Freshly grilled, seasoned halal chicken served over aromatic spiced basmati rice, accompanied by crisp lettuce, diced tomatoes, fresh cucumbers, warm pita, and Tex's famous white and fiery hot sauces.",
      unitSize: "1 platter",
      image: "/products/Chicken-Meals.png",
      images: '["/products/Chicken-Meals.png"]',
      tags: "chicken, platter, rice, halal, signature",
      isFeatured: true,
      displayPriority: 6,
    },
    {
      name: "Combo Over Rice Platter",
      slug: "combo-over-rice-platter",
      categorySlug: "platters",
      unitPrice: "13.49",
      compareAtPrice: "15.49",
      shortDescription: "Tender grilled chicken & savory gyro over rice with pita & salad",
      description: "Tex's #1 fan favorite! A generous combination of our juicy grilled chicken and seared beef & lamb gyro over hot aromatic basmati rice with fresh salad, toasted pita, and signature white sauce.",
      unitSize: "1 platter",
      image: "/products/Full-image.png",
      images: '["/products/Full-image.png"]',
      tags: "combo, chicken, lamb, gyro, platter, halal",
      isFeatured: true,
      displayPriority: 7,
    },

    // Burgers & Sandwiches
    {
      name: "Tex’s Classic Cheeseburger",
      slug: "texs-classic-cheeseburger",
      categorySlug: "burgers-sandwiches",
      unitPrice: "7.99",
      compareAtPrice: "8.99",
      shortDescription: "Juicy halal beef patty with melted cheese, lettuce, tomato & Tex's sauce",
      description: "100% certified halal beef patty seared to perfection on a toasted brioche bun with melted American cheese, crisp lettuce, tomato slices, pickles, and Tex's Special Sauce.",
      unitSize: "1 burger",
      image: "/products/Burger-category.png",
      images: '["/products/Burger-category.png"]',
      tags: "burger, beef, cheese, halal",
      isFeatured: true,
      displayPriority: 8,
    },
    {
      name: "Crispy Chicken Sandwich",
      slug: "crispy-chicken-sandwich",
      categorySlug: "burgers-sandwiches",
      unitPrice: "8.49",
      compareAtPrice: "9.99",
      shortDescription: "Crispy fried chicken breast fillet with pickles and special mayo",
      description: "Golden crispy fried chicken breast fillet tossed in mild spices, served on a buttered brioche bun with crunchy pickles and signature creamy sauce.",
      unitSize: "1 sandwich",
      image: "/products/Tex's-images.png",
      images: JSON.stringify(["/products/Tex's-images.png"]),
      tags: "chicken, sandwich, crispy, burger",
      isFeatured: true,
      displayPriority: 9,
    },

    // Party Wings
    {
      name: "Tex's Signature Party Wings (6 Pcs)",
      slug: "texs-party-wings-6pcs",
      categorySlug: "party-wings",
      unitPrice: "9.99",
      compareAtPrice: "11.49",
      shortDescription: "Crispy fried wings tossed in your choice of buffalo, BBQ, or mango habanero",
      description: "Six jumbo halal chicken wings fried crispy and tossed in your favorite sauce: Mild Buffalo, Smoky BBQ, or Sweet Mango Habanero. Served with celery and cool ranch.",
      unitSize: "6 pcs",
      image: "/products/Chicken-Meals.png",
      images: '["/products/Chicken-Meals.png"]',
      tags: "wings, chicken, party, buffalo",
      isFeatured: true,
      displayPriority: 10,
    },

    // Drinks
    {
      name: "Cold Sodas & Juices",
      slug: "cold-sodas-and-juices",
      categorySlug: "drinks",
      unitPrice: "2.49",
      compareAtPrice: "2.99",
      shortDescription: "Refreshing ice-cold sodas, iced tea, and fruit juices",
      description: "Choose from classic Coke, Diet Coke, Sprite, Ginger Ale, Snapple, or refreshing fruit juices served chilled.",
      unitSize: "Can / Bottle",
      image: "/products/juices.png",
      images: '["/products/juices.png"]',
      tags: "drink, soda, juice, beverage",
      isFeatured: false,
      displayPriority: 11,
    },
  ];

  for (const item of productsList) {
    const categoryId = categoryMap.get(item.categorySlug);
    if (!categoryId) continue;

    const [prod] = await db
      .insert(schema.products)
      .values({
        name: item.name,
        slug: item.slug,
        description: item.description,
        shortDescription: item.shortDescription,
        categoryId,
        supplierId,
        unitPrice: item.unitPrice,
        compareAtPrice: item.compareAtPrice,
        currency: "USD",
        unitType: "each",
        unitSize: item.unitSize,
        minimumOrderQuantity: 1,
        image: item.image,
        images: item.images,
        origin: "New York, USA",
        grade: "premium",
        organic: false,
        status: "active",
        marketplaceVisible: true,
        showInFreshDeals: item.isFeatured,
        isFeatured: item.isFeatured,
        displayPriority: item.displayPriority,
        tags: item.tags,
      })
      .returning();

    await db.insert(schema.inventory).values({
      productId: prod.id,
      supplierId,
      quantityOnHand: 100,
      quantityReserved: 0,
      quantityAvailable: 100,
      reorderLevel: 20,
      reorderQuantity: 50,
      warehouseLocation: "Tex’s Kitchen",
      status: "in_stock",
      isActive: true,
    });
  }

  console.log(`✓ Seeded Tex's Chicken & Burgers catalog (${productsList.length} products).`);
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith("seed-texs.ts")) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  seedTexsDatabase(db)
    .then(async () => {
      console.log("Seed finished!");
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("Seed error:", err);
      await pool.end();
      process.exit(1);
    });
}
