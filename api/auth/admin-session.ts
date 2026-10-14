import * as cookie from "cookie";
import { createHash, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { users, type User } from "@db/schema";
import { eq, or, and } from "drizzle-orm";
import { env } from "../lib/env";
import { getSessionCookieOptions } from "../lib/cookies";
import { getDb } from "../queries/connection";
import { ensureDefaultBusiness } from "../queries/companies";
import { upsertTenantMembership } from "../queries/memberships";

const encoder = new TextEncoder();
const accessCookieName = "shop_admin_access";
const refreshCookieName = "shop_admin_refresh";
const accessMaxAgeMs = 15 * 60 * 1000;
const refreshMaxAgeMs = 30 * 24 * 60 * 60 * 1000;

type TokenType = "access" | "refresh";

let cachedAdminCompanyId: number | null = null;

export function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function getSuperMasterConfig() {
  const email = (
    process.env.SUPER_MASTER_EMAIL !== undefined
      ? process.env.SUPER_MASTER_EMAIL
      : env.superMasterEmail || ""
  ).trim().toLowerCase();
  const password = (
    process.env.SUPER_MASTER_PASSWORD !== undefined
      ? process.env.SUPER_MASTER_PASSWORD
      : env.superMasterPassword || ""
  ).trim();
  return {
    email,
    password,
    isConfigured: Boolean(email && password),
  };
}

export function isSuperMasterConfigured(): boolean {
  return getSuperMasterConfig().isConfigured;
}

export function isSuperMasterEmail(email: string): boolean {
  const { email: smEmail } = getSuperMasterConfig();
  if (!smEmail) return false;
  return email.trim().toLowerCase() === smEmail;
}

export function isOrdinaryAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const configured = (process.env.ADMIN_EMAIL || env.adminEmail || "").trim().toLowerCase();
  if (configured && normalized === configured) return true;
  if (!env.isProduction && normalized === "admin@freshflow.com") return true;
  return false;
}

function configuredAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || env.adminEmail || "admin@freshflow.com";
  const adminPassword = process.env.ADMIN_PASSWORD || env.adminPassword || "admin123";
  const accessSecret = process.env.JWT_ACCESS_SECRET || env.jwtAccessSecret;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || env.jwtRefreshSecret;

  if (!adminEmail || !adminPassword || !accessSecret || !refreshSecret) {
    throw new Error("Admin authentication is not configured.");
  }
  return { email: adminEmail.trim().toLowerCase(), password: adminPassword };
}

function keyFor(type: TokenType) {
  const accessSecret = process.env.JWT_ACCESS_SECRET || env.jwtAccessSecret;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || env.jwtRefreshSecret;
  const secret = type === "access" ? accessSecret : refreshSecret;
  if (!secret) {
    throw new Error(`JWT_${type.toUpperCase()}_SECRET is not configured.`);
  }
  return encoder.encode(secret);
}

export function activeAdminUser(
  email: string,
  companyId?: number | null,
  roleOverride?: "super_master" | "admin"
): User {
  const finalCompanyId = companyId ?? cachedAdminCompanyId ?? 1;
  const isSM = isSuperMasterEmail(email);
  const effectiveRole = isSM ? "super_master" : (roleOverride ?? "admin");

  return {
    id: 1,
    unionId: `admin:${email.trim().toLowerCase()}`,
    authProvider: "local",
    role: effectiveRole as any,
    email: email.trim().toLowerCase(),
    name: isSM ? "Super Master" : "Administrator",
    phone: null,
    companyId: finalCompanyId,
    passwordHash: null,
    refreshTokenHash: null,
    isActive: true,
    mobileVerifiedAt: null,
    emailVerifiedAt: null,
    lastSignInAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;
}

export async function resolveAdminUser(
  email: string,
  roleOverride?: "super_master" | "admin"
): Promise<User> {
  const defaultBusiness = await ensureDefaultBusiness();
  cachedAdminCompanyId = defaultBusiness.id;
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const unionId = `admin:${normalizedEmail}`;
  const isSM = isSuperMasterEmail(normalizedEmail);
  const effectiveRole = isSM ? "super_master" : (roleOverride ?? "admin");

  try {
    let user = await db.query.users.findFirst({
      where: or(
        eq(users.unionId, unionId),
        and(eq(users.email, normalizedEmail), eq(users.role, "admin"))
      ),
    });

    if (!user) {
      const [inserted] = await db
        .insert(users)
        .values({
          unionId,
          authProvider: "local",
          name: isSM ? "Super Master" : "Administrator",
          email: normalizedEmail,
          role: "admin", // stored as "admin" in DB due to Postgres userRoleEnum constraint
          companyId: defaultBusiness.id,
          isActive: true,
          lastSignInAt: new Date(),
        })
        .returning();
      user = inserted;
    } else if (user.companyId !== defaultBusiness.id || !user.isActive) {
      const [updated] = await db
        .update(users)
        .set({
          companyId: defaultBusiness.id,
          role: "admin",
          isActive: true,
          updatedAt: new Date(),
          lastSignInAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();
      user = updated;
    }

    if (user) {
      try {
        await upsertTenantMembership({
          userId: user.id,
          companyId: defaultBusiness.id,
          role: "admin",
          isActive: true,
        });
      } catch {
        // Non-fatal if table not yet migrated
      }
      return {
        ...user,
        role: effectiveRole as any,
      };
    }
  } catch (error) {
    console.warn("[AdminSession] Database lookup/sync failed, using fallback linked user:", error);
  }

  return activeAdminUser(normalizedEmail, defaultBusiness.id, effectiveRole);
}

export function validateSuperMasterCredentials(email: string, password: string): boolean {
  const sm = getSuperMasterConfig();
  if (!sm.isConfigured) {
    return false;
  }
  if (!isSuperMasterEmail(email)) {
    return false;
  }
  return safeCompare(password, sm.password);
}

export function validateOrdinaryAdminCredentials(email: string, password: string): boolean {
  if (!isOrdinaryAdminEmail(email)) {
    return false;
  }
  const configured = configuredAdmin();
  const validPasswords = [configured.password];
  if (!env.isProduction && configured.password !== "admin123") {
    validPasswords.push("admin123");
  }
  return validPasswords.some((validPass) => safeCompare(password, validPass));
}

export function validateAdminCredentials(email: string, password: string): boolean {
  if (!email || !password) return false;
  if (isSuperMasterEmail(email)) {
    return validateSuperMasterCredentials(email, password);
  }
  if (isOrdinaryAdminEmail(email)) {
    return validateOrdinaryAdminCredentials(email, password);
  }
  return false;
}

async function signToken(email: string, type: TokenType, roleOverride?: "super_master" | "admin") {
  const maxAge = type === "access" ? accessMaxAgeMs : refreshMaxAgeMs;
  const isSM = isSuperMasterEmail(email);
  const tokenRole = roleOverride ?? (isSM ? "super_master" : "admin");

  return new SignJWT({ typ: type, role: tokenRole })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("shop-admin")
    .setSubject(email.trim().toLowerCase())
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + maxAge) / 1000))
    .sign(keyFor(type));
}

