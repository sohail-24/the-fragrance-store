import { getStoredAdminToken } from "@/providers/trpc";

/**
 * Helper to resolve product image URLs.
 * Ensures relative paths like "api/uploads/..." or "uploads/..." have a leading slash
 * so they resolve from root rather than relative to the current route.
 */
export function resolveProductImageUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  return `/${trimmed}`;
}

/**
 * Uploads a product or variant image using the existing Neon PostgreSQL durable storage endpoint.
 */
export async function uploadProductImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);

  const token = getStoredAdminToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch("/api/products/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
    headers,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    url?: string;
  };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error || `Could not upload ${file.name}.`);
  }

  return payload.url;
}

