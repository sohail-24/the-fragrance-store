import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { eq, sql, ne } from "drizzle-orm";
import { getDb } from "./connection";
import { productImages, products } from "@db/schema";

export interface DurableProductImage {
  filename: string;
  mimeType: string;
  data: Buffer;
  size: number;
  productId: number | null;
}

export function extractFilename(imagePathOrUrl: string): string {
  const clean = imagePathOrUrl.trim().split("?")[0].split("#")[0];
  return path.basename(clean);
}

export async function saveProductImageDurable(input: {
  filename: string;
  mimeType: string;
  data: Buffer;
  size: number;
  productId?: number | null;
}): Promise<void> {
  const db = getDb();
  try {
    await db
      .insert(productImages)
      .values({
        filename: input.filename,
        mimeType: input.mimeType,
        data: input.data,
        size: input.size,
        productId: input.productId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: productImages.filename,
        set: {
          mimeType: input.mimeType,
          data: input.data,
          size: input.size,
          productId: input.productId ?? sql`COALESCE(EXCLUDED."productId", ${productImages.productId})`,
          updatedAt: new Date(),
        },
      });
  } catch (err: any) {
    console.warn(`[durable-images] Could not save image "${input.filename}" to database:`, err?.message);
  }
}

export async function deleteProductImageDurable(filename: string): Promise<void> {
  const db = getDb();
  try {
    await db.delete(productImages).where(eq(productImages.filename, filename));
  } catch (err: any) {
    console.warn(`[durable-images] Could not delete image "${filename}" from database:`, err?.message);
  }
}

export async function findProductImageByFilename(
  filename: string,
): Promise<DurableProductImage | null> {
  const db = getDb();
  try {
    const rows = await db
      .select({
        filename: productImages.filename,
        mimeType: productImages.mimeType,
        data: productImages.data,
        size: productImages.size,
        productId: productImages.productId,
      })
      .from(productImages)
      .where(eq(productImages.filename, filename))
      .limit(1);

    const match = rows[0];
    if (!match) return null;

    const dataBuffer = Buffer.isBuffer(match.data)
      ? match.data
      : Buffer.from(match.data as unknown as Uint8Array);

    return {
      filename: match.filename,
      mimeType: match.mimeType,
      data: dataBuffer,
      size: match.size,
      productId: match.productId,
    };
  } catch (err: any) {
    console.warn(`[durable-images] Could not query product image "${filename}":`, err?.message);
    return null;
  }
}

export async function associateProductImage(
  productId: number,
  filenameOrUrl: string,
): Promise<void> {
  const filename = extractFilename(filenameOrUrl);
  if (!filename) return;

  const db = getDb();
  try {
    await db
      .update(productImages)
      .set({
        productId,
        updatedAt: new Date(),
      })
      .where(eq(productImages.filename, filename));
  } catch (err) {
    console.warn(`[durable-images] Could not associate image "${filename}" with product ${productId}:`, err);
  }
}

function detectMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

/**
 * Standard brand and marketing assets that should always be preserved
 */
const BRAND_ASSETS = new Set([
  "1-topbun.png",
  "2-tex'sspecialsauce.png",
  "3-freshlettuce.png",
  "4-tomatoslices.png",
  "5-pickels.png",
  "6-onions.png",
  "7-cheeseslice.png",
  "8-chickenpatty.png",
  "9-tex'sspecialsauce.png",
  "10-bottombun.png",
  "burger-category.png",
  "chicken-meals.png",
  "full-image.png",
  "juices.png",
  "sides.png",
  "tex's-images.png",
  "logo.png",
]);

/**
 * Migrates local product images from disk into durable Neon PostgreSQL storage.
 * Only migrates images that are genuinely in use by active Tex's products or branding.
 */
export async function migrateLocalImagesToDurable(): Promise<{
  migrated: string[];
  count: number;
}> {
  const db = getDb();

  // Find all active products and their referenced images
  let activeProducts: Array<{
    id: number;
    image: string | null;
    images: string | null;
    options: string | null;
  }> = [];

  try {
    activeProducts = await db
      .select({
        id: products.id,
        image: products.image,
        images: products.images,
        options: products.options,
      })
      .from(products)
      .where(ne(products.status, "archived"));
  } catch (err) {
    console.warn("[durable-images] Could not query active products for migration:", err);
    activeProducts = [];
  }

  const activeImageToProductId = new Map<string, number>();

  for (const prod of activeProducts) {
    if (prod.image) {
      activeImageToProductId.set(extractFilename(prod.image).toLowerCase(), prod.id);
    }
    if (prod.images) {
      try {
        const parsed = JSON.parse(prod.images);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item === "string") {
              activeImageToProductId.set(extractFilename(item).toLowerCase(), prod.id);
            }
          }
        }
      } catch {
        // ignore
      }
    }
    if (prod.options) {
      try {
        const parsed = JSON.parse(prod.options);
        if (Array.isArray(parsed)) {
          for (const opt of parsed) {
            if (opt?.image && typeof opt.image === "string") {
              activeImageToProductId.set(extractFilename(opt.image).toLowerCase(), prod.id);
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  const searchDirs = [
    path.resolve(process.cwd(), "uploads", "products"),
    path.resolve(process.cwd(), "public", "products"),
  ];

  const migrated: string[] = [];

  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;

    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (!/\.(png|jpe?g|webp|svg|gif)$/i.test(file)) continue;

        const lowerFile = file.toLowerCase();
        const productId = activeImageToProductId.get(lowerFile) ?? null;
        const isBrandAsset = BRAND_ASSETS.has(lowerFile);

        // Only migrate files that belong to an active product or brand asset
        if (!productId && !isBrandAsset) continue;

        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        if (!stats.isFile() || stats.size === 0) continue;

        const fileBytes = await fs.readFile(filePath);
        const mimeType = detectMimeType(file);

        await saveProductImageDurable({
          filename: file,
          mimeType,
          data: fileBytes,
          size: fileBytes.length,
          productId,
        });

        migrated.push(file);
      }
    } catch (err) {
      console.error(`[durable-images] Error reading directory ${dir}:`, err);
    }
  }

  return { migrated, count: migrated.length };
}