async function verifyToken(token: string, type: TokenType) {
  const result = await jwtVerify(token, keyFor(type), { issuer: "shop-admin" });
  const subjectEmail = typeof result.payload.sub === "string" ? result.payload.sub.trim().toLowerCase() : "";
  const tokenRole = typeof result.payload.role === "string" ? result.payload.role : "";

  const isSM = isSuperMasterEmail(subjectEmail);
  const isOrdinary = isOrdinaryAdminEmail(subjectEmail);

  if (!isSM && !isOrdinary) {
    throw new Error("Invalid admin token: unauthorized subject");
  }

  if (result.payload.typ !== type) {
    throw new Error("Invalid admin token type");
  }

  // Security boundary: ordinary administrator credentials cannot claim super_master role
  if (!isSM && tokenRole === "super_master") {
    throw new Error("Forged role: non-super-master subject cannot possess super_master role");
  }

  const assignedRole: "super_master" | "admin" = isSM ? "super_master" : "admin";
  return await resolveAdminUser(subjectEmail, assignedRole);
}

function appendCookie(headers: Headers, requestHeaders: Headers, name: string, value: string, maxAgeMs: number) {
  const options = getSessionCookieOptions(requestHeaders);
  headers.append("set-cookie", cookie.serialize(name, value, {
    httpOnly: true,
    path: "/",
    sameSite: options.sameSite?.toLowerCase() as "lax" | "none",
    secure: options.secure,
    partitioned: options.partitioned,
    maxAge: Math.floor(maxAgeMs / 1000),
  }));
}

export async function signAdminToken(
  email: string,
  type: "access" | "refresh" = "access",
  roleOverride?: "super_master" | "admin"
) {
  return signToken(email, type, roleOverride);
}

export async function issueAdminSessionCookies(
  email: string,
  requestHeaders: Headers,
  responseHeaders: Headers,
  roleOverride?: "super_master" | "admin"
) {
  configuredAdmin();
  const isSM = isSuperMasterEmail(email);
  const assignedRole = roleOverride ?? (isSM ? "super_master" : "admin");
  appendCookie(
    responseHeaders,
    requestHeaders,
    accessCookieName,
    await signToken(email, "access", assignedRole),
    accessMaxAgeMs
  );
  appendCookie(
    responseHeaders,
    requestHeaders,
    refreshCookieName,
    await signToken(email, "refresh", assignedRole),
    refreshMaxAgeMs
  );
}

export function clearAdminSessionCookies(requestHeaders: Headers, responseHeaders: Headers) {
  const options = getSessionCookieOptions(requestHeaders);
  for (const name of [accessCookieName, refreshCookieName]) {
    responseHeaders.append("set-cookie", cookie.serialize(name, "", {
      httpOnly: true,
      path: "/",
      sameSite: options.sameSite?.toLowerCase() as "lax" | "none",
      secure: options.secure,
      partitioned: options.partitioned,
      maxAge: 0,
    }));
  }
}

export async function verifyAdminToken(token: string, type: TokenType = "access") {
  return verifyToken(token, type);
}

export async function authenticateAdminRequest(requestHeaders: Headers, responseHeaders?: Headers) {
  const cookies = cookie.parse(requestHeaders.get("cookie") ?? "");
  if (cookies[accessCookieName]) {
    try {
      return await verifyToken(cookies[accessCookieName], "access");
    } catch {
      // Token may be expired; fall through to Bearer / refresh token check
    }
  }

  const authHeader = requestHeaders.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice(7).trim();
    if (bearerToken) {
      return await verifyToken(bearerToken, "access");
    }
  }

  if (!cookies[refreshCookieName] || !responseHeaders) throw new Error("Authentication required");
  const user = await verifyToken(cookies[refreshCookieName], "refresh");
  const isSM = isSuperMasterEmail(user.email ?? "");
  await issueAdminSessionCookies(user.email!, requestHeaders, responseHeaders, isSM ? "super_master" : "admin");
  return user;
}
