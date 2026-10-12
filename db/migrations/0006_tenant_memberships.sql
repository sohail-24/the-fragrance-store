DO $$ BEGIN
  CREATE TYPE "tenant_membership_role" AS ENUM('owner', 'admin', 'staff');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "tenant_memberships" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "userId" bigint NOT NULL,
  "companyId" bigint NOT NULL,
  "role" "tenant_membership_role" DEFAULT 'owner' NOT NULL,
  "isActive" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_membership_user_company_idx" ON "tenant_memberships" ("userId", "companyId");
CREATE INDEX IF NOT EXISTS "tenant_membership_user_idx" ON "tenant_memberships" ("userId");
CREATE INDEX IF NOT EXISTS "tenant_membership_company_idx" ON "tenant_memberships" ("companyId");
