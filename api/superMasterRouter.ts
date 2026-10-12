import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, superMasterQuery } from "./middleware";
import {
  getPlatformSaaSStats,
  listTenants,
  getTenantById,
  createTenant,
  updateTenant,
  setTenantStatus,
} from "./queries/tenants";

const tenantCreateSchema = z.object({
  name: z.string().min(2, "Brand/Tenant name must be at least 2 characters"),
  slug: z.string().optional(),
  type: z.enum(["supplier", "buyer", "both"]).default("supplier"),
  description: z.string().optional(),
  logo: z.string().optional(),
  website: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default("India"),
  minimumOrderAmount: z.string().optional(),
});

const tenantUpdateSchema = z.object({
  id: z.number(),
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  website: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  minimumOrderAmount: z.string().optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export const superMasterRouter = createRouter({
  // Level 1: Global SaaS Platform Health & Metrics
  stats: superMasterQuery.query(async () => {
    return getPlatformSaaSStats();
  }),

  // Level 1: List all Brand/Store Tenants
  listTenants: superMasterQuery
    .input(
      z
        .object({
          search: z.string().optional(),
          status: z.enum(["all", "active", "inactive"]).optional(),
          type: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return listTenants(input);
    }),

  // Level 1: Inspect a specific Brand/Tenant
  tenantById: superMasterQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const tenant = await getTenantById(input.id);
      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brand/Tenant not found.",
        });
      }
      return tenant;
    }),

  // Level 1: Provision a new Brand/Tenant House
  createTenant: superMasterQuery
    .input(tenantCreateSchema)
    .mutation(async ({ input }) => {
      try {
        const created = await createTenant({
          ...input,
          email: input.email || undefined,
        });
        return created;
      } catch (err: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err?.message || "Failed to provision brand tenant.",
        });
      }
    }),

  // Level 1: Update Brand/Tenant details
  updateTenant: superMasterQuery
    .input(tenantUpdateSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updated = await updateTenant(id, {
        ...data,
        email: data.email || undefined,
      });
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brand/Tenant not found.",
        });
      }
      return updated;
    }),

  // Level 1: Toggle Brand/Tenant Active or Verified status
  setStatus: superMasterQuery
    .input(
      z.object({
        id: z.number(),
        isActive: z.boolean().optional(),
        isVerified: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...status } = input;
      const updated = await setTenantStatus(id, status);
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brand/Tenant not found.",
        });
      }
      return updated;
    }),
});
