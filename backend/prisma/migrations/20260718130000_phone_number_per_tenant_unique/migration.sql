-- Change phoneNumber from globally unique to per-tenant unique.
-- A person can now be a client of two different tenants (gyms/orgs)
-- with the same WhatsApp number — each tenant manages their own list.

-- Drop the old global unique index on phoneNumber
DROP INDEX IF EXISTS "Client_phoneNumber_key";

-- Create a composite unique constraint: (tenantId, phoneNumber)
-- NULL values are excluded from unique checks in Postgres, so clients
-- without a phoneNumber don't conflict with each other.
CREATE UNIQUE INDEX IF NOT EXISTS "Client_tenantId_phoneNumber_key"
  ON "Client"("tenantId", "phoneNumber")
  WHERE "phoneNumber" IS NOT NULL;
