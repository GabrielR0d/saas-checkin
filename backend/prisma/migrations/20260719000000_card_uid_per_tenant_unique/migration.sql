-- Card.uid was globally unique, but in a multi-tenant system the same physical
-- RFID card UID can legitimately exist in different tenants' databases.
-- Replace the global unique constraint with a per-tenant unique constraint.

-- Drop old global unique index
DROP INDEX IF EXISTS "Card_uid_key";

-- Drop the (tenantId, uid) regular index — it becomes redundant once we
-- create the unique constraint below (Postgres creates an index for it).
DROP INDEX IF EXISTS "Card_tenantId_uid_idx";

-- Create new per-tenant unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "Card_tenantId_uid_key"
  ON "Card"("tenantId", "uid");
