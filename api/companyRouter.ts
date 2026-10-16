import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { isSuperMaster } from "@contracts/roles";
import { authedQuery, createRouter, ownerQuery, publicQuery } from "./middleware";
import { env } from "./lib/env";
import { findMembership } from "./queries/memberships";
import {
  ensureDefaultBusiness,
  findAllCompanies,
  findCompaniesByType,
  findCompanyById,
  findCompanyBySlug,
  searchCompanies,
  resolvePublicStorefront,
} from "./queries/companies";

export function canAccessCompany(input: {
  user: { id?: number; role?: string | null; email?: string | null; companyId?: number | null };
  companyId: number;
  hasActiveMembership?: boolean;
}) {
  return (
    isSuperMaster(input.user, env.superMasterEmail) ||
    input.user.companyId === input.companyId ||
    input.hasActiveMembership === true
  );
}

async function hasCompanyAccess(
  user: { id?: number; role?: string | null; email?: string | null; companyId?: number | null },
  companyId: number,
) {
  if (canAccessCompany({ user, companyId })) return true;
  if (!user.id) return false;

  const membership = await findMembership(user.id, companyId);
  return canAccessCompany({ user, companyId, hasActiveMembership: !!membership });
}

export const companyRouter = createRouter({
  storefront: publicQuery
    .input(
      z
        .object({
          slug: z.string().optional(),
          id: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return resolvePublicStorefront(input);
    }),

  default: publicQuery.query(async () => {
    return ensureDefaultBusiness();
  }),

  list: ownerQuery
    .input(
      z
        .object({
          type: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      if (input?.type) {
        return findCompaniesByType(input.type);
      }
      return findAllCompanies();
    }),

  byId: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const company = await findCompanyById(input.id);
      if (!company) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Company not found.",
        });
      }
      if (!(await hasCompanyAccess(ctx.user, company.id))) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this company.",
        });
      }
      return company;
    }),

  bySlug: authedQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await findCompanyBySlug(input.slug);
      if (!company) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Company not found.",
        });
      }
      if (!(await hasCompanyAccess(ctx.user, company.id))) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this company.",
        });
      }
      return company;
    }),

  search: ownerQuery
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      return searchCompanies(input.query);
    }),
});
